/**
 * One-time migration: Remove TTL index & clear expiresAt from all applicants.
 *
 * Run once after deploying the no-purge changes:
 *   npx ts-node --esm src/scripts/dropExpiresAtIndex.ts
 *
 * The script is idempotent — safe to run multiple times.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function run() {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const col = mongoose.connection.collection('applicants');

    // 1. Drop the TTL index (if it still exists).
    try {
        await col.dropIndex('expiresAt_1');
        console.log('Dropped TTL index "expiresAt_1".');
    } catch (err: any) {
        if (err?.codeName === 'IndexNotFound' || err?.code === 27) {
            console.log('TTL index "expiresAt_1" not found — already dropped or never existed.');
        } else {
            throw err;
        }
    }

    // 2. Unset expiresAt on all existing applicant documents.
    const result = await col.updateMany(
        { expiresAt: { $exists: true } },
        { $unset: { expiresAt: '' } }
    );
    console.log(`Cleared expiresAt from ${result.modifiedCount} applicant document(s).`);

    await mongoose.disconnect();
    console.log('Done. Disconnected from MongoDB.');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
