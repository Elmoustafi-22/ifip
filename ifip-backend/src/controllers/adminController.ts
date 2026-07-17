import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Waitlist } from '../models/Waitlist.js';
import { Cohort } from '../models/Cohort.js';
import { Notification } from '../models/Notification.js';
import { Module } from '../models/Module.js';
import { AuditLog } from '../models/AuditLog.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { signSetPasswordToken } from '../utils/jwt.js';
import { sendAdminInvitationEmail } from '../services/emailService.js';
import { logAction } from '../utils/auditLogger.js';

// ── GET /api/v1/admin/users ────────────────────────────────────────────────────
// Returns all platform users with optional ?role=&search=&page=&limit= filtering.
// Enriches each user with their linked Application status via a $lookup.
export const getAdminUsers = async (req: Request, res: Response) => {
    try {
        const { role, search, page = '1', limit = '50' } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        const match: any = {};
        if (role && role !== 'all') {
            match.role = role;
        }
        if (search) {
            const regex = new RegExp(search as string, 'i');
            match.$or = [{ email: regex }, { fullName: regex }];
        }

                const enrichPipeline: any[] = [
            { $match: match },
            {
                $lookup: {
                    from: 'applications',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'application',
                    pipeline: [{ $project: { status: 1, submittedAt: 1, cohortId: 1, country: 1, stateCity: 1, fullName: 1, phone: 1, dob: 1, gender: 1, academicInfo: 1, programInterest: 1, skills: 1, motivation: 1, cvUrl: 1, linkedinUrl: 1, portfolioUrl: 1, leadSource: 1, declaration: 1 } }],
                }
            },
            { $addFields: { application: { $arrayElemAt: ['$application', 0] } } },
            {
                $addFields: {
                    isConfigured: {
                        $cond: {
                            if: { $and: [{ $ne: ["$passwordHash", null] }, { $ne: ["$passwordHash", ""] }] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            { $project: { passwordHash: 0 } },
            { $sort: { createdAt: -1 } },
        ];

        const [countResult, users, roleCounts] = await Promise.all([
            User.aggregate([{ $match: match }, { $count: 'total' }]),
            User.aggregate([...enrichPipeline, { $skip: skip }, { $limit: limitNum }]),
            User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        ]);

        const total = countResult[0]?.total ?? 0;
        const roleBreakdown = Object.fromEntries(
            (roleCounts as any[]).map((r) => [r._id, r.count])
        );

        res.json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum), roleBreakdown });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving users.', error: e.message });
    }
};


export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const { cohortId } = req.query;
        const filter: any = {};
        if (cohortId) {
            if (cohortId === 'unassigned') {
                filter.cohortId = null;
            } else {
                filter.cohortId = new Types.ObjectId(cohortId as string);
            }
        }

        const totalPaid = await Application.countDocuments({ ...filter, status: { $in: ['payment_confirmed', 'active', 'completed'] } });
        const activeParticipants = await Application.countDocuments({ ...filter, status: 'active' });
        const completedCount = await Application.countDocuments({ ...filter, status: 'completed' });
        const waitlistCount = await Waitlist.countDocuments();

        // Lead source aggregation breakdown
        const rawLeadSources = await Application.aggregate([
            { $match: filter },
            { $group: { _id: '$leadSource', count: { $sum: 1 } } }
        ]);

        const leadSources = rawLeadSources.map((item: any) => ({
            source: item._id || 'Unknown',
            count: item.count
        }));
        
        res.json({ totalPaid, activeParticipants, completedCount, waitlistCount, leadSources });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving dashboard stats.', error: e.message });
    }
};

export const getAdminApplications = async (req: Request, res: Response) => {
    try {
        const { status, search, cohortId } = req.query;
        const filter: any = {};
        
        if (status) {
            filter.status = status;
        } else {
            filter.status = { $ne: 'withdrawn' };
        }

        if (cohortId) {
            if (cohortId === 'unassigned') {
                filter.cohortId = null;
            } else {
                filter.cohortId = new Types.ObjectId(cohortId as string);
            }
        }
        
        let applications = await Application.find(filter).populate('userId', 'email role').sort({ submittedAt: -1 });
        
        if (search) {
            const lowerSearch = (search as string).toLowerCase();
            applications = applications.filter(app => {
                const fullName = app.fullName?.toLowerCase() || '';
                const email = (app.userId as any)?.email?.toLowerCase() || '';
                return fullName.includes(lowerSearch) || email.includes(lowerSearch);
            });
        }
        
        res.json(applications);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving applications.', error: e.message });
    }
};

