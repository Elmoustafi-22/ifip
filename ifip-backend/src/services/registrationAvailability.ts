import { Types, type ClientSession } from 'mongoose';
import { Cohort } from '../models/Cohort.js';
import { Application } from '../models/Application.js';
import { Applicant } from '../models/Applicants.js';

export const getActiveRegistrationCohort = async (session: ClientSession | null = null) => {
    const currentDate = new Date();
    const cohort = await Cohort.findOne({
        registrationStartDate: { $lte: currentDate },
        registrationEndDate: { $gte: currentDate },
        status: 'upcoming'
    }).session(session);
    return cohort;
};

export const checkCohortCapacity = async (cohortId: Types.ObjectId | string, excludeApplicantId?: string, session: ClientSession | null = null): Promise<{ isFull: boolean; count: number; cap: number }> => {
    const cohort = await Cohort.findById(cohortId).session(session);
    if (!cohort) {
        return { isFull: true, count: 0, cap: 0 };
    }

    const applicationsCount = await Application.countDocuments({
        cohortId: new Types.ObjectId(cohortId as string),
        status: { $in: ['payment_confirmed', 'active', 'completed', 'placement_ready'] }
    }).session(session);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const filter: any = {
        cohortId: new Types.ObjectId(cohortId as string),
        $or: [
            { isPaid: true },
            { transferHoldUntil: { $gt: new Date() } },
            { 
                isPaid: false, 
                checkoutStartedAt: { $gte: fifteenMinutesAgo } 
            }
        ]
    };
    if (excludeApplicantId) {
        filter._id = { $ne: new Types.ObjectId(excludeApplicantId) };
    }

    const lockedApplicantsCount = await Applicant.countDocuments(filter).session(session);
    const totalOccupied = applicationsCount + lockedApplicantsCount;

    return {
        isFull: totalOccupied >= cohort.cohortCap,
        count: totalOccupied,
        cap: cohort.cohortCap
    };
};

