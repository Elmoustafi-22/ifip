import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

const email = 'admin@ifip.com';
const password = 'AdminPassword123!';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        
        console.log('Checking for existing admin...');
        const existing = await User.findOne({ email });
        if (existing) {
            console.log('Admin user already exists. Updating role & password...');
            existing.passwordHash = await bcrypt.hash(password, 10);
            existing.role = 'superadmin';
            existing.emailVerified = true;
            await existing.save();
            console.log('Admin credentials updated successfully!');
            return;
        }

        console.log('Creating new admin user...');
        const passwordHash = await bcrypt.hash(password, 10);
        const admin = new User({
            email,
            passwordHash,
            role: 'superadmin',
            emailVerified: true
        });
        await admin.save();
        console.log('Admin account created successfully!');
        console.log('---');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('---');
    } catch (err: any) {
        console.error('Error creating admin:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

run();