export const assignApplicationCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { cohortId } = req.body;
        
        if (!cohortId) {
            res.status(400).json({ message: 'cohortId is required in body.' });
            return;
        }
        
        const app = await Application.findById(id);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        
        const cohort = await Cohort.findById(cohortId);
        if (!cohort) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        
        app.cohortId = cohort._id as any;
        app.status = 'active';
        await app.save();
        
        // Update linked user role to participant
        await User.findByIdAndUpdate(app.userId, { role: 'participant' });

        // Trigger in-app notification for the student
        const linkedUser = await User.findById(app.userId);
        if (linkedUser) {
            notificationEmitter.emit('cohort.assigned', { user: linkedUser, cohort });
        }
        
        res.json({ message: 'Cohort assigned successfully.', application: app });
    } catch (e: any) {
        res.status(500).json({ message: 'Error assigning cohort.', error: e.message });
    }
};

export const withdrawApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const app = await Application.findById(id);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        
        app.status = 'withdrawn';
        await app.save();
        
        // Update linked user role back to applicant to revoke LMS dashboard access
        await User.findByIdAndUpdate(app.userId, { role: 'applicant' });
        
        res.json({ message: 'Participant withdrawn successfully.', application: app });
    } catch (e: any) {
        res.status(500).json({ message: 'Error withdrawing application.', error: e.message });
    }
};

// --- CRUD COHORTS ---
export const getCohorts = async (req: Request, res: Response) => {
    try {
        const cohorts = await Cohort.find().sort({ startDate: -1 });
        res.json(cohorts);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving cohorts.', error: e.message });
    }
};

export const createCohort = async (req: Request, res: Response) => {
    try {
        const { name, startDate, endDate, status, registrationStartDate, registrationEndDate, cohortCap } = req.body;
        if (!name || !startDate || !endDate) {
            res.status(400).json({ message: 'name, startDate, and endDate are required.' });
            return;
        }
        
        const newCohort = new Cohort({ 
            name, 
            startDate: new Date(startDate), 
            endDate: new Date(endDate), 
            status,
            registrationStartDate: registrationStartDate ? new Date(registrationStartDate) : undefined,
            registrationEndDate: registrationEndDate ? new Date(registrationEndDate) : undefined,
            cohortCap: cohortCap !== undefined ? Number(cohortCap) : undefined
        });
        await newCohort.save();
        
        logAction(req, 'COHORT_CREATE', `Created new cohort "${newCohort.name}"`, { targetId: newCohort.id, targetType: 'Cohort' });
        
        res.status(201).json({ message: 'Cohort created successfully.', cohort: newCohort });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating cohort.', error: e.message });
    }
};

export const updateCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, status, registrationStartDate, registrationEndDate, cohortCap } = req.body;
        
        const cohort = await Cohort.findById(id);
        if (!cohort) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        
        if (name) cohort.name = name;
        if (startDate) cohort.startDate = new Date(startDate);
        if (endDate) cohort.endDate = new Date(endDate);
        if (status) cohort.status = status;
        if (registrationStartDate) cohort.registrationStartDate = new Date(registrationStartDate);
        if (registrationEndDate) cohort.registrationEndDate = new Date(registrationEndDate);
        if (cohortCap !== undefined) cohort.cohortCap = Number(cohortCap);
        
        await cohort.save();
        logAction(req, 'COHORT_UPDATE', `Updated cohort "${cohort.name}" settings`, { targetId: cohort.id, targetType: 'Cohort' });
        res.json({ message: 'Cohort updated successfully.', cohort });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating cohort.', error: e.message });
    }
};

export const deleteCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await Cohort.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        logAction(req, 'COHORT_DELETE', `Deleted cohort "${result.name}" (ID: ${id})`);
        res.json({ message: 'Cohort deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting cohort.', error: e.message });
    }
};

