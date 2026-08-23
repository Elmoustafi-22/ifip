/**
 * check-db.ts — Quick diagnostic: shows CohortConfig, Application count, and seeded Applicants
 * Run: npx tsx src/scripts/check-db.ts
 */
import mongoose from 'mongoose';
import { CohortConfig } from '../models/CohortConfig.js';
import { Cohort } from '../models/Cohort.js';
import { Application } from '../models/Application.js';
import { Applicant } from '../models/Applicants.js';
import { env } from '../config/env.js';

const run = async () => {
    await mongoose.connect(env.MONGO_URI);
    console.log('\n🔍 DATABASE DIAGNOSTIC\n' + '─'.repeat(50));

    // CohortConfig (what the apply page uses for cap)
    const config = await CohortConfig.findOne();
    console.log('\n📌 CohortConfig (cap source for apply page):');
    if (config) {
        console.log(`   cohortCap:   ${config.cohortCap}`);
        console.log(`   startDate:   ${config.cohortStartDate}`);
        console.log(`   dashboard:   ${config.dashboardViewOverride}`);
    } else {
        console.log('   ⚠️  No CohortConfig found — using env COHORT_CAP:', process.env.COHORT_CAP);
    }

    // Application count (what triggers "full" message)
    const appCount = await Application.countDocuments({ status: { $ne: 'withdrawn' } });
    const totalApps = await Application.countDocuments();
    console.log('\n📌 Application Documents:');
    console.log(`   Active (non-withdrawn): ${appCount}`);
    console.log(`   Total:                  ${totalApps}`);

    // Cohorts
    const cohorts = await Cohort.find().sort({ createdAt: -1 });
    console.log('\n📌 Cohort Documents:');
    if (cohorts.length === 0) {
        console.log('   None');
    } else {
        cohorts.forEach(c => {
            console.log(`   [${c.status}] "${c.name}"  cap=${c.cohortCap}  start=${c.startDate.toDateString()}`);
        });
    }

    // Seeded Applicants
    const applicants = await Applicant.find(
        { email: { $in: [
            'amina.bello@example.com',
            'ibrahim.hassan@example.com',
            'fatima.yusuf@example.com',
            'chukwuemeka.okafor@example.com',
            'abena.mensah@example.com',
            'umar.suleiman@example.com',
        ] } },
        'email fullName currentStep isPaid cohortId'
    );
    console.log('\n📌 Seeded Applicant Records:');
    if (applicants.length === 0) {
        console.log('   ❌ None found! Seed may not have run correctly.');
    } else {
        applicants.forEach(a => {
            console.log(`   ✅ ${(a.fullName || a.email).padEnd(28)} step=${a.currentStep} paid=${a.isPaid} cohortId=${a.cohortId || 'none'}`);
        });
    }

    console.log('\n' + '─'.repeat(50) + '\n');
    await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
