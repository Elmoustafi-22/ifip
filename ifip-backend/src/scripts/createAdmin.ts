import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import { User } from '../models/User.js';

class SeedError extends Error {}

async function run() {
    const config = parse(readFileSync('.env'));
    const email = config.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    const password = config.ADMIN_SEED_PASSWORD;
    const uri = config.MONGO_URI;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password ||
        password.length < 16 || Buffer.byteLength(password) > 72 || !uri) {
        throw new SeedError('Set MONGO_URI, ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in the backend .env. Use a password of 16 or more characters and at most 72 bytes.');
    }

    const authority = uri.match(/^mongodb:\/\/([^/?]+)/)?.[1]?.split('@').at(-1);
    const local = authority?.split(',').every(host => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host));
    if (!local && !process.argv.includes('--allow-non-loopback')) {
        throw new SeedError('The database is not on loopback. Confirm the target before running the admin seed.');
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    const existing = await User.findOne({ email });
    if (existing && existing.role !== 'admin' && existing.role !== 'superadmin') {
        throw new SeedError('This email already belongs to a non-admin account. Confirm the intended role change separately.');
    }

    if (!existing) {
        await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', emailVerified: true });
        console.log('Admin account created. First sign-in requires authenticator enrollment.');
        return;
    }

    const passwordMatches = await existing.comparePassword(password);
    if (passwordMatches && existing.emailVerified) {
        console.log('Existing administrator matches the seed credentials.');
        return;
    }
    if (existing.passwordHash && !passwordMatches && !process.argv.includes('--update-existing-password')) {
        throw new SeedError('This administrator already has a different password. Confirm the reset before updating it.');
    }

    const changes = passwordMatches
        ? { $set: { emailVerified: true } }
        : {
            $set: { passwordHash: await bcrypt.hash(password, 12), emailVerified: true },
            $unset: { adminMfaChallenge: 1 },
        };
    const updated = await User.updateOne(
        { _id: existing._id, role: existing.role, passwordHash: existing.passwordHash ?? null },
        changes,
    );
    if (!updated.modifiedCount) throw new SeedError('The account changed during seeding. Verify its current details before retrying.');
    console.log('Existing administrator updated. Its role and authenticator enrollment were preserved.');
}

run().catch(error => {
    // Database driver errors may contain connection details.
    const message = error instanceof SeedError
        ? error.message
        : 'Admin seed failed. Check database connectivity and access.';
    console.error(message);
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