// --- Module CRUD Operations ---
export const createModule = async (req: Request, res: Response) => {
    try {
        const { title, description, order, contentType, contentUrl, body, estimatedDuration, cohortId } = req.body;
        
        if (!title || !description || order === undefined || !contentType) {
            res.status(400).json({ message: 'title, description, order, and contentType are required.' });
            return;
        }
        
        const newModule = new Module({
            title,
            description,
            order,
            contentType,
            contentUrl,
            body,
            estimatedDuration: estimatedDuration || 15,
            cohortId: cohortId ? new Types.ObjectId(cohortId) : undefined,
            createdBy: req.user ? new Types.ObjectId(req.user.id) : undefined
        });
        
        await newModule.save();
        notificationEmitter.emit('module.published', { moduleTitle: newModule.title });
        res.status(201).json({ message: 'LMS Module created successfully.', module: newModule });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating module.', error: e.message });
    }
};

export const updateModule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, order, contentType, contentUrl, body, estimatedDuration, cohortId } = req.body;
        
        const mod = await Module.findById(id);
        if (!mod) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }
        
        if (title !== undefined) mod.title = title;
        if (description !== undefined) mod.description = description;
        if (order !== undefined) mod.order = order;
        if (contentType !== undefined) mod.contentType = contentType;
        if (contentUrl !== undefined) mod.contentUrl = contentUrl;
        if (body !== undefined) mod.body = body;
        if (estimatedDuration !== undefined) mod.estimatedDuration = estimatedDuration;
        if (cohortId !== undefined) {
            mod.cohortId = cohortId ? new Types.ObjectId(cohortId) : undefined;
        }
        
        await mod.save();
        res.json({ message: 'LMS Module updated successfully.', module: mod });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating module.', error: e.message });
    }
};

export const deleteModule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await Module.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }
        res.json({ message: 'Module deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting module.', error: e.message });
    }
};

export const broadcastCustomNotification = async (req: Request, res: Response) => {
    try {
        const { targetType, targetUserId, title, message, notificationType, link } = req.body;
        if (!title || !message) {
            res.status(400).json({ message: 'title and message are required.' });
            return;
        }
        if (targetType === 'individual' && !targetUserId) {
            res.status(400).json({ message: 'targetUserId is required for targetType: individual.' });
            return;
        }

        notificationEmitter.emit('admin.broadcast', {
            targetType,
            targetUserId,
            title,
            message,
            notificationType,
            link
        });

        res.json({ message: 'Notification broadcast queued successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error broadcasting notification.', error: e.message });
    }
};

export const inviteAdmin = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, role, title } = req.body;

        if (!firstName || !lastName || !email || !role || !title) {
            res.status(400).json({ message: 'firstName, lastName, email, role, and title are required.' });
            return;
        }

        const roleLower = role.toLowerCase();
        if (roleLower !== 'admin' && roleLower !== 'superadmin') {
            res.status(400).json({ message: 'Invalid role. Must be admin or superadmin.' });
            return;
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ message: 'A user with this email address already exists.' });
            return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const newUser = new User({
            email: email.toLowerCase(),
            role: roleLower,
            title: title.trim(),
            fullName,
            emailVerified: false,
        });

        await newUser.save();

        const token = signSetPasswordToken(newUser.id, newUser.email);
        await sendAdminInvitationEmail(newUser.email, fullName, roleLower, title.trim(), token);

        logAction(req, 'ADMIN_INVITE', `Invited new ${newUser.role} "${newUser.fullName}" (${newUser.email})`, { targetId: newUser.id, targetType: 'User' });

        res.status(201).json({ message: 'Administrator invited successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error inviting administrator.', error: e.message });
    }
};

// ── GET /api/v1/admin/audit-logs ──────────────────────────────────────────────
export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const { search, page = '1', limit = '50', action } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        const match: any = {};
        if (action && action !== 'all') {
            match.action = action;
        }
        if (search) {
            const regex = new RegExp(search as string, 'i');
            match.$or = [
                { userEmail: regex },
                { userRole: regex },
                { action: regex },
                { description: regex }
            ];
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(match)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments(match)
        ]);

        res.json({
            logs,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving audit logs.', error: e.message });
    }
};
