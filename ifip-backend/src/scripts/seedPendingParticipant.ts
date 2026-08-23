import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { env } from '../config/env.js';

const email = 'elmoustafi97@gmail.com';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);

        console.log(`Seeding/resetting pending participant account for ${email}...`);
        
        await User.updateOne(
            { email },
            {
                $set: {
                    email,
                    role: 'participant',
                    emailVerified: true,
                    fullName: 'Mustopha Elmoustafi',
                    country: 'Canada',
                    stateCity: 'Toronto',
                    phone: '+1 (555) 019-2831',
                },
                $unset: {
                    passwordHash: '',
                },
            },
            { upsert: true }
        );

        const createdUser = await User.findOne({ email });
        if (createdUser) {
            const existingApp = await Application.findOne({ userId: createdUser._id });
            if (!existingApp) {
                await Application.create({
                    userId: createdUser._id,
                    paymentId: new mongoose.Types.ObjectId(),
                    fullName: createdUser.fullName,
                    country: createdUser.country,
                    stateCity: createdUser.stateCity,
                    phone: createdUser.phone,
                    status: 'active',
                    submittedAt: new Date(),
                });
            } else {
                existingApp.status = 'active';
                existingApp.fullName = createdUser.fullName;
                await existingApp.save();
            }
        }

        console.log('Successfully reseeded pending participant account & application!');
        console.log('---');
        console.log('User ID:', createdUser?._id);
        console.log('Email:', createdUser?.email);
        console.log('Role:', createdUser?.role);
        console.log('Password Hash Present?:', Boolean(createdUser?.passwordHash));
        console.log('---');
    } catch (err: any) {
        console.error('Error seeding participant:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

run();
