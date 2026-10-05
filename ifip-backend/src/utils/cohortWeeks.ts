import { Types } from 'mongoose';
import { Cohort } from '../models/Cohort.js';
import { Module } from '../models/Module.js';
import { ProgrammeSession } from '../models/ProgrammeSession.js';

export const DEFAULT_TOTAL_WEEKS = 4;
export const MAX_TOTAL_WEEKS = 52;

/**
 * Validates that a week number falls within the programme length of the given cohort.
 * Global (cohort-less) items are only bounded by MAX_TOTAL_WEEKS.
 * Returns an error message, or null when valid.
 */
export const validateWeekForCohort = async (
    cohortId: string | Types.ObjectId | null | undefined,
    weekNumber: number | undefined
): Promise<string | null> => {
    if (weekNumber === undefined || weekNumber === null) return null;
    const week = Number(weekNumber);
    if (!Number.isInteger(week) || week < 1) {
        return 'weekNumber must be a positive whole number.';
    }

    if (!cohortId) {
        return week > MAX_TOTAL_WEEKS ? `weekNumber cannot exceed ${MAX_TOTAL_WEEKS}.` : null;
    }

    const cohort = await Cohort.findById(cohortId).select('totalWeeks name');
    if (!cohort) return null; // Unknown cohort is handled elsewhere
    const total = cohort.totalWeeks || DEFAULT_TOTAL_WEEKS;
    if (week > total) {
        return `Week ${week} is outside "${cohort.name}" (programme has ${total} weeks). Add a week to the cohort first.`;
    }
    return null;
};

/**
 * Counts sessions and modules belonging to a cohort that sit beyond the given week.
 * Used to block shrinking a cohort's programme length when the removed weeks are not empty.
 */
export const countContentBeyondWeek = async (
    cohortId: string | Types.ObjectId,
    week: number
): Promise<{ sessions: number; modules: number }> => {
    const cohortObjId = new Types.ObjectId(cohortId.toString());
    const [sessions, modules] = await Promise.all([
        ProgrammeSession.countDocuments({ cohortId: cohortObjId, weekNumber: { $gt: week } }),
        Module.countDocuments({ cohortId: cohortObjId, weekNumber: { $gt: week } }),
    ]);
    return { sessions, modules };
};
