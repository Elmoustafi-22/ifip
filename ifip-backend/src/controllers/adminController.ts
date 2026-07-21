import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Application } from '../models/Application.js';
import { Applicant } from '../models/Applicants.js';
import { User } from '../models/User.js';
import { Waitlist } from '../models/Waitlist.js';
import { Cohort } from '../models/Cohort.js';
import { Notification } from '../models/Notification.js';
import { Module } from '../models/Module.js';
import { AuditLog } from '../models/AuditLog.js';
import { Payment } from '../models/Payments.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { signSetPasswordToken, signApplicantSessionToken } from '../utils/jwt.js';
import { sendAdminInvitationEmail, sendPendingReminderEmail } from '../services/emailService.js';
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
                    pipeline: [{ $project: { status: 1, submittedAt: 1, cohortId: 1, country: 1, stateCity: 1, fullName: 1, phone: 1, dob: 1, gender: 1, academicInfo: 1, programInterest: 1, skills: 1, motivation: 1, cvUrl: 1, avatarUrl: 1, linkedinUrl: 1, portfolioUrl: 1, leadSource: 1, declaration: 1 } }],
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

        // Find the step with the greatest absolute drop-off
        let dropOffStep: number | null = null;
        let maxDrop = 0;
        for (let i = 1; i < byStep.length; i++) {
            const drop = byStep[i - 1].count - byStep[i].count;
            if (drop > maxDrop) {
                maxDrop = drop;
                dropOffStep = byStep[i].step;
            }
        }

        // Conversion rate: completed Applications vs total Applicant starters
        // Uses Application total (post-payment) as the numerator for accuracy
        const totalApplications = await Application.countDocuments();
        const totalStarted = meta.totalStarted + totalApplications; // starters = in-flight + completed
        const conversionRate = totalStarted > 0
            ? parseFloat(((totalApplications / totalStarted) * 100).toFixed(1))
            : 0;

        const registrationFunnel = {
            totalStarted,
            inProgress: meta.totalStarted,   // still in Applicant collection
            byStep,
            checkoutStarted: meta.checkoutStarted,
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

        if (user.role !== 'admin' && user.role !== 'superadmin') {
            res.status(400).json({ message: 'Set-password link can only be resent to admin or superadmin users.' });
            return;
        }

        const token = signSetPasswordToken(user.id, user.email);
        await sendAdminInvitationEmail(
            user.email,
            user.fullName || user.email,
            user.role,
            user.title || user.role,
            token
        );

        logAction(req, 'RESEND_INVITE', `Resent set-password link to ${user.role} "${user.fullName}" (${user.email})`, { targetId: user.id, targetType: 'User' });

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
// country/stage filters, and computed expiration time remaining.
export const getPendingApplicants = async (req: Request, res: Response) => {
    try {
        const {
            search,
            country,
            step,
            hasPaymentAttempt,
            paymentStatus,
            expiringSoon,
            programInterest,
            leadSource,
            page = '1',
            limit = '50',
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const skip = (pageNum - 1) * limitNum;

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
            match.$or = [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
            ];
        }

        if (programInterest) {
            match['programInterest.primary'] = { $regex: new RegExp(programInterest as string, 'i') };
        }

        if (leadSource) {
            match.leadSource = { $regex: new RegExp(leadSource as string, 'i') };
        }

        if (expiringSoon === 'true') {
            const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
            match.expiresAt = { $lte: next24h };
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

        const [applicants, total, allPendingCount, attemptedCount, distinctCountries, stepAgg] = await Promise.all([
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
            const expiresAtMs = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
            const diffMs = Math.max(0, expiresAtMs - now);
            const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const paymentAttempts = paymentsByApplicant[a._id.toString()] || [];

            return {
                ...a,
                daysLeft,
                hoursLeft,
                secondsRemaining: Math.floor(diffMs / 1000),
                paymentAttemptsCount: paymentAttempts.length,
                paymentAttempts,
            };
        });

        const stepBreakdown: Record<number, number> = {};
        stepAgg.forEach((item: any) => {
            if (item._id) stepBreakdown[item._id] = item.count;
        });

        const expiringSoonCount = enrichedApplicants.filter((a: any) => a.hoursLeft <= 24).length;

        res.json({
            applicants: enrichedApplicants,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            summary: {
                totalPending: allPendingCount,
                attemptedPaymentCount: attemptedCount,
                noAttemptCount: allPendingCount - attemptedCount,
                expiringSoonCount,
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

        const now = Date.now();
        const expiresAtMs = applicant.expiresAt ? new Date(applicant.expiresAt).getTime() : now + 5 * 24 * 3600 * 1000;
        const diffMs = Math.max(0, expiresAtMs - now);
        const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));

        const resumeToken = signApplicantSessionToken(applicant._id.toString());

        await sendPendingReminderEmail(
            applicant.email,
            applicant.fullName,
            applicant.currentStep,
            daysLeft,
            hoursLeft,
            resumeToken,
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
