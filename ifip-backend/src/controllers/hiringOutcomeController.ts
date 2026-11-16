import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { hiringStatuses } from '../models/HiringOutcome.js';
import { JobApplication } from '../models/JobApplication.js';
import { Placement } from '../models/Placement.js';
import { logAction } from '../utils/auditLogger.js';

const input = z.object({
    status: z.enum(hiringStatuses),
    note: z.string().trim().min(1).max(500),
    previousRecordedAt: z.iso.datetime().nullable(),
});

export const recordHiringOutcome = async (req: Request, res: Response) => {
    const parsed = input.safeParse(req.body);
    const { kind, id } = req.params;
    if (!parsed.success || typeof id !== 'string' || !Types.ObjectId.isValid(id) || (kind !== 'placements' && kind !== 'job-applications')) {
        res.status(400).json({ message: 'Select an outcome and add a confirmation note of up to 500 characters.' });
        return;
    }

    const { status, note, previousRecordedAt } = parsed.data;
    const hiringOutcome = { status, note, recordedBy: req.user!.id, recordedAt: new Date() };
    const filter = {
        _id: id,
        'hiringOutcome.recordedAt': previousRecordedAt ? new Date(previousRecordedAt) : null,
    };
    const confirmingHire = status === 'hire_confirmed';
    const saved = kind === 'placements'
        ? await Placement.findOneAndUpdate({ ...filter, $or: [
            { status: 'interviewing', $or: [{ interviewScheduledAt: { $lte: new Date() } }, { interviewScheduledAt: null }] },
            { status: { $in: confirmingHire ? ['placed', 'matched', 'interviewing'] : ['placed'] } },
            { 'hiringOutcome.status': { $exists: true } },
        ] }, { $set: { hiringOutcome } }, { returnDocument: 'after', runValidators: true }).select('hiringOutcome.status hiringOutcome.recordedAt')
        : await JobApplication.findOneAndUpdate({ ...filter, $or: [
            { status: { $in: confirmingHire
                ? ['interview_completed', 'offered', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled']
                : ['interview_completed', 'offered'] } },
            { status: 'interview_scheduled', interviewScheduledAt: { $lte: new Date() } },
            { 'hiringOutcome.status': { $exists: true } },
        ] }, { $set: { hiringOutcome } }, { returnDocument: 'after', runValidators: true }).select('hiringOutcome.status hiringOutcome.recordedAt');

    if (!saved) {
        res.status(409).json({ message: 'The interview is not eligible or the outcome has changed. Refresh the record before trying again.' });
        return;
    }

    await logAction(req, 'HIRING_OUTCOME_RECORDED', `Recorded hiring outcome: ${status}`, {
        targetId: id, targetType: kind === 'placements' ? 'Placement' : 'JobApplication',
    });
    res.json({ hiringOutcome: { status, recordedAt: hiringOutcome.recordedAt } });
};
