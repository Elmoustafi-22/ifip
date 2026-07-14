/**
 * Seed Script — Form Options
 * Run once to populate the DB with current hardcoded option arrays.
 * Safe to re-run (upserts only, never deletes existing data).
 *
 * Usage:
 *   npx ts-node --esm src/scripts/seedFormOptions.ts
 */

import mongoose from 'mongoose';
import { FormOption, FormOptionGroup } from '../models/FormOption.js';
import { env } from '../config/env.js';

const PLACEMENT_INTERESTS = [
    "Islamic Banking Operations",
    "Islamic Finance Advisory",
    "Shariah Advisory Support",
    "Investment & Wealth Management",
    "Risk Management (Takaful)",
    "Compliance & Governance",
    "Capital Markets (Sukuk & Structured Finance)",
    "Financial Analysis",
    "Research & Policy Development",
    "Fintech / Islamic Fintech Operations",
    "Venture Building / Startups",
    "Business Development",
    "Product Development",
    "Customer Experience & Relations",
    "Marketing & Growth Strategy",
    "Digital Marketing",
    "Content Creation & Media",
    "Graphic Design",
    "UI/UX Design",
    "Video Editing & Creative Production",
    "Technical Writing & Documentation",
    "Data Analysis",
    "Project Management",
    "Community & Program Management",
    "Administrative & Operations Support",
    "Other (Specify)",
];

const ACADEMIC_STATUS = [
    "University Student",
    "Penultimate Year Student",
    "Final Year Student",
    "Recent Graduate",
    "NYSC Participant",
    "Early-Career Professional",
];

const SECTOR_TAGS = [
    "Islamic Banking",
    "Takaful (Islamic Insurance)",
    "Sukuk & Capital Markets",
    "Islamic Asset Management",
    "Waqf & Endowments",
    "Zakat & Philanthropy",
    "Islamic FinTech",
    "Shariah Advisory & Consulting",
    "Halal Finance",
    "Accounting & Audit",
    "Law & Compliance",
    "Other",
];

const toValue = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

async function seed() {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const groups: { group: FormOptionGroup; labels: string[] }[] = [
        { group: 'placement_interests', labels: PLACEMENT_INTERESTS },
        { group: 'academic_status',     labels: ACADEMIC_STATUS },
        { group: 'sector_tags',         labels: SECTOR_TAGS },
    ];

    for (const { group, labels } of groups) {
        console.log(`\n⏳ Seeding group: ${group}`);
        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            const value = toValue(label);
            await FormOption.findOneAndUpdate(
                { group, value },
                { $setOnInsert: { group, label, value, order: i, isActive: true } },
                { upsert: true, new: true }
            );
            console.log(`   [${i + 1}] ${label}`);
        }
        console.log(`✅ Done: ${group} (${labels.length} options)`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 Seed complete. Disconnected from MongoDB.');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
