import cron from 'node-cron';
import { Types } from 'mongoose';
import { CohortWaitlistDelivery } from '../models/CohortWaitlistDelivery.js';
import { Waitlist } from '../models/Waitlist.js';
import { checkCohortCapacity, getActiveRegistrationCohort } from '../controllers/paymentController.js';
import { sendCohortAvailabilityEmail } from './emailService.js';

export const processCohortWaitlist = async () => {
    const active = await getActiveRegistrationCohort();
    if (!active?.notifyWaitlist || (await checkCohortCapacity(active._id)).isFull) return;

    const attempted = await CohortWaitlistDelivery.find({ cohortId: active._id }).distinct('waitlistId');
    const recipients = await Waitlist.find({ createdAt: { $lt: active.createdAt }, _id: { $nin: attempted } })
        .sort({ createdAt: 1 }).limit(100);

    for (const recipient of recipients) {
        if (Date.now() > active.registrationEndDate.getTime()) break;
        await deliverCohortAnnouncement(active, recipient);
    }
};

async function deliverCohortAnnouncement(
    cohort: { _id: Types.ObjectId; name: string; registrationStartDate: Date; registrationEndDate: Date; startDate?: Date | null },
    recipient: { _id: Types.ObjectId; email: string },
) {
    const id = `${cohort._id}:${recipient._id}`;
    try {
        await CohortWaitlistDelivery.create({ _id: id, cohortId: cohort._id, waitlistId: recipient._id, status: 'sending' });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) return;
        throw error;
    }

    let status = 'sent';
    try {
        await sendCohortAvailabilityEmail(recipient.email, cohort.name, cohort.registrationStartDate, cohort.registrationEndDate, cohort.startDate);
    } catch {
        status = 'failed';
    }
    await CohortWaitlistDelivery.updateOne({ _id: id }, { $set: { status } });
}

export const startCohortWaitlistCron = () => {
    cron.schedule('* * * * *', async () => {
        try {
            await processCohortWaitlist();
        } catch {
            console.error('[Cohort waitlist] Delivery processing failed');
        }
    }, { noOverlap: true });
};

export const retryCohortWaitlist = async (cohortId: string) => {
    const active = await getActiveRegistrationCohort();
    if (!active?.notifyWaitlist || String(active._id) !== cohortId || (await checkCohortCapacity(active._id)).isFull) return false;
    await CohortWaitlistDelivery.deleteMany({ cohortId, status: 'failed' });
    return true;
};

/**
 * Force-resend the cohort availability announcement to all previous-waitlist
 * emails for any cohort (not restricted to the currently active one).
 * Clears all existing delivery records then immediately delivers to all eligible
 * addresses (created before this cohort) in the background.
 */
export const forceResendCohortWaitlist = async (cohortId: string): Promise<{ queued: number }> => {
    const { Cohort } = await import('../models/Cohort.js');
    const cohort = await Cohort.findById(cohortId).lean();
    if (!cohort) return { queued: 0 };

    // Clear previous delivery attempts so we start fresh
    await CohortWaitlistDelivery.deleteMany({ cohortId });

    // Flag cohort so status endpoint reports correctly
    await Cohort.updateOne({ _id: cohortId }, { $set: { notifyWaitlist: true } });

    // Fetch all eligible waitlist addresses (joined before this cohort was created)
    const recipients = await Waitlist.find({ createdAt: { $lt: cohort.createdAt } })
        .sort({ createdAt: 1 });

    // Deliver in background so the HTTP response returns quickly
    void (async () => {
        for (const recipient of recipients) {
            await deliverCohortAnnouncement(cohort as any, recipient);
        }
    })();

    return { queued: recipients.length };
};
