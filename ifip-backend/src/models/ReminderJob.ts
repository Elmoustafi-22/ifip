import { Schema, model } from 'mongoose';

export type ReminderOutcome = { applicantId: string; status: 'accepted' | 'failed' | 'skipped'; reason?: string };
export interface ReminderPayload {
    applicantIds: string[];
    cohortId?: string;
    subject?: string;
    message?: string;
    includeResumeLink: boolean;
}

const schema = new Schema({
    // Caller-generated UUID makes a lost enqueue response safe to recover.
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    payloadHash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'interrupted'], default: 'queued' },
    results: { type: [Schema.Types.Mixed], default: [] },
    heartbeatAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: 604800 },
});
schema.index({ status: 1, createdAt: 1 });
export const ReminderJob = model('ReminderJob', schema);

export function reminderJobResponse(job: { _id: string; status: string; payload: ReminderPayload; results: ReminderOutcome[] }) {
    const sentCount = job.results.filter(item => item.status === 'accepted').length;
    const failCount = job.results.filter(item => item.status === 'failed').length;
    const skippedCount = job.results.filter(item => item.status === 'skipped').length;
    return { jobId: job._id, status: job.status, total: job.payload.applicantIds.length,
        sentCount, failCount, skippedCount, results: job.results,
        message: `${sentCount} accepted by provider · ${failCount} failed · ${skippedCount} skipped` };
}
