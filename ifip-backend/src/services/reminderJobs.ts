import { ReminderJob, type ReminderPayload, type ReminderOutcome } from '../models/ReminderJob.js';

type DeliverBatch = (payload: ReminderPayload, sentBy: string) => Promise<ReminderOutcome[]>;

// MongoDB stores queue and progress. Atomic claims support multiple API instances.
// An interrupted send is never automatically replayed: provider acceptance may be unknown.
export async function processNextReminderJob(deliver: DeliverBatch) {
    const stale = new Date(Date.now() - 5 * 60_000);
    await ReminderJob.updateMany({ status: 'processing', heartbeatAt: { $lt: stale } }, { $set: { status: 'interrupted' } });
    await ReminderJob.updateMany({ status: 'queued', createdAt: { $lt: new Date(Date.now() - 60 * 60_000) } }, { $set: { status: 'interrupted' } });
    const job = await ReminderJob.findOneAndUpdate({ status: 'queued' }, { $set: { status: 'processing', heartbeatAt: new Date() } }, { new: true, sort: { createdAt: 1 } });
    if (!job) return false;
    const claim = { _id: job._id, status: 'processing' as const };
    const heartbeat = setInterval(() => {
        void ReminderJob.updateOne(claim, { $set: { heartbeatAt: new Date() } }).catch(() => {
            console.error(`[ReminderJob] heartbeat failed job=${job._id}`);
        });
    }, 15_000);
    try {
        const payload = job.payload as ReminderPayload;
        for (let i = 0; i < payload.applicantIds.length; i += 5) {
            if (!await ReminderJob.exists(claim)) return true;
            const outcomes = await deliver({ ...payload, applicantIds: payload.applicantIds.slice(i, i + 5) }, job.owner);
            const updated = await ReminderJob.updateOne(claim, { $push: { results: { $each: outcomes } }, $set: { heartbeatAt: new Date() } });
            if (!updated.matchedCount) return true;
        }
        await ReminderJob.updateOne(claim, { $set: { status: 'completed' } });
        console.info(`[ReminderJob] completed job=${job._id} recipients=${payload.applicantIds.length}`);
    } catch {
        await ReminderJob.updateOne(claim, { $set: { status: 'interrupted' } });
        console.error(`[ReminderJob] interrupted job=${job._id}`);
    } finally { clearInterval(heartbeat); }
    return true;
}

export function startReminderWorker(deliver: DeliverBatch) {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await processNextReminderJob(deliver); }
        catch { console.error('[ReminderJob] queue unavailable'); }
        finally { running = false; }
    };
    const timer = setInterval(() => void tick(), 2000);
    timer.unref();
    void tick();
    return () => clearInterval(timer);
}
