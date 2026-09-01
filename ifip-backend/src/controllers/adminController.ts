import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import { Application } from '../models/Application.js';
import { Applicant } from '../models/Applicants.js';
import { User } from '../models/User.js';
import { Waitlist } from '../models/Waitlist.js';
import { Cohort } from '../models/Cohort.js';
import { Notification } from '../models/Notification.js';
import { Module } from '../models/Module.js';
import { AuditLog } from '../models/AuditLog.js';
import { Payment } from '../models/Payments.js';
import { Broadcast } from '../models/Broadcast.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { signSetPasswordToken, signApplicantSessionToken } from '../utils/jwt.js';
import { generateResumeToken } from '../services/tokenService.js';
import { sendAdminInvitationEmail, sendSetPasswordEmail, sendPendingReminderEmail } from '../services/emailService.js';
import { logAction, logRawAction } from '../utils/auditLogger.js';
import { executeApplicationSubmission } from './applicantController.js';

// Step labels for the registration funnel
const REGISTRATION_STEP_LABELS: Record<number, string> = {
    1: 'Email Verified',
    2: 'Personal Info',
    3: 'Academic Background',
    4: 'Program Interest',
    5: 'Skills & Availability',
    6: 'Declaration & Review',
};

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
                    pipeline: [{ $project: { _id: 1, status: 1, submittedAt: 1, cohortId: 1, country: 1, stateCity: 1, fullName: 1, phone: 1, dob: 1, gender: 1, academicInfo: 1, programInterest: 1, skills: 1, motivation: 1, cvUrl: 1, avatarUrl: 1, linkedinUrl: 1, portfolioUrl: 1, leadSource: 1, declaration: 1 } }],
                }
            },
            { $addFields: { application: { $arrayElemAt: ['$application', 0] } } },
            {
                $addFields: {
                    isConfigured: {
                        $cond: {
                            if: { $gt: [{ $strLenCP: { $ifNull: ['$passwordHash', ''] } }, 0] },
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

        // ── Registration Funnel Aggregation ──────────────────────────────────────
        // Aggregate over the Applicant collection (pre-payment pipeline).
        // No PII is included here — we only count documents per step.
        const [stepCounts, funnelMeta] = await Promise.all([
            // Group by currentStep to get per-step headcounts
            Applicant.aggregate([
                { $group: { _id: '$currentStep', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // Single-pass counts for checkout & payment states
            Applicant.aggregate([
                {
                    $group: {
                        _id: null,
                        totalStarted: { $sum: 1 },
                        checkoutStarted: {
                            $sum: { $cond: [{ $ne: ['$checkoutStartedAt', null] }, 1, 0] },
                        },
                        paymentCompleted: {
                            $sum: { $cond: ['$isPaid', 1, 0] },
                        },
                    },
                },
            ]),
        ]);

        const meta = funnelMeta[0] ?? { totalStarted: 0, checkoutStarted: 0, paymentCompleted: 0 };

        // Build the byStep array with drop-off data
        const stepCountMap: Record<number, number> = {};
        for (const row of stepCounts) {
            stepCountMap[row._id as number] = row.count;
        }

        const byStep = Object.entries(REGISTRATION_STEP_LABELS).map(([stepStr, label]) => {
            const step = Number(stepStr);
            // Count includes anyone at this step OR beyond (waterfall view)
            const count = Object.entries(stepCountMap)
                .filter(([s]) => Number(s) >= step)
                .reduce((acc, [, c]) => acc + c, 0);
            return { step, label, count };
        });

        // Find the step with the greatest absolute drop-off (the step WHERE applicants dropped off)
        let dropOffStep: number | null = null;
        let maxDrop = 0;
        for (let i = 1; i < byStep.length; i++) {
            const drop = byStep[i - 1].count - byStep[i].count;
            if (drop > maxDrop) {
                maxDrop = drop;
                dropOffStep = byStep[i - 1].step; // The step where candidates abandoned
            }
        }

        // Conversion rate: completed Applications vs total Applicant starters
        // Uses Application total (post-payment) as the numerator for accuracy
        const totalApplications = await Application.countDocuments();
        const totalStarted = meta.totalStarted + totalApplications; // starters = in-flight + completed
        const conversionRate = totalStarted > 0
            ? parseFloat(((totalApplications / totalStarted) * 100).toFixed(1))
            : 0;

        // Accurate checkoutStarted count: applicants with actual Payment records OR at step 6 with checkoutStartedAt
        const paymentAttemptApplicantIds = await Payment.distinct('applicantId');
        const checkoutStartedCount = await Applicant.countDocuments({
            $or: [
                { _id: { $in: paymentAttemptApplicantIds } },
                { checkoutStartedAt: { $ne: null }, currentStep: { $gte: 6 } },
            ],
        });

        const registrationFunnel = {
            totalStarted,
            inProgress: meta.totalStarted,   // still in Applicant collection
            byStep,
            checkoutStarted: checkoutStartedCount,
            paymentCompleted: meta.paymentCompleted,
            fullyConverted: totalApplications,
            dropOffStep,
            conversionRate,
        };

        res.json({ totalPaid, activeParticipants, completedCount, waitlistCount, leadSources, registrationFunnel });
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

/**
 * PATCH /api/v1/admin/applications/:id/set-placement-ready
 *
 * Manual admin override to promote a candidate to placement_ready.
 * Useful for candidates who completed older cohorts before automation existed,
 * or where assessments were waived by the coordinator.
 *
 * Guards:
 *  - Cannot promote withdrawn candidates.
 *  - No-op if already placement_ready (returns 200 with existing state).
 */
export const setPlacementReady = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const app = await Application.findById(id);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        if (app.status === 'withdrawn') {
            res.status(400).json({ message: 'Cannot promote a withdrawn participant to placement-ready.' });
            return;
        }

        if (app.status === 'placement_ready') {
            res.json({ message: 'Candidate is already placement-ready.', application: app });
            return;
        }

        const previousStatus = app.status;
        app.status = 'placement_ready';
        await app.save();

        // Fire in-app notification to candidate and admin digest
        notificationEmitter.emit('participant.placement_ready', { userId: app.userId });

        res.json({
            message: 'Candidate successfully promoted to placement-ready.',
            previousStatus,
            application: app,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error setting placement-ready status.', error: e.message });
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
        const { targetType, targetCohortId, targetEmail, title, message, notificationType, link } = req.body;
        if (!title || !message) {
            res.status(400).json({ message: 'title and message are required.' });
            return;
        }
        if (!targetType) {
            res.status(400).json({ message: 'targetType is required.' });
            return;
        }
        if (targetType === 'individual' && !targetEmail) {
            res.status(400).json({ message: 'targetEmail is required for targetType: individual.' });
            return;
        }
        if (['paid', 'pending', 'all_applicants'].includes(targetType) && !targetCohortId) {
            res.status(400).json({ message: 'targetCohortId is required for cohort-based broadcasts.' });
            return;
        }

        let cohortName = undefined;
        if (targetCohortId && Types.ObjectId.isValid(targetCohortId)) {
            const cohort = await Cohort.findById(targetCohortId);
            if (cohort) {
                cohortName = cohort.name;
            }
        }

        // Fetch sender admin email from DB since JWT token only carries { sub, role }
        const adminUser = await User.findById((req as any).user?.id);
        const senderEmail = adminUser?.email || 'admin@nextif.org';

        // Record the broadcast log
        await Broadcast.create({
            senderId: new Types.ObjectId((req as any).user.id),
            senderEmail,
            targetType,
            targetCohortId: targetCohortId && Types.ObjectId.isValid(targetCohortId) ? new Types.ObjectId(targetCohortId) : undefined,
            targetCohortName: cohortName,
            targetEmail,
            title,
            message,
            link,
            notificationType: notificationType || 'info',
            sentAt: new Date()
        });

        notificationEmitter.emit('admin.broadcast', {
            targetType,
            targetCohortId,
            targetEmail,
            title,
            message,
            notificationType,
            link
        });

        logAction(req, 'BROADCAST_SENT', `Admin broadcast notification sent: "${title}" (target: ${targetType})`);

        res.json({ message: 'Notification broadcast queued successfully.' });
    } catch (e: any) {
        console.error('Broadcast notification error:', e);
        res.status(500).json({ message: 'Error broadcasting notification.', error: e.message });
    }
};

export const getBroadcasts = async (req: Request, res: Response) => {
    try {
        const broadcasts = await Broadcast.find()
            .sort({ sentAt: -1 })
            .limit(50);
        res.json(broadcasts);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving broadcasts.', error: e.message });
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

// ── POST /api/v1/admin/users/:id/resend-invite ────────────────────────────────
// Superadmin-only: generate a fresh set-password token and re-send the
// invitation email to an admin/superadmin who has not yet set their password.
export const resendSetPasswordLink = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }



        const token = signSetPasswordToken(user.id, user.email);

        if (user.role === 'admin' || user.role === 'superadmin') {
            await sendAdminInvitationEmail(
                user.email,
                user.fullName || user.email,
                user.role,
                user.title || user.role,
                token
            );
        } else {
            await sendSetPasswordEmail(user.email, token, user.country || 'Nigeria');
        }

        logAction(req, 'RESEND_INVITE', `Resent set-password link to ${user.role} "${user.fullName || user.email}" (${user.email})`, { targetId: user.id, targetType: 'User' });

        res.json({ message: 'Set-password link resent successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error resending set-password link.', error: e.message });
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

// ── GET /api/v1/admin/registration-funnel/applicants ───────────────────────────
// Returns anonymised in-progress Applicant records for the funnel drill-down.
// ⚠ PRIVACY: email and fullName are NEVER included in this response.
//   Full identity is only available once the applicant graduates to an Application
//   (i.e., after successful payment).
export const getRegistrationApplicants = async (req: Request, res: Response) => {
    try {
        const { step, page = '1', limit = '50' } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        const match: any = { isPaid: { $ne: true } }; // exclude anyone pending TTL cleanup after payment
        if (step) {
            const stepNum = parseInt(step as string, 10);
            if (!isNaN(stepNum)) {
                match.currentStep = stepNum;
            }
        }

        const [applicants, total] = await Promise.all([
            Applicant.find(match, {
                // ── Explicit PII exclusion ──────────────────────────
                email: 0,
                fullName: 0,
                phone: 0,
                resumeTokenHash: 0,
                dob: 0,
                // ── Include only what the admin needs ───────────────
                // _id, currentStep, checkoutStartedAt, isPaid, createdAt, updatedAt
                //   are returned by default after the exclusions above.
            })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Applicant.countDocuments(match),
        ]);

        // Further sanitise: return only a short opaque token derived from the _id
        // so the UI can reference individual records without exposing MongoDB IDs.
        const sanitised = applicants.map((a: any) => ({
            ref: a._id.toString().slice(-8).toUpperCase(), // last 8 hex chars — opaque enough
            currentStep: a.currentStep,
            checkoutInitiated: !!a.checkoutStartedAt,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
        }));

        res.json({ applicants: sanitised, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving registration applicants.', error: e.message });
    }
};

// ── GET /api/v1/admin/pending-applicants ────────────────────────────────────────
// Paginated list of pending (unpaid) applicants with full details, payment attempts,
// country/stage filters, and activity data.
export const getPendingApplicants = async (req: Request, res: Response) => {
    try {
        const {
            search,
            country,
            step,
            hasPaymentAttempt,
            paymentStatus,
            programInterest,
            leadSource,
            reminderStatus,
            cooldownHours = '48',
            page = '1',
            limit = '50',
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;
        const cooldownMs = (parseInt(cooldownHours as string, 10) || 48) * 60 * 60 * 1000;
        const cooldownThreshold = new Date(Date.now() - cooldownMs);

        const match: any = { isPaid: { $ne: true } };

        if (step) {
            const stepNum = parseInt(step as string, 10);
            if (!isNaN(stepNum)) {
                match.currentStep = stepNum;
            }
        }

        if (country) {
            match.country = { $regex: new RegExp(country as string, 'i') };
        }

        if (search) {
            const searchRegex = new RegExp((search as string).trim(), 'i');
            const searchOr = [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
            ];
            if (match.$or) {
                match.$and = match.$and || [];
                match.$and.push({ $or: match.$or }, { $or: searchOr });
                delete match.$or;
            } else {
                match.$or = searchOr;
            }
        }

        if (programInterest) {
            match['programInterest.primary'] = { $regex: new RegExp(programInterest as string, 'i') };
        }

        if (leadSource) {
            match.leadSource = { $regex: new RegExp(leadSource as string, 'i') };
        }

        // expiresAt filter removed — applicant data is now retained indefinitely.

        if (reminderStatus === 'never') {
            const neverOr = [
                { lastReminderSentAt: { $exists: false } },
                { lastReminderSentAt: null },
                { reminderCount: 0 },
            ];
            if (match.$or) {
                match.$and = match.$and || [];
                match.$and.push({ $or: match.$or }, { $or: neverOr });
                delete match.$or;
            } else {
                match.$or = neverOr;
            }
        } else if (reminderStatus === 'cooldown_active') {
            match.lastReminderSentAt = { $gte: cooldownThreshold };
        } else if (reminderStatus === 'eligible') {
            const eligibleOr = [
                { lastReminderSentAt: { $exists: false } },
                { lastReminderSentAt: null },
                { lastReminderSentAt: { $lt: cooldownThreshold } },
            ];
            if (match.$or) {
                match.$and = match.$and || [];
                match.$and.push({ $or: match.$or }, { $or: eligibleOr });
                delete match.$or;
            } else {
                match.$or = eligibleOr;
            }
        }

        if (hasPaymentAttempt === 'true' || hasPaymentAttempt === 'false') {
            const attemptedApplicantIds = await Payment.distinct('applicantId');
            if (hasPaymentAttempt === 'true') {
                match._id = { $in: attemptedApplicantIds };
            } else {
                match._id = { $nin: attemptedApplicantIds };
            }
        }

        if (paymentStatus) {
            const matchingPaymentApplicantIds = await Payment.distinct('applicantId', { status: paymentStatus as any });
            if (match._id?.$in) {
                match._id.$in = match._id.$in.filter((id: any) =>
                    matchingPaymentApplicantIds.some((pId: any) => pId.toString() === id.toString())
                );
            } else {
                match._id = { $in: matchingPaymentApplicantIds };
            }
        }

        const [
            applicants,
            total,
            allPendingCount,
            attemptedCount,
            distinctCountries,
            stepAgg,
            neverRemindedCount,
            recentlyRemindedCount,
        ] = await Promise.all([
            Applicant.find(match)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Applicant.countDocuments(match),
            Applicant.countDocuments({ isPaid: { $ne: true } }),
            Payment.distinct('applicantId').then(ids => Applicant.countDocuments({ _id: { $in: ids }, isPaid: { $ne: true } })),
            Applicant.distinct('country', { isPaid: { $ne: true }, country: { $ne: null } }),
            Applicant.aggregate([
                { $match: { isPaid: { $ne: true } } },
                { $group: { _id: '$currentStep', count: { $sum: 1 } } }
            ]),
            Applicant.countDocuments({
                isPaid: { $ne: true },
                $or: [{ lastReminderSentAt: { $exists: false } }, { lastReminderSentAt: null }, { reminderCount: 0 }],
            }),
            Applicant.countDocuments({
                isPaid: { $ne: true },
                lastReminderSentAt: { $gte: cooldownThreshold },
            }),
        ]);

        const applicantIds = applicants.map((a: any) => a._id);
        const payments = await Payment.find({ applicantId: { $in: applicantIds } })
            .sort({ createdAt: -1 })
            .lean();

        const paymentsByApplicant: Record<string, any[]> = {};
        payments.forEach((p: any) => {
            const k = p.applicantId.toString();
            if (!paymentsByApplicant[k]) paymentsByApplicant[k] = [];
            paymentsByApplicant[k].push({
                _id: p._id,
                provider: p.provider,
                providerRef: p.providerRef,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                webhookVerified: p.webhookVerified,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            });
        });

        const now = Date.now();
        const enrichedApplicants = applicants.map((a: any) => {
            const paymentAttempts = paymentsByApplicant[a._id.toString()] || [];

            // Days since last activity (based on updatedAt) — replaces the old expiresAt countdown.
            const updatedAtMs = a.updatedAt ? new Date(a.updatedAt).getTime() : now;
            const daysSinceActivity = Math.floor((now - updatedAtMs) / (1000 * 60 * 60 * 24));

            const lastRemindedMs = a.lastReminderSentAt ? new Date(a.lastReminderSentAt).getTime() : 0;
            const timeSinceLastRemindedMs = lastRemindedMs ? Math.max(0, now - lastRemindedMs) : null;
            const hoursSinceLastReminder = timeSinceLastRemindedMs !== null ? Math.floor(timeSinceLastRemindedMs / (1000 * 60 * 60)) : null;
            const daysSinceLastReminder = timeSinceLastRemindedMs !== null ? Math.floor(timeSinceLastRemindedMs / (1000 * 60 * 60 * 24)) : null;
            const cooldownActive = lastRemindedMs > 0 && (now - lastRemindedMs) < cooldownMs;

            return {
                ...a,
                daysSinceActivity,
                paymentAttemptsCount: paymentAttempts.length,
                paymentAttempts,
                reminderCount: a.reminderCount || 0,
                lastReminderSentAt: a.lastReminderSentAt || null,
                reminderHistory: a.reminderHistory || [],
                hoursSinceLastReminder,
                daysSinceLastReminder,
                cooldownActive,
            };
        });

        const stepBreakdown: Record<number, number> = {};
        stepAgg.forEach((item: any) => {
            if (item._id) stepBreakdown[item._id] = item.count;
        });

        // Applicants inactive for 30+ days (useful for prioritising outreach).
        const inactiveDays30Count = enrichedApplicants.filter((a: any) => a.daysSinceActivity >= 30).length;
        const eligibleRemindedCount = allPendingCount - recentlyRemindedCount;

        res.json({
            applicants: enrichedApplicants,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            summary: {
                totalPending: allPendingCount,
                attemptedPaymentCount: attemptedCount,
                noAttemptCount: allPendingCount - attemptedCount,
                inactiveDays30Count,
                neverRemindedCount,
                recentlyRemindedCount,
                eligibleRemindedCount,
                cooldownHours: parseInt(cooldownHours as string, 10) || 48,
                distinctCountries: distinctCountries.filter(Boolean).sort(),
                stepBreakdown,
            },
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving pending applicants.', error: e.message });
    }
};

// ── POST /api/v1/admin/pending-applicants/:applicantId/remind-email ───────────
export const sendPendingApplicantReminder = async (req: Request, res: Response) => {
    try {
        const { applicantId } = req.params;
        const { subject, message, includeResumeLink } = req.body || {};

        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            res.status(404).json({ message: 'Applicant record not found.' });
            return;
        }

        // Generate a proper opaque resume token (raw/hash pair) — NOT a JWT.
        // The resumeApplication endpoint looks up by hash, so using a JWT here
        // would never match and would produce "This resume link is invalid or has expired."
        const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
        applicant.resumeTokenHash = resumeTokenHash;
        applicant.lastReminderSentAt = new Date();
        applicant.reminderCount = (applicant.reminderCount || 0) + 1;
        if (!applicant.reminderHistory) applicant.reminderHistory = [];
        applicant.reminderHistory.push({
            sentAt: new Date(),
            sentBy: (req as any).user?.email || 'admin',
            subject: subject || undefined,
            includeResumeLink: includeResumeLink !== false,
        });
        await applicant.save();

        await sendPendingReminderEmail(
            applicant.email,
            applicant.fullName,
            applicant.currentStep,
            resumeTokenRaw,
            subject,
            message,
            includeResumeLink !== false
        );

        logRawAction({
            userId: (req as any).user?.id || 'admin',
            userEmail: (req as any).user?.email || 'admin',
            userRole: (req as any).user?.role || 'admin',
            action: 'REMINDER_EMAIL_SENT',
            description: `Sent custom email to pending applicant "${applicant.email}" (ID: ${applicant._id})`,
            targetId: applicant._id.toString(),
            targetType: 'Applicant',
        });

        res.json({ message: `Email successfully sent to ${applicant.email}` });
    } catch (e: any) {
        res.status(500).json({ message: 'Failed to send email.', error: e.message });
    }
};

// ── POST /api/v1/admin/pending-applicants/bulk-remind-email ──────────────────
export const sendBulkPendingApplicantReminders = async (req: Request, res: Response) => {
    try {
        const { applicantIds, subject, message, includeResumeLink } = req.body || {};

        if (!Array.isArray(applicantIds) || applicantIds.length === 0) {
            res.status(400).json({ message: 'No applicant IDs provided for bulk email outreach.' });
            return;
        }

        const applicants = await Applicant.find({ _id: { $in: applicantIds } });
        if (!applicants.length) {
            res.status(404).json({ message: 'No matching pending applicants found.' });
            return;
        }

        let sentCount = 0;
        let failCount = 0;


        // Process in concurrent chunks of 5
        const CHUNK_SIZE = 5;
        for (let i = 0; i < applicants.length; i += CHUNK_SIZE) {
            const chunk = applicants.slice(i, i + CHUNK_SIZE);
            await Promise.all(
                chunk.map(async (applicant) => {
                    try {
                        // Generate a proper opaque resume token (raw/hash pair) — NOT a JWT.
                        // resumeApplication looks up by hash; a JWT would never match.
                        const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
                        applicant.resumeTokenHash = resumeTokenHash;
                        applicant.lastReminderSentAt = new Date();
                        applicant.reminderCount = (applicant.reminderCount || 0) + 1;
                        if (!applicant.reminderHistory) applicant.reminderHistory = [];
                        applicant.reminderHistory.push({
                            sentAt: new Date(),
                            sentBy: (req as any).user?.email || 'admin',
                            subject: subject || undefined,
                            includeResumeLink: includeResumeLink !== false,
                        });
                        await applicant.save();

                        await sendPendingReminderEmail(
                            applicant.email,
                            applicant.fullName,
                            applicant.currentStep,
                            resumeTokenRaw,
                            subject,
                            message,
                            includeResumeLink !== false
                        );
                        sentCount++;
                    } catch (err) {
                        console.error(`Bulk email failed for ${applicant.email}:`, err);
                        failCount++;
                    }
                })
            );
        }

        logRawAction({
            userId: (req as any).user?.id || 'admin',
            userEmail: (req as any).user?.email || 'admin',
            userRole: (req as any).user?.role || 'admin',
            action: 'BULK_REMINDER_EMAIL_SENT',
            description: `Sent bulk email outreach to ${sentCount} pending applicants (${failCount} failed)`,
            targetType: 'Applicant',
        });

        res.json({
            message: `Bulk email processing complete. Successfully sent to ${sentCount} applicant(s).${failCount > 0 ? ` (${failCount} failed)` : ''}`,
            sentCount,
            failCount,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Failed to send bulk emails.', error: e.message });
    }
};

// ── GET /api/v1/admin/payments ─────────────────────────────────────────────────
// Paginated list of all payment records with optional status/provider/search filters.
export const getAdminPayments = async (req: Request, res: Response) => {
    try {
        const { status, provider, search, page = '1', limit = '50' } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        const match: any = {};
        if (status && status !== 'all') match.status = status;
        if (provider && provider !== 'all') match.provider = provider;

        // Search by providerRef text
        if (search) {
            const regex = new RegExp(search as string, 'i');
            match.providerRef = regex;
        }

        const [payments, total, stats] = await Promise.all([
            Payment.find(match)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate({
                    path: 'applicationId',
                    select: 'fullName userId',
                    populate: { path: 'userId', select: 'email' },
                })
                .lean(),
            Payment.countDocuments(match),
            Payment.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                    },
                },
            ]),
        ]);

        // Summarise stats for the UI
        const summary: Record<string, number> = { pending: 0, success: 0, failed: 0, totalRevenue: 0 };
        for (const s of stats) {
            if (s._id === 'success') {
                summary.success = s.count;
                summary.totalRevenue = s.totalAmount;
            } else if (s._id === 'pending') {
                summary.pending = s.count;
            } else if (s._id === 'failed') {
                summary.failed = s.count;
            }
        }

        res.json({ payments, total, page: pageNum, pages: Math.ceil(total / limitNum), summary });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving payments.', error: e.message });
    }
};

// ── GET /api/v1/admin/payments/:id ─────────────────────────────────────────────
// Full payment detail including raw provider verification blobs for debugging.
export const getAdminPaymentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findById(id)
            .populate({
                path: 'applicationId',
                select: 'fullName userId status submittedAt',
                populate: { path: 'userId', select: 'email' },
            })
            .lean();

        if (!payment) {
            res.status(404).json({ message: 'Payment not found.' });
            return;
        }

        res.json(payment);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving payment.', error: e.message });
    }
};

// ── PATCH /api/v1/admin/payments/:id/resolve ───────────────────────────────────
// Admin override: set payment status to success or failed.
// When resolving to 'success', the downstream Application record is created/confirmed.
export const resolvePayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        if (!status || !['success', 'failed'].includes(status)) {
            res.status(400).json({ message: "status must be 'success' or 'failed'." });
            return;
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            res.status(404).json({ message: 'Payment not found.' });
            return;
        }

        const previousStatus = payment.status;
        payment.status = status;
        await payment.save();

        // When resolving to success, run the full application submission flow —
        // this creates the User + Application, sets the participant role, sends the
        // set-password email, welcome/cohort emails, admin enrollment alert, and
        // cleans up the temporary Applicant record. Identical to the webhook path.
        if (status === 'success') {
            // Check whether an Application already exists to avoid double-processing
            const existingApp = await Application.findOne({ paymentId: payment._id });
            if (!existingApp) {
                try {
                    await executeApplicationSubmission(payment.applicantId, payment._id);
                    console.log(`[AdminResolve] executeApplicationSubmission completed for payment ${payment._id}`);
                } catch (submissionErr: any) {
                    // Non-fatal: payment is already saved as success. Log and continue.
                    console.error(`[AdminResolve] executeApplicationSubmission failed for payment ${payment._id}:`, submissionErr?.message);
                }
            } else {
                console.log(`[AdminResolve] Application already exists for payment ${payment._id} — skipping submission.`);
            }
        }

        // Audit log
        const adminUser = await User.findById(req.user!.id);
        await logRawAction({
            userId: req.user!.id,
            userEmail: adminUser?.email || 'N/A',
            userRole: req.user!.role,
            action: 'PAYMENT_RESOLVED',
            description: `Admin resolved payment "${payment.providerRef}" from "${previousStatus}" → "${status}"${note ? `. Note: ${note}` : ''}`,
            targetId: payment.id,
            targetType: 'Payment',
        });

        res.json({ message: 'Payment status resolved successfully.', payment });
    } catch (e: any) {
        res.status(500).json({ message: 'Error resolving payment.', error: e.message });
    }
};

// ── POST /api/v1/admin/pending-applicants/:applicantId/upload-cv ──────────────
export const uploadPendingApplicantCv = async (req: Request, res: Response) => {
    const { applicantId } = req.params;

    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({ message: 'Only PDF, DOC, and DOCX files are accepted' });
        return;
    }

    try {
        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            res.status(404).json({ message: 'Applicant record not found.' });
            return;
        }

        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Cloud storage upload timed out. Please try again.'));
            }, 45000);

            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'ifipp/cvs' },
                (error, result) => {
                    clearTimeout(timer);
                    if (error || !result) {
                        reject(error || new Error('Cloudinary upload returned empty result'));
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        // ── Save the CV URL to the applicant record ───────────────────────────
        // This must happen unconditionally, before any optional email logic,
        // so the applicant sees their CV regardless of notification settings.
        applicant.cvUrl = uploadResult.secure_url;
        applicant.refreshExpiry();
        await applicant.save();

        const shouldNotify = req.body.notifyApplicant !== 'false' && req.body.notifyApplicant !== false;
        let emailSent = false;

        if (shouldNotify && applicant.email) {
            const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
            applicant.resumeTokenHash = resumeTokenHash;
            applicant.lastReminderSentAt = new Date();
            applicant.reminderCount = (applicant.reminderCount || 0) + 1;
            if (!applicant.reminderHistory) applicant.reminderHistory = [];
            applicant.reminderHistory.push({
                sentAt: new Date(),
                sentBy: (req as any).user?.email || 'admin',
                subject: 'Your CV Has Been Uploaded — Resume Your IFIP Application',
                includeResumeLink: true,
            });
            await applicant.save();

            try {
                const subject = 'Your CV Has Been Uploaded — Resume Your IFIP Application';
                const customMessage = `Great news! Our support team has successfully uploaded your CV to your Islamic Finance Internship Program (IFIP) application.\n\nYou are currently at Step {{currentStep}} of 7. Click the button below to resume your application with your CV attached and complete the remaining sections.`;
                await sendPendingReminderEmail(
                    applicant.email,
                    applicant.fullName,
                    applicant.currentStep,
                    resumeTokenRaw,
                    subject,
                    customMessage,
                    true
                );
                emailSent = true;
            } catch (emailErr) {
                console.error('Failed to send CV upload notification email:', emailErr);
            }
        }

        await logAction(req, 'ADMIN_UPLOAD_CV', `Admin uploaded CV for applicant ${applicant.email || applicant._id}${emailSent ? ' (notification email sent)' : ''}`, {
            targetId: applicant._id.toString(),
            targetType: 'Applicant',
        });

        res.json({
            message: emailSent
                ? 'CV uploaded successfully and notification email with resume link sent to applicant'
                : 'CV uploaded successfully for applicant',
            applicantId: applicant._id,
            cvUrl: applicant.cvUrl,
            emailSent,
            applicant,
        });
    } catch (err: any) {
        console.error('Admin CV upload error:', err);
        res.status(500).json({ message: err.message || 'Failed to upload CV for applicant' });
    }
};


// ── POST /api/v1/admin/pending-applicants/:applicantId/record-manual-payment ─
// Admin action: record an offline/manual payment, upload a receipt, and complete candidate enrollment.
export const recordManualPaymentForApplicant = async (req: Request, res: Response) => {
    const { applicantId } = req.params;
    const { amount, currency, paymentMethod, reference, notes, notifyApplicant } = req.body;

    try {
        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            // Check if an application already exists for this applicant's ID or email
            res.status(404).json({ message: 'Pending applicant record not found (may have already completed registration).' });
            return;
        }

        // Upload receipt to Cloudinary if provided
        let receiptUrl: string | undefined = undefined;
        if (req.file) {
            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
            ];
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                res.status(400).json({ message: 'Only JPEG, PNG, WEBP images and PDF receipts are accepted' });
                return;
            }

            receiptUrl = await new Promise<string>((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Cloud storage receipt upload timed out. Please try again.'));
                }, 45000);

                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: 'auto', folder: 'ifipp/receipts' },
                    (error, result) => {
                        clearTimeout(timer);
                        if (error || !result) {
                            reject(error || new Error('Cloudinary receipt upload returned empty result'));
                        } else {
                            resolve(result.secure_url);
                        }
                    }
                );
                stream.end(req.file!.buffer);
            });
        }

        // Determine currency and amount in sub-units (kobo/cents)
        const selectedCurrency = currency || (applicant.country === 'Nigeria' ? 'NGN' : 'USD');
        let amountInSubunits: number;
        if (amount && !isNaN(Number(amount))) {
            amountInSubunits = Number(amount) * 100;
        } else {
            amountInSubunits = selectedCurrency === 'NGN' ? 20000 * 100 : 30 * 100;
        }

        // Ensure declaration is populated on applicant
        if (!applicant.declaration?.confirmed || !applicant.declaration?.signature) {
            applicant.declaration = {
                confirmed: true,
                signature: applicant.fullName || 'Admin Offline Payment',
                date: new Date(),
            };
        }

        // Assign active cohort if missing
        if (!applicant.cohortId) {
            const currentDate = new Date();
            const activeCohort = await Cohort.findOne({
                registrationStartDate: { $lte: currentDate },
                registrationEndDate: { $gte: currentDate },
                status: 'upcoming',
            });
            if (activeCohort) {
                applicant.cohortId = activeCohort._id as any;
            }
        }

        applicant.isPaid = true;
        await applicant.save();

        const providerRef = reference && reference.trim().length > 0
            ? reference.trim()
            : `MANUAL-IFIP-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

        // Create manual payment record
        const payment = await Payment.create({
            applicantId: applicant._id,
            provider: 'manual',
            providerRef,
            amount: amountInSubunits,
            currency: selectedCurrency,
            status: 'success',
            type: 'commitment_levy',
            webhookVerified: true,
            receiptUrl,
            paymentMethod: paymentMethod || 'Bank Transfer',
            manualPaymentNotes: notes || undefined,
            recordedByAdminId: (req as any).user?.id,
        });

        // Execute application submission (creates User + Application, sends password email, cleans up Applicant)
        const submission = await executeApplicationSubmission(applicant._id, payment._id);

        const adminUser = await User.findById((req as any).user?.id);
        await logRawAction({
            userId: (req as any).user?.id,
            userEmail: adminUser?.email || 'admin',
            userRole: (req as any).user?.role || 'admin',
            action: 'ADMIN_MANUAL_PAYMENT_RECORDED',
            description: `Admin recorded manual payment of ${amountInSubunits / 100} ${selectedCurrency} for applicant ${applicant.email} (ref: ${providerRef})${receiptUrl ? ' with receipt upload' : ''}`,
            targetId: payment.id,
            targetType: 'Payment',
        });

        res.json({
            message: 'Manual payment recorded successfully and applicant enrolled.',
            payment,
            application: submission.application,
            setPasswordToken: submission.setPasswordToken,
        });
    } catch (err: any) {
        console.error('Admin record manual payment error:', err);
        res.status(500).json({ message: err.message || 'Failed to record manual payment for applicant.' });
    }
};

// ── GET /api/v1/admin/waitlist ──────────────────────────────────────────────────
// Returns paginated list of waitlisted candidates with search and sorting.
export const getWaitlist = async (req: Request, res: Response) => {
    try {
        const { search, page = '1', limit = '50' } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

        const query: any = {};
        if (search) {
            query.email = new RegExp((search as string).trim(), 'i');
        }

        const [items, total] = await Promise.all([
            Waitlist.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Waitlist.countDocuments(query),
        ]);

        res.json({
            waitlist: items,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum) || 1,
        });
    } catch (err: any) {
        console.error('Get waitlist error:', err);
        res.status(500).json({ message: 'Failed to retrieve waitlist entries.' });
    }
};

// ── DELETE /api/v1/admin/waitlist/:id ───────────────────────────────────────────
// Removes a waitlist entry.
export const deleteWaitlistEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const entry = await Waitlist.findByIdAndDelete(id);
        if (!entry) {
            res.status(404).json({ message: 'Waitlist entry not found.' });
            return;
        }

        logAction(req, 'ADMIN_WAITLIST_ENTRY_DELETED', `Admin deleted waitlist entry: ${entry.email}`);

        res.json({ message: 'Waitlist entry removed successfully.' });
    } catch (err: any) {
        console.error('Delete waitlist entry error:', err);
        res.status(500).json({ message: 'Failed to remove waitlist entry.' });
    }
};

// ── GET /api/v1/admin/applicants/export-csv ─────────────────────────────────────
// Exports comprehensive applicants data insights in CSV format.
// Supports filtering by type ('all' | 'paid' | 'unpaid'), cohortId, status, step,
// country, track/programInterest, paymentStatus, hasPaymentAttempt, search, and date range.
export const exportApplicantsCSV = async (req: Request, res: Response) => {
    try {
        const {
            type = 'all',
            cohortId,
            status,
            step,
            hasPaymentAttempt,
            paymentStatus,
            country,
            programInterest,
            leadSource,
            search,
            startDate,
            endDate,
        } = req.query;

        const escapeCsv = (val: any): string => {
            if (val === null || val === undefined) return '""';
            let str = typeof val === 'object' ? (Array.isArray(val) ? val.join(', ') : JSON.stringify(val)) : String(val).trim();
            // Neutralize formula injection risk
            if (/^[=+\-@\t\r]/.test(str)) {
                str = `'${str}`;
            }
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        };

        const formatDate = (d: any): string => {
            if (!d) return '';
            try {
                const dateObj = new Date(d);
                return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
            } catch {
                return '';
            }
        };

        const formatDateTime = (d: any): string => {
            if (!d) return '';
            try {
                const dateObj = new Date(d);
                return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().replace('T', ' ').substring(0, 19);
            } catch {
                return '';
            }
        };

        const headers = [
            'Applicant Type',
            'Full Name',
            'Email',
            'Phone',
            'Gender',
            'Date of Birth',
            'Country',
            'State / City',
            'Payment Status',
            'Registration Funnel Stage',
            'Admission Status',
            'Cohort',
            'Primary Tracks',
            'Secondary Track',
            'Academic Status',
            'Institution',
            'Field of Study',
            'Qualification / Degree',
            'Graduation Year',
            'Relevant Skills',
            'Tools Known',
            'Prior Internship Experience',
            'Prior Internship Details',
            'Communication Skill Level',
            'Availability',
            'Why Applying (Motivation)',
            'Career Goals',
            'Lead Source / Referral',
            'LinkedIn URL',
            'Portfolio URL',
            'CV / Resume URL',
            'Levy Acknowledged',
            'Declaration Confirmed',
            'Declaration Date',
            'Payment Amount',
            'Payment Currency',
            'Payment Provider',
            'Payment Reference',
            'Payment Method',
            'Date Paid / Submitted',
            'Date Registered / Created',
            'Last Activity Date',
            'Reminders Sent Count',
            'Last Reminder Sent Date',
        ];

        const rows: string[][] = [];

        // 1. Fetch Paid Applicants (Applications) if type is 'paid' or 'all'
        if (type === 'paid' || type === 'all') {
            const appMatch: any = {};

            if (cohortId) {
                if (cohortId === 'unassigned') {
                    appMatch.cohortId = null;
                } else {
                    appMatch.cohortId = new Types.ObjectId(cohortId as string);
                }
            }

            if (status && status !== 'all') {
                appMatch.status = status;
            }

            if (country) {
                appMatch.country = new RegExp((country as string).trim(), 'i');
            }

            if (programInterest) {
                appMatch['programInterest.primary'] = new RegExp((programInterest as string).trim(), 'i');
            }

            if (leadSource) {
                appMatch.leadSource = new RegExp((leadSource as string).trim(), 'i');
            }

            if (startDate || endDate) {
                appMatch.submittedAt = {};
                if (startDate) appMatch.submittedAt.$gte = new Date(startDate as string);
                if (endDate) {
                    const end = new Date(endDate as string);
                    end.setHours(23, 59, 59, 999);
                    appMatch.submittedAt.$lte = end;
                }
            }

            const applications = await Application.find(appMatch)
                .populate('userId', 'email fullName phone country')
                .populate('paymentId')
                .populate('cohortId', 'name')
                .sort({ submittedAt: -1 })
                .lean();

            for (const app of applications) {
                const user = (app.userId as any) || {};
                const payment = (app.paymentId as any) || {};
                const cohort = (app.cohortId as any) || {};

                const fullName = app.fullName || user.fullName || '';
                const email = user.email || '';
                const phone = app.phone || user.phone || '';

                if (search) {
                    const searchStr = (search as string).toLowerCase().trim();
                    const combined = `${fullName} ${email} ${phone}`.toLowerCase();
                    if (!combined.includes(searchStr)) continue;
                }

                // If paymentStatus filter was supplied and doesn't match
                if (paymentStatus && paymentStatus !== 'all' && payment.status !== paymentStatus) {
                    continue;
                }

                const academic = (app.academicInfo as any) || {};
                const skills = (app.skills as any) || {};
                const motivation = (app.motivation as any) || {};
                const declaration = (app.declaration as any) || {};
                const primaryTracks = app.programInterest?.primary || [];

                rows.push([
                    'Paid Applicant (Participant)',
                    fullName,
                    email,
                    phone,
                    app.gender || '',
                    formatDate(app.dob),
                    app.country || user.country || '',
                    app.stateCity || '',
                    payment.status ? payment.status.toUpperCase() : 'PAID',
                    'Completed & Submitted (Step 6)',
                    app.status || 'payment_confirmed',
                    cohort.name || 'Unassigned',
                    primaryTracks.join(', '),
                    app.programInterest?.secondary || '',
                    academic.status || '',
                    academic.institution || '',
                    academic.fieldOfStudy || '',
                    academic.qualification || '',
                    academic.gradYear ? String(academic.gradYear) : '',
                    Array.isArray(skills.relevantSkills) ? skills.relevantSkills.join(', ') : '',
                    Array.isArray(skills.tools) ? skills.tools.join(', ') : '',
                    skills.hasPriorInternship !== undefined ? (skills.hasPriorInternship ? 'Yes' : 'No') : '',
                    skills.priorInternshipDesc || '',
                    skills.commSkillLevel || '',
                    skills.availability || '',
                    motivation.whyApplying || '',
                    motivation.careerGoals || '',
                    app.leadSource || '',
                    app.linkedinUrl || '',
                    app.portfolioUrl || '',
                    app.cvUrl || '',
                    app.levyAcknowledged ? 'Yes' : 'No',
                    declaration.confirmed ? 'Yes' : 'No',
                    formatDateTime(declaration.date),
                    payment.amount !== undefined ? (payment.amount >= 1000 ? String(payment.amount / 100) : String(payment.amount)) : '',
                    payment.currency || '',
                    payment.provider || '',
                    payment.providerRef || '',
                    payment.paymentMethod || '',
                    formatDateTime(app.submittedAt || (app as any).createdAt),
                    formatDateTime((app as any).createdAt),
                    formatDateTime((app as any).updatedAt),
                    '0',
                    '',
                ]);
            }
        }

        // 2. Fetch Unpaid Applicants (Applicant collection) if type is 'unpaid' or 'all'
        if (type === 'unpaid' || type === 'all') {
            const applicantMatch: any = { isPaid: { $ne: true } };

            if (cohortId) {
                if (cohortId === 'unassigned') {
                    applicantMatch.cohortId = null;
                } else {
                    applicantMatch.cohortId = new Types.ObjectId(cohortId as string);
                }
            }

            if (step) {
                const stepNum = parseInt(step as string, 10);
                if (!isNaN(stepNum)) {
                    applicantMatch.currentStep = stepNum;
                }
            }

            if (country) {
                applicantMatch.country = new RegExp((country as string).trim(), 'i');
            }

            if (programInterest) {
                applicantMatch['programInterest.primary'] = new RegExp((programInterest as string).trim(), 'i');
            }

            if (leadSource) {
                applicantMatch.leadSource = new RegExp((leadSource as string).trim(), 'i');
            }

            if (startDate || endDate) {
                applicantMatch.createdAt = {};
                if (startDate) applicantMatch.createdAt.$gte = new Date(startDate as string);
                if (endDate) {
                    const end = new Date(endDate as string);
                    end.setHours(23, 59, 59, 999);
                    applicantMatch.createdAt.$lte = end;
                }
            }

            if (search) {
                const searchRegex = new RegExp((search as string).trim(), 'i');
                const searchOr = [
                    { fullName: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex },
                ];
                applicantMatch.$or = searchOr;
            }

            if (hasPaymentAttempt === 'true' || hasPaymentAttempt === 'false') {
                const attemptedApplicantIds = await Payment.distinct('applicantId');
                if (hasPaymentAttempt === 'true') {
                    applicantMatch._id = { $in: attemptedApplicantIds };
                } else {
                    applicantMatch._id = { $nin: attemptedApplicantIds };
                }
            }

            if (paymentStatus && paymentStatus !== 'all') {
                const matchingPaymentApplicantIds = await Payment.distinct('applicantId', { status: paymentStatus as any });
                if (applicantMatch._id?.$in) {
                    applicantMatch._id.$in = applicantMatch._id.$in.filter((id: any) =>
                        matchingPaymentApplicantIds.some((pId: any) => pId.toString() === id.toString())
                    );
                } else {
                    applicantMatch._id = { $in: matchingPaymentApplicantIds };
                }
            }

            const applicants = await Applicant.find(applicantMatch)
                .populate('cohortId', 'name')
                .sort({ updatedAt: -1 })
                .lean();

            const applicantIds = applicants.map((a: any) => a._id);
            const payments = await Payment.find({ applicantId: { $in: applicantIds } })
                .sort({ createdAt: -1 })
                .lean();

            const latestPaymentByApplicant: Record<string, any> = {};
            for (const p of payments) {
                const k = p.applicantId.toString();
                if (!latestPaymentByApplicant[k]) {
                    latestPaymentByApplicant[k] = p;
                }
            }

            for (const a of applicants) {
                const cohort = (a.cohortId as any) || {};
                const p = latestPaymentByApplicant[a._id.toString()];

                const academic = (a.academicInfo as any) || {};
                const skills = (a.skills as any) || {};
                const motivation = (a.motivation as any) || {};
                const declaration = (a.declaration as any) || {};
                const primaryTracks = a.programInterest?.primary || [];

                let paymentStateDesc = 'UNPAID (No Attempt)';
                if (p) {
                    paymentStateDesc = `ATTEMPTED (${p.status ? p.status.toUpperCase() : 'PENDING'})`;
                }

                const stepLabel = REGISTRATION_STEP_LABELS[a.currentStep]
                    ? `Step ${a.currentStep}: ${REGISTRATION_STEP_LABELS[a.currentStep]}`
                    : `Step ${a.currentStep}`;

                rows.push([
                    'Unpaid Applicant (In Funnel)',
                    a.fullName || '',
                    a.email || '',
                    a.phone || '',
                    a.gender || '',
                    formatDate(a.dob),
                    a.country || '',
                    a.stateCity || '',
                    paymentStateDesc,
                    stepLabel,
                    'In Funnel / Pre-Payment',
                    cohort.name || 'Unassigned',
                    primaryTracks.join(', '),
                    a.programInterest?.secondary || '',
                    academic.status || '',
                    academic.institution || '',
                    academic.fieldOfStudy || '',
                    academic.qualification || '',
                    academic.gradYear ? String(academic.gradYear) : '',
                    Array.isArray(skills.relevantSkills) ? skills.relevantSkills.join(', ') : '',
                    Array.isArray(skills.tools) ? skills.tools.join(', ') : '',
                    skills.hasPriorInternship !== undefined ? (skills.hasPriorInternship ? 'Yes' : 'No') : '',
                    skills.priorInternshipDesc || '',
                    skills.commSkillLevel || '',
                    skills.availability || '',
                    motivation.whyApplying || '',
                    motivation.careerGoals || '',
                    a.leadSource || '',
                    a.linkedinUrl || '',
                    a.portfolioUrl || '',
                    a.cvUrl || '',
                    a.levyAcknowledged ? 'Yes' : 'No',
                    declaration.confirmed ? 'Yes' : 'No',
                    formatDateTime(declaration.date),
                    p?.amount !== undefined ? (p.amount >= 1000 ? String(p.amount / 100) : String(p.amount)) : '',
                    p?.currency || '',
                    p?.provider || '',
                    p?.providerRef || '',
                    p?.paymentMethod || '',
                    '',
                    formatDateTime((a as any).createdAt),
                    formatDateTime((a as any).updatedAt),
                    String(a.reminderCount || 0),
                    formatDateTime(a.lastReminderSentAt),
                ]);
            }
        }

        // Build CSV formatted string with UTF-8 BOM
        const csvLines = [
            headers.map(escapeCsv).join(','),
            ...rows.map(row => row.map(escapeCsv).join(',')),
        ];

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const filename = `ifip-applicants-insights-${type}-${new Date().toISOString().split('T')[0]}.csv`;

        logRawAction({
            userId: (req as any).user?.id || 'admin',
            userEmail: (req as any).user?.email || 'admin',
            userRole: (req as any).user?.role || 'admin',
            action: 'APPLICANTS_CSV_EXPORT',
            description: `Exported ${rows.length} applicant records in CSV format (Type: ${type})`,
            targetType: 'Applicant',
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    } catch (err: any) {
        console.error('Export applicants CSV error:', err);
        res.status(500).json({ message: 'Failed to export applicants CSV.', error: err.message });
    }
};



