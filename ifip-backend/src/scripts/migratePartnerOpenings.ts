import mongoose from 'mongoose';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { JobOpening } from '../models/JobOpening.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

/**
 * One-time migration script.
 * Converts existing PartnerOrganization.openings (embedded subdocuments)
 * into standalone JobOpening records with status 'pending_review'.
 *
 * Safe to re-run: skips openings that have already been migrated
 * (matched by migratedFromOpeningId).
 *
 * Run: npx ts-node src/scripts/migratePartnerOpenings.ts
 */
const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);

        const orgs = await PartnerOrganization.find({
            openings: { $exists: true, $not: { $size: 0 } },
        });

        console.log(`Found ${orgs.length} partner organisation(s) with openings.`);

        let migrated = 0;
        let skipped = 0;

        for (const org of orgs) {
            // Find partner user linked to this org (if any)
            const partnerUser = await User.findOne({ orgId: org._id, role: 'partner' });

            for (const opening of org.openings as any[]) {
                const openingId = opening._id?.toString();
                if (!openingId) {
                    skipped++;
                    continue;
                }

                // Check if already migrated
                const existing = await JobOpening.findOne({ migratedFromOpeningId: openingId });
                if (existing) {
                    skipped++;
                    continue;
                }

                await JobOpening.create({
                    partnerOrgId: org._id,
                    createdByUserId: partnerUser?._id || undefined,
                    title: opening.role || 'Untitled Opening',
                    description: '',
                    workMode: opening.mode || 'Remote',
                    location: opening.location || '',
                    slots: opening.count || 1,
                    requirements: [],
                    adminRequirements: [],
                    status: 'pending_review',
                    migratedFromOpeningId: openingId,
                });

                migrated++;
            }
        }

        console.log('---');
        console.log(`Migration complete.`);
        console.log(`  Migrated: ${migrated}`);
        console.log(`  Skipped (already migrated or no ID): ${skipped}`);
        console.log('---');
        console.log('You can now review these openings in the Admin > Job Openings page.');
    } catch (err: any) {
        console.error('Migration error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

run();
