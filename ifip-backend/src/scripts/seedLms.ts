import mongoose from 'mongoose';
import { Module } from '../models/Module.js';
import { env } from '../config/env.js';

const modulesData = [
    {
        title: '1. Foundations of Islamic Economics',
        description: 'Explore the philosophical foundations of Islamic finance, wealth circulation, and comparison with conventional economic paradigms.',
        order: 1,
        contentType: 'video' as const,
        contentUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        estimatedDuration: 45
    },
    {
        title: '2. Shariah Contracts & Structuring',
        description: 'Deep dive into fundamental contracts: Murabahah, Mudarabah, Musharakah, and Ijarah structuring, and shariah audit guidelines.',
        order: 2,
        contentType: 'text' as const,
        body: `### Core Shariah Contracts

Welcome to Module 2. Shariah contracts form the legal and ethical framework of all Islamic financial transactions. Unlike conventional banking which relies on interest-bearing loan agreements, Islamic finance utilizes real asset-backed partnerships and trade contracts.

#### Key Types of Contracts:
1. **Murabahah (Cost-Plus Sale)**: A contract where the seller explicitly declares their cost price and profit margin to the buyer. Commonly used for property and asset financing.
2. **Mudarabah (Trust Financing)**: A partnership where one party provides the capital (Rab-ul-Mal) and the other provides the expertise/labor (Mudarib). Profits are shared according to a pre-agreed ratio, while financial losses are borne solely by the capital provider.
3. **Musharakah (Joint Venture)**: A partnership where all parties contribute both capital and labor. Profits are shared according to agreements, and losses are shared strictly in proportion to capital contributions.
4. **Ijarah (Lease/Usufruct)**: A contract where the bank purchases an asset and leases its usufruct to the client for a specific period and rental fee.

In the next sections, we will explore the Shariah audibility criteria and contract termination guidelines.`,
        estimatedDuration: 60
    },
    {
        title: '3. Islamic Banking Operations',
        description: 'Analyze deposit-taking, investment account management, Shariah governance structures, and regulatory compliance standards.',
        order: 3,
        contentType: 'quiz' as const,
        body: 'This module is an interactive quiz evaluation on Islamic banking parameters and regulatory setups.',
        estimatedDuration: 30
    }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected.');

        console.log('Clearing existing modules...');
        await Module.deleteMany({});
        console.log('Cleared.');

        console.log('Inserting default coursework modules...');
        await Module.insertMany(modulesData);
        console.log('Modules seeded successfully!');
    } catch (err: any) {
        console.error('Seeding failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

seed();
