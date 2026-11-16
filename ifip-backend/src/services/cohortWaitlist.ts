import cron from 'node-cron';
import { Types } from 'mongoose';
import { CohortWaitlistDelivery } from '../models/CohortWaitlistDelivery.js';
import { Waitlist } from '../models/Waitlist.js';
import { Cohort, type ICohort } from '../models/Cohort.js';
import { checkCohortCapacity, getActiveRegistrationCohort } from '../controllers/paymentController.js';
import { sendCohortAvailabilityEmail } from './emailService.js';

export const beforeCohortRegistration = (cohort: Pick<ICohort, 'registrationStartDate' | 'createdAt'>) => ({
    createdAt: { $lt: cohort.registrationStartDate ?? cohort.createdAt },
});

type DeliveryTotals = Map<string, { accepted: number; failed: number }>;

export const processCohortWaitlist = async () => {
    const totals: DeliveryTotals = new Map();
    try {
        await processWaitlistDeliveries(totals);
    } finally {
        for (const [cohortId, counts] of totals) {
            console.info(`[Cohort waitlist] cohort=${cohortId} accepted=${counts.accepted} failed=${counts.failed}`);
        }
    }
};

async function processWaitlistDeliveries(totals: DeliveryTotals) {
    const queued = await CohortWaitlistDelivery.find({ status: 'queued' }).sort({ createdAt: 1 }).limit(100).lean();
    for (const delivery of queued) {
        const [cohort, recipient] = await Promise.all([
            Cohort.findById(delivery.cohortId).lean(),
            Waitlist.findById(delivery.waitlistId).lean(),
        ]);
        if (!cohort || !recipient) {
            await CohortWaitlistDelivery.deleteOne({ _id: delivery._id, status: 'queued' });
            continue;
        }
        await deliverCohortAnnouncement(cohort, recipient, totals, true);
    }

    const active = await getActiveRegistrationCohort();
    if (!active?.notifyWaitlist || (await checkCohortCapacity(active._id)).isFull) return;

    const attempted = await CohortWaitlistDelivery.find({ cohortId: active._id }).distinct('waitlistId');
    const recipients = await Waitlist.find({ ...beforeCohortRegistration(active), _id: { $nin: attempted } })
        .sort({ createdAt: 1 }).limit(100);

    for (const recipient of recipients) {
        if (Date.now() > active.registrationEndDate.getTime()) break;
        await deliverCohortAnnouncement(active, recipient, totals);
    }
}

async function deliverCohortAnnouncement(
    cohort: { _id: Types.ObjectId; name: string; registrationStartDate: Date; registrationEndDate: Date; startDate?: Date | null },
    recipient: { _id: Types.ObjectId; email: string },
    totals: DeliveryTotals,
    queued = false,
) {
    const id = `${cohort._id}:${recipient._id}`;
    if (queued) {
        const claim = await CohortWaitlistDelivery.updateOne({ _id: id, status: 'queued' }, { $set: { status: 'sending' } });
        if (!claim.modifiedCount) return;
    } else {
        try {
            await CohortWaitlistDelivery.create({ _id: id, cohortId: cohort._id, waitlistId: recipient._id, status: 'sending' });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) return;
            throw error;
        }
    }

    let status = 'sent';
    try {
        await sendCohortAvailabilityEmail(recipient.email, cohort.name, cohort.registrationStartDate, cohort.registrationEndDate, cohort.startDate);
    } catch {
        status = 'failed';
    }
    await CohortWaitlistDelivery.updateOne({ _id: id }, { $set: { status } });
    const cohortId = String(cohort._id);
    const counts = totals.get(cohortId) ?? { accepted: 0, failed: 0 };
    counts[status === 'sent' ? 'accepted' : 'failed']++;
    totals.set(cohortId, counts);
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

export const queueCohortWaitlistResend = async (cohort: ICohort, includeSent: boolean) => {
    const recipientIds = await Waitlist.distinct('_id', beforeCohortRegistration(cohort));
    const retryable = includeSent ? ['failed', 'sent'] as const : ['failed'] as const;
    let queued = 0;
    for (const waitlistId of recipientIds) {
        try {
            const result = await CohortWaitlistDelivery.updateOne(
                { _id: `${cohort._id}:${waitlistId}`, status: { $in: retryable } },
                { $set: { status: 'queued' }, $setOnInsert: { cohortId: cohort._id, waitlistId } },
                { upsert: true },
            );
            queued += result.modifiedCount + result.upsertedCount;
        } catch (error) {
            // Another request queued the recipient, or delivery already started or succeeded.
            if ((error as { code?: number }).code !== 11000) throw error;
        }
    }
    return queued;
};
