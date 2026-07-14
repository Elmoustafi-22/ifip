/**
 * Seed Script — Active Openings
 * Run once to populate the DB with current hardcoded vacancy listings.
 * Safe to re-run (upserts only, never deletes existing data).
 *
 * Usage:
 *   npx ts-node --esm src/scripts/seedActiveOpenings.ts
 */

import mongoose from 'mongoose';
import { ActiveOpening, WorkMode } from '../models/ActiveOpening.js';
import { env } from '../config/env.js';

const INITIAL_OPENINGS = [
    { department: "Marketing & Communications", title: "Digital Marketing Intern", workMode: "Hybrid" as WorkMode, location: "Hybrid" },
    { department: "Marketing & Communications", title: "Social Media Manager Intern", workMode: "Hybrid" as WorkMode, location: "Kano" },
    { department: "Marketing & Communications", title: "Community Manager (Full-time)", workMode: "Remote" as WorkMode, location: "Lagos" },
    { department: "Marketing & Communications", title: "Brand Communications Intern", workMode: "Remote" as WorkMode, location: "Remote" },
    { department: "Creative Design", title: "Graphic Design Intern", workMode: "Hybrid" as WorkMode, location: "Kano" },
    { department: "Creative Design", title: "UI/UX Design Support Intern", workMode: "Remote" as WorkMode, location: "Remote" },
    { department: "Creative Design", title: "Visual Content Creator Intern", workMode: "Hybrid" as WorkMode, location: "Hybrid" },
    { department: "Creative Design", title: "Product Design Intern", workMode: "Remote" as WorkMode, location: "Remote" },
    { department: "Fund Management", title: "Investment Research Intern", workMode: "Remote" as WorkMode, location: "Lagos" },
    { department: "Legal & Shariah", title: "Legal and Compliance Intern", workMode: "On-site" as WorkMode, location: "Lagos & Abuja" }
];

async function seed() {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('⏳ Seeding Active Openings...');
    for (let i = 0; i < INITIAL_OPENINGS.length; i++) {
        const item = INITIAL_OPENINGS[i];
        await ActiveOpening.findOneAndUpdate(
            { title: item.title, department: item.department },
            { $setOnInsert: { ...item, order: i, isActive: true } },
            { upsert: true, returnDocument: 'after' }
        );
        console.log(`   [${i + 1}] ${item.title} (${item.department})`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 Seed complete. Disconnected from MongoDB.');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
