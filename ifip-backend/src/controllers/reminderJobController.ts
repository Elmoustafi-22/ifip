import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { ReminderJob, reminderJobResponse, type ReminderPayload } from '../models/ReminderJob.js';
import { logAction } from '../utils/auditLogger.js';

const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);

export async function createReminderJob(req: Request, res: Response) {
    const { requestId, applicantIds, cohortId, subject, message, includeResumeLink = true } = req.body ?? {};
    if (!req.user) { res.sendStatus(401); return; }
    if (!validId(requestId) || !Array.isArray(applicantIds) || !applicantIds.length || applicantIds.length > 1000 ||
        applicantIds.some(id => typeof id !== 'string' || !Types.ObjectId.isValid(id)) ||
        (cohortId !== undefined && (typeof cohortId !== 'string' || (cohortId && cohortId !== 'unassigned' && !Types.ObjectId.isValid(cohortId)))) ||
        (subject !== undefined && (typeof subject !== 'string' || subject.length > 500)) ||
        (message !== undefined && (typeof message !== 'string' || message.length > 50000)) || typeof includeResumeLink !== 'boolean') {
        res.status(400).json({ message: 'Check the selected applicants, cohort and email content.' }); return;
    }
    const payload: ReminderPayload = { applicantIds: [...new Set<string>(applicantIds.map(id => new Types.ObjectId(id).toHexString()))].sort(),
        cohortId: cohortId || undefined, subject, message, includeResumeLink };
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    let job;
    try {
        job = await ReminderJob.create({ _id: requestId, owner: req.user.id, payloadHash, payload });
        void logAction(req, 'PENDING_REMINDERS_QUEUED', `Queued ${payload.applicantIds.length} reminders; job ${requestId}`, { targetType: 'Applicant' });
    } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        job = await ReminderJob.findOne({ _id: requestId, owner: req.user.id });
        if (!job || job.payloadHash !== payloadHash) {
            res.status(409).json({ message: 'This send request already exists with different content. Check its status.' }); return;
        }
    }
    res.status(202).json(reminderJobResponse(job));
}

export async function getReminderJob(req: Request, res: Response) {
    if (!req.user) { res.sendStatus(401); return; }
    if (!validId(req.params.jobId)) { res.sendStatus(400); return; }
    const job = await ReminderJob.findOne({ _id: req.params.jobId, owner: req.user.id });
    if (!job) { res.status(404).json({ message: 'No saved send request was found. Records are kept for seven days.' }); return; }
    res.json(reminderJobResponse(job));
}
