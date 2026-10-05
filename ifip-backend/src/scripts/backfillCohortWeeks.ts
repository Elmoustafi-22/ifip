/**
 * backfillCohortWeeks.ts — Sets totalWeeks on existing cohorts.
 *
 * Cohorts created before programme length became configurable have no stored
 * totalWeeks. Mongoose applies the default (4) on read, but this script persists
 * it explicitly. If a cohort already has sessions/modules beyond week 4, its
 * totalWeeks is raised to match so no content is hidden.
 *
 * Run: npx tsx src/scripts/backfillCohortWeeks.ts
 */
import mongoose from 'mongoose';
import { Cohort } from '../models/Cohort.js';
import { Module } from '../models/Module.js';
import { ProgrammeSession } from '../models/ProgrammeSession.js';
import { env } from '../config/env.js';
import { DEFAULT_TOTAL_WEEKS } from '../utils/cohortWeeks.js';

const run = async () => {
    await mongoose.connect(env.MONGO_URI);
    console.log('\n📅 Backfilling cohort programme length...\n');

    const cohorts = await Cohort.find({ totalWeeks: { $exists: false } });
    for (const cohort of cohorts) {
        const [maxSession, maxModule] = await Promise.all([
            ProgrammeSession.findOne({ cohortId: cohort._id }).sort({ weekNumber: -1 }).select('weekNumber'),
            Module.findOne({ cohortId: cohort._id }).sort({ weekNumber: -1 }).select('weekNumber'),
        ]);
        const totalWeeks = Math.max(
            DEFAULT_TOTAL_WEEKS,
            maxSession?.weekNumber || 0,
            maxModule?.weekNumber || 0
        );
        await Cohort.updateOne({ _id: cohort._id }, { $set: { totalWeeks } });
        console.log(`   ✔ "${cohort.name}" → ${totalWeeks} weeks`);
    }

    console.log(`\nDone. Updated ${cohorts.length} cohort(s).\n`);
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
});
