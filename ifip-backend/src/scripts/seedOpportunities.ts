/**
 * Seed Script — Placement Opportunities
 * Run once to populate the DB with current hardcoded opportunity categories & roles.
 * Safe to re-run (upserts only, never deletes existing data).
 *
 * Usage:
 *   npx ts-node --esm src/scripts/seedOpportunities.ts
 */

import mongoose from 'mongoose';
import { PlacementOpportunity } from '../models/PlacementOpportunity.js';
import { env } from '../config/env.js';

const INITIAL_OPPORTUNITIES = [
    {
        category: "Islamic Finance & Investment",
        roles: ["Islamic Finance Analyst", "Investment Research Assistant", "Sukuk Research Intern", "Wealth Management Support Intern"],
        icon: "TbActivity"
    },
    {
        category: "Shariah, Advisory & Legal",
        roles: ["Shariah Advisory Support Intern", "Compliance Support Intern", "Legal & Compliance Intern"],
        icon: "TbScale"
    },
    {
        category: "Business & Strategy",
        roles: ["Business Development Intern", "Strategy Support Intern", "Operations Intern"],
        icon: "TbBriefcase"
    },
    {
        category: "Customer & Client Services",
        roles: ["Customer Support Intern", "Client Relationship Intern"],
        icon: "TbUserCog"
    },
    {
        category: "Marketing & Communications",
        roles: ["Digital Marketing Intern", "Social Media Manager Intern", "Brand Communications Intern"],
        icon: "TbMessage"
    },
    {
        category: "Content & Media",
        roles: ["Content Writer Intern", "Copywriting Intern", "Editorial Assistant Intern"],
        icon: "TbWriting"
    },
    {
        category: "Creative Design",
        roles: ["Graphic Design Intern", "UI/UX Design Support Intern", "Visual Content Creator Intern", "Product Design Intern"],
        icon: "TbSearch"
    },
    {
        category: "Technology & Product",
        roles: ["Fintech Product Support Intern", "Product Research Intern", "Data Support Intern"],
        icon: "TbDeviceLaptop"
    },
    {
        category: "Research & Policy",
        roles: ["Research Assistant Intern", "Policy & Industry Research Intern"],
        icon: "TbSearch"
    },
    {
        category: "Human Capital",
        roles: ["HR Support Intern", "Talent Coordination Intern"],
        icon: "TbUserCog"
    },
    {
        category: "Events & Community",
        roles: ["Event Coordination Intern", "Community Engagement Intern"],
        icon: "TbHeartHandshake"
    }
];

async function seed() {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('⏳ Seeding Placement Opportunities...');
    for (let i = 0; i < INITIAL_OPPORTUNITIES.length; i++) {
        const item = INITIAL_OPPORTUNITIES[i];
        await PlacementOpportunity.findOneAndUpdate(
            { category: item.category },
            { $setOnInsert: { ...item, order: i, isActive: true } },
            { upsert: true, returnDocument: 'after' }
        );
        console.log(`   [${i + 1}] ${item.category} (${item.roles.length} roles)`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 Seed complete. Disconnected from MongoDB.');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
