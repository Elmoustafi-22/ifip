/**
 * fix-cohort.ts — Fixes the active cohort so the apply page works.
 *
 * The registration-status endpoint queries for cohorts with:
 *   status: 'upcoming'  +  registrationStartDate <= now <= registrationEndDate
 *
 * Our seeded cohort had status='active' so it was never found, causing isFull=true.
 * This script resets it to 'upcoming' with a valid registration window.
 *
 * Run: npx tsx src/scripts/fix-cohort.ts
 */
import mongoose from 'mongoose';
import { Cohort } from '../models/Cohort.js';
import { env } from '../config/env.js';

const run = async () => {
    await mongoose.connect(env.MONGO_URI);
    console.log('\n🔧 Fixing cohort registration status...\n');

    const now = new Date();
    const registrationEnd = new Date('2026-12-31T23:59:59.000Z'); // open until end of year
    const registrationStart = new Date('2026-07-01T00:00:00.000Z'); // started July

    const result = await Cohort.findOneAndUpdate(
        { name: 'IFIP Cohort 1 — 2026' },
        {
            $set: {
                status: 'upcoming',         // ← must be 'upcoming' for getActiveRegistrationCohort()
                registrationStartDate: registrationStart,
                registrationEndDate: registrationEnd,
                cohortCap: 100,
            },
        },
        { returnDocument: 'after' }
    );

    if (!result) {
        console.log('❌  Cohort "IFIP Cohort 1 — 2026" not found. Run seed.ts first.');
    } else {
        console.log('✅  Cohort updated:');
        console.log(`   Name:                 ${result.name}`);
        console.log(`   Status:               ${result.status}`);
        console.log(`   Registration Start:   ${result.registrationStartDate.toISOString()}`);
        console.log(`   Registration End:     ${result.registrationEndDate.toISOString()}`);
        console.log(`   Cap:                  ${result.cohortCap}`);
        console.log('\n   ✅  Apply page should no longer show "Cohort Full".');
    }

    await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
