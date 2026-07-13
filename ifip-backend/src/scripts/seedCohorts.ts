import mongoose from 'mongoose';
import { Cohort } from '../models/Cohort.js';
import { env } from '../config/env.js';

const cohortsData = [
    {
        name: 'Batch 2026 Fall-A26',
        startDate: new Date('2026-08-31T00:00:00.000Z'),
        endDate: new Date('2026-11-30T00:00:00.000Z'),
        registrationStartDate: new Date('2026-05-31T00:00:00.000Z'),
        registrationEndDate: new Date('2026-08-30T00:00:00.000Z'),
        cohortCap: 100,
        status: 'upcoming' as const
    },
    {
        name: 'Batch 2026 Spring-S26',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2026-05-30T00:00:00.000Z'),
        registrationStartDate: new Date('2025-11-01T00:00:00.000Z'),
        registrationEndDate: new Date('2026-01-31T00:00:00.000Z'),
        cohortCap: 100,
        status: 'completed' as const
    }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected.');

        console.log('Clearing existing cohorts...');
        await Cohort.deleteMany({});
        console.log('Cleared.');

        console.log('Inserting default cohorts...');
        await Cohort.insertMany(cohortsData);
        console.log('Cohorts seeded successfully!');
    } catch (err: any) {
        console.error('Seeding failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

seed();
