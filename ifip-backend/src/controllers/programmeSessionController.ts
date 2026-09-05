import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ProgrammeSession } from '../models/ProgrammeSession.js';
import { Application } from '../models/Application.js';

// ─── ADMIN: Get all sessions ──────────────────────────────────────────────────
export const getAdminSessions = async (req: Request, res: Response) => {
    try {
        const { cohortId, weekNumber, sessionType, isPublished } = req.query;
        const filter: any = {};

        if (cohortId) {
            if (cohortId === 'unassigned' || cohortId === 'global') {
                filter.cohortId = null;
            } else {
                filter.cohortId = new Types.ObjectId(cohortId as string);
            }
        }
        if (weekNumber) {
            filter.weekNumber = Number(weekNumber);
        }
        if (sessionType) {
            filter.sessionType = sessionType;
        }
        if (isPublished !== undefined) {
            filter.isPublished = isPublished === 'true';
        }

        const sessions = await ProgrammeSession.find(filter)
            .populate('moduleId', 'title order contentType')
            .populate('cohortId', 'name startDate endDate')
            .populate('createdBy', 'fullName')
            .sort({ weekNumber: 1, sessionDate: 1, order: 1 });

        res.json(sessions);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving schedule sessions.', error: e.message });
    }
};

// ─── ADMIN: Create session ────────────────────────────────────────────────────
export const createAdminSession = async (req: Request, res: Response) => {
    try {
        const {
            cohortId,
            weekNumber,
            sessionDate,
            title,
            sessionType,
            description,
            moduleId,
            meetingUrl,
            meetingPlatform,
            durationMinutes,
            isPublished,
            order,
        } = req.body;

        if (!sessionDate || !title) {
            res.status(400).json({ message: 'sessionDate and title are required.' });
            return;
        }

        const session = new ProgrammeSession({
            cohortId: cohortId ? new Types.ObjectId(cohortId) : undefined,
            weekNumber: weekNumber !== undefined ? Number(weekNumber) : 1,
            sessionDate: new Date(sessionDate),
            title,
            sessionType: sessionType || 'live_class',
            description,
            moduleId: moduleId ? new Types.ObjectId(moduleId) : undefined,
            meetingUrl,
            meetingPlatform: meetingPlatform || 'zoom',
            durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
            isPublished: isPublished !== undefined ? isPublished : true,
            order: order !== undefined ? Number(order) : 0,
            createdBy: req.user ? new Types.ObjectId(req.user.id) : undefined,
        });

        await session.save();
        const populated = await ProgrammeSession.findById(session._id)
            .populate('moduleId', 'title order contentType')
            .populate('cohortId', 'name');

        res.status(201).json({ message: 'Programme session created successfully.', session: populated });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating programme session.', error: e.message });
    }
};

// ─── ADMIN: Update session ────────────────────────────────────────────────────
export const updateAdminSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            cohortId,
            weekNumber,
            sessionDate,
            title,
            sessionType,
            description,
            moduleId,
            meetingUrl,
            meetingPlatform,
            durationMinutes,
            isPublished,
            order,
        } = req.body;

        const session = await ProgrammeSession.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Programme session not found.' });
            return;
        }

        if (cohortId !== undefined) {
            session.cohortId = cohortId ? new Types.ObjectId(cohortId) : undefined;
        }
        if (weekNumber !== undefined) session.weekNumber = Number(weekNumber);
        if (sessionDate !== undefined) session.sessionDate = new Date(sessionDate);
        if (title !== undefined) session.title = title;
        if (sessionType !== undefined) session.sessionType = sessionType;
        if (description !== undefined) session.description = description;
        if (moduleId !== undefined) {
            session.moduleId = moduleId ? new Types.ObjectId(moduleId) : undefined;
        }
        if (meetingUrl !== undefined) session.meetingUrl = meetingUrl;
        if (meetingPlatform !== undefined) session.meetingPlatform = meetingPlatform;
        if (durationMinutes !== undefined) session.durationMinutes = Number(durationMinutes);
        if (isPublished !== undefined) session.isPublished = Boolean(isPublished);
        if (order !== undefined) session.order = Number(order);

        await session.save();

        const populated = await ProgrammeSession.findById(session._id)
            .populate('moduleId', 'title order contentType')
            .populate('cohortId', 'name');

        res.json({ message: 'Programme session updated successfully.', session: populated });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating programme session.', error: e.message });
    }
};

// ─── ADMIN: Delete session ────────────────────────────────────────────────────
export const deleteAdminSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await ProgrammeSession.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Programme session not found.' });
            return;
        }
        res.json({ message: 'Programme session deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting programme session.', error: e.message });
    }
};

// ─── ADMIN: Toggle publish ────────────────────────────────────────────────────
export const togglePublishSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const session = await ProgrammeSession.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Programme session not found.' });
            return;
        }
        session.isPublished = !session.isPublished;
        await session.save();
        res.json({ message: `Session ${session.isPublished ? 'published' : 'unpublished'} successfully.`, session });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating publish status.', error: e.message });
    }
};

// ─── ADMIN: Bulk publish / unpublish by week ─────────────────────────────────
export const bulkPublishWeek = async (req: Request, res: Response) => {
    try {
        const { weekNumber, cohortId, isPublished } = req.body;
        if (weekNumber === undefined || isPublished === undefined) {
            res.status(400).json({ message: 'weekNumber and isPublished are required.' });
            return;
        }
        const filter: any = { weekNumber: Number(weekNumber) };
        if (cohortId) {
            filter.cohortId = new Types.ObjectId(cohortId);
        }
        await ProgrammeSession.updateMany(filter, { $set: { isPublished: Boolean(isPublished) } });
        res.json({ message: `All sessions for week ${weekNumber} updated.` });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating week publish status.', error: e.message });
    }
};

// ─── PARTICIPANT: Get full schedule ──────────────────────────────────────────
export const getParticipantSchedule = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const app = await Application.findOne({ userId: new Types.ObjectId(userId) });

        const filter: any = { isPublished: true };
        if (app?.cohortId) {
            filter.$or = [
                { cohortId: app.cohortId },
                { cohortId: null },
                { cohortId: { $exists: false } }
            ];
        }

        const sessions = await ProgrammeSession.find(filter)
            .populate('moduleId', 'title order weekNumber contentType assessmentId estimatedDuration')
            .sort({ weekNumber: 1, sessionDate: 1, order: 1 });

        res.json(sessions);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving participant schedule.', error: e.message });
    }
};

// ─── PARTICIPANT: Get upcoming sessions ──────────────────────────────────────
export const getUpcomingSessions = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const app = await Application.findOne({ userId: new Types.ObjectId(userId) });

        const now = new Date();
        // Today at start of day
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const filter: any = {
            isPublished: true,
            sessionDate: { $gte: todayStart }
        };

        if (app?.cohortId) {
            filter.$or = [
                { cohortId: app.cohortId },
                { cohortId: null },
                { cohortId: { $exists: false } }
            ];
        }

        const sessions = await ProgrammeSession.find(filter)
            .populate('moduleId', 'title order weekNumber contentType assessmentId estimatedDuration')
            .sort({ sessionDate: 1, order: 1 })
            .limit(3);

        res.json(sessions);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving upcoming sessions.', error: e.message });
    }
};
