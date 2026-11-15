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
    cohort: { _id: Types.ObjectId; name: string; registrationEndDate: Date; startDate?: Date | null },
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
        await sendCohortAvailabilityEmail(recipient.email, cohort.name, cohort.registrationEndDate, cohort.startDate);
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
