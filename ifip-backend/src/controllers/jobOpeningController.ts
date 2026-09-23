import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { JobOpening } from '../models/JobOpening.js';
import { JobApplication } from '../models/JobApplication.js';
import { Module } from '../models/Module.js';
import { ModuleTaskSubmission } from '../models/ModuleTaskSubmission.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

/**
 * Check whether a participant has completed sufficient required module tasks to apply for job openings.
 * Requirement: At most 1 required task uncompleted (e.g. 1/2, 2/3, 3/4, 4/5, all completed).
 * If total required tasks is 1, participant must complete that 1 task (1/1).
 */
const checkTaskEligibility = async (userId: string) => {
    // Find all published modules that have a required task
    const modules = await Module.find({
        status: 'published',
        'moduleTask.isRequired': true,
    }).sort({ order: 1, weekNumber: 1 }).lean();

    const totalRequired = modules.length;
    if (totalRequired === 0) {
        return {
            eligible: true,
            totalRequired: 0,
            approvedCount: 0,
            pendingCount: 0,
            unsubmittedCount: 0,
            maxAllowedIncomplete: 1,
            incompleteTasks: [],
        };
    }

    const incompleteTasks: {
        moduleId: string;
        moduleTitle: string;
        moduleOrder?: number;
        weekNumber?: number;
        taskTitle?: string;
        submissionStatus: string;
    }[] = [];
    let approvedCount = 0;
    let pendingCount = 0;
    let unsubmittedCount = 0;

    for (const mod of modules) {
        // Find latest submission for this module's task
        const latestSubmission = await ModuleTaskSubmission.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: mod._id,
        }).sort({ createdAt: -1 });

        if (latestSubmission && latestSubmission.status === 'approved') {
            approvedCount++;
        } else {
            const subStatus = latestSubmission ? latestSubmission.status : 'unsubmitted';
            if (subStatus === 'submitted' || subStatus === 'pending_review') {
                pendingCount++;
            } else {
                unsubmittedCount++;
            }

            incompleteTasks.push({
                moduleId: (mod._id as Types.ObjectId).toString(),
                moduleTitle: mod.title,
                moduleOrder: mod.order,
                weekNumber: mod.weekNumber,
                taskTitle: mod.moduleTask?.title || 'Coursework Task',
                submissionStatus: subStatus,
            });
        }
    }

    // Eligibility rule:
    // If totalRequired <= 1: must complete that 1 task (incompleteTasks.length === 0, i.e. 1/1)
    // If totalRequired > 1: at most 1 task uncompleted (incompleteTasks.length <= 1)
    const isEligible = totalRequired <= 1
        ? incompleteTasks.length === 0
        : incompleteTasks.length <= 1;

    return {
        eligible: isEligible,
        totalRequired,
        approvedCount,
        pendingCount,
        unsubmittedCount,
        maxAllowedIncomplete: 1,
        incompleteTasks,
    };
};

// ─── GET /api/v1/job-openings ─────────────────────────────────────────────────
// List all open job openings (not past deadline)
export const getOpenJobOpenings = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        const filter: any = {
            status: 'open',
            $or: [
                { applicationDeadline: null },
                { applicationDeadline: { $exists: false } },
                { applicationDeadline: { $gt: now } },
            ],
        };

        const openings = await JobOpening.find(filter)
            .sort({ openedAt: -1 })
            .lean();

        // Enrich with partner org info
        const orgIds = [...new Set(openings.map(o => o.partnerOrgId.toString()))];
        const orgs = await PartnerOrganization.find({ _id: { $in: orgIds } })
            .select('name logoUrl sectorTags')
            .lean();
        const orgMap = new Map(orgs.map(o => [(o as any)._id.toString(), o]));

        // Get application counts per opening
        const openingIds = openings.map(o => (o as any)._id);
        const appCounts = await JobApplication.aggregate([
            { $match: { jobOpeningId: { $in: openingIds } } },
            { $group: { _id: '$jobOpeningId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(appCounts.map(a => [a._id.toString(), a.count]));

        // Check if current user already applied
        const userId = req.user!.id;
        const myApps = await JobApplication.find({
            userId: new Types.ObjectId(userId),
            jobOpeningId: { $in: openingIds },
        }).select('jobOpeningId').lean();
        const appliedSet = new Set(myApps.map(a => a.jobOpeningId.toString()));

        const enriched = openings.map(o => {
            const org = orgMap.get(o.partnerOrgId.toString());
            return {
                ...o,
                partner: org ? { name: (org as any).name, logoUrl: (org as any).logoUrl, sectorTags: (org as any).sectorTags } : null,
                applicationCount: countMap.get((o as any)._id.toString()) || 0,
                hasApplied: appliedSet.has((o as any)._id.toString()),
                allRequirements: [...(o.requirements || []), ...(o.adminRequirements || [])],
            };
        });

        res.json({ openings: enriched, total: enriched.length });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading job openings.', error: err.message });
    }
};

// ─── GET /api/v1/job-openings/eligibility ─────────────────────────────────────
// Check if participant has completed all required tasks
export const checkEligibility = async (req: Request, res: Response) => {
    try {
        const result = await checkTaskEligibility(req.user!.id);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ message: 'Error checking eligibility.', error: err.message });
    }
};

// ─── GET /api/v1/job-openings/my-applications ─────────────────────────────────
// Participant views their own submitted applications
export const getMyJobApplications = async (req: Request, res: Response) => {
    try {
        const applications = await JobApplication.find({ userId: req.user!.id })
            .sort({ submittedAt: -1 })
            .lean();

        // Enrich with job opening + partner info
        const openingIds = [...new Set(applications.map(a => a.jobOpeningId.toString()))];
        const openings = await JobOpening.find({ _id: { $in: openingIds } })
            .select('title workMode location partnerOrgId status')
            .lean();
        const openingMap = new Map(openings.map(o => [(o as any)._id.toString(), o]));

        const orgIds = [...new Set(openings.map(o => o.partnerOrgId.toString()))];
        const orgs = await PartnerOrganization.find({ _id: { $in: orgIds } })
            .select('name logoUrl')
            .lean();
        const orgMap = new Map(orgs.map(o => [(o as any)._id.toString(), o]));

        const enriched = applications.map(app => {
            const opening = openingMap.get(app.jobOpeningId.toString()) as any;
            const org = opening ? orgMap.get(opening.partnerOrgId.toString()) : null;
            return {
                ...app,
                jobOpening: opening ? {
                    title: opening.title,
                    workMode: opening.workMode,
                    location: opening.location,
                    status: opening.status,
                } : null,
                partner: org ? { name: (org as any).name, logoUrl: (org as any).logoUrl } : null,
            };
        });

        res.json({ applications: enriched });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading your applications.', error: err.message });
    }
};

// ─── GET /api/v1/job-openings/:id ─────────────────────────────────────────────
// View details of a single open job
export const getJobOpeningById = async (req: Request, res: Response) => {
    try {
        const opening = await JobOpening.findOne({
            _id: req.params.id,
            status: 'open',
        }).lean();

        if (!opening) {
            res.status(404).json({ message: 'Job opening not found or not currently open.' });
            return;
        }

        const org = await PartnerOrganization.findById(opening.partnerOrgId)
            .select('name logoUrl description sectorTags website')
            .lean();

        // Check if current user already applied
        const existingApp = await JobApplication.findOne({
            jobOpeningId: opening._id,
            userId: req.user!.id,
        }).lean();

        const appCount = await JobApplication.countDocuments({ jobOpeningId: opening._id });

        res.json({
            ...opening,
            partner: org,
            applicationCount: appCount,
            hasApplied: !!existingApp,
            existingApplication: existingApp || null,
            allRequirements: [...(opening.requirements || []), ...(opening.adminRequirements || [])],
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading job opening.', error: err.message });
    }
};

// ─── POST /api/v1/job-openings/:id/apply ──────────────────────────────────────
// Submit an application to a job opening
export const applyToJobOpening = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const openingId = req.params.id;

        // 1. Verify the opening exists and is open
        const opening = await JobOpening.findById(openingId);
        if (!opening || opening.status !== 'open') {
            res.status(404).json({ message: 'This job opening is not currently accepting applications.' });
            return;
        }

        // 2. Check deadline
        if (opening.applicationDeadline && new Date() > opening.applicationDeadline) {
            res.status(400).json({ message: 'The application deadline for this job has passed.' });
            return;
        }

        // 3. Check task eligibility
        const eligibility = await checkTaskEligibility(userId);
        if (!eligibility.eligible) {
            const taskNames = eligibility.incompleteTasks
                .map(t => t.weekNumber ? `Week ${t.weekNumber}: ${t.moduleTitle}` : t.moduleTitle)
                .join(', ');
            res.status(403).json({
                message: eligibility.totalRequired <= 1
                    ? 'Please complete and get approval for your required coursework task before applying to job openings.'
                    : `You have ${eligibility.incompleteTasks.length} uncompleted tasks. You must have at most 1 uncompleted task remaining to apply (e.g. at least ${eligibility.totalRequired - 1} of ${eligibility.totalRequired} completed).`,
                incompleteTasks: eligibility.incompleteTasks,
                detail: `Incomplete tasks: ${taskNames}`,
            });
            return;
        }

        // 4. Check for duplicate application
        const existing = await JobApplication.findOne({ jobOpeningId: openingId, userId });
        if (existing) {
            res.status(409).json({ message: 'You have already applied to this job opening.' });
            return;
        }

        // 5. Validate required fields
        const { cvUrl, coverNote, responses } = req.body;
        if (!cvUrl) {
            res.status(400).json({ message: 'A CV is required to apply.' });
            return;
        }

        // 6. Create the application
        const application = await JobApplication.create({
            jobOpeningId: opening._id as Types.ObjectId,
            userId: new Types.ObjectId(userId as string),
            cvUrl,
            coverNote: coverNote || undefined,
            responses: Array.isArray(responses) ? responses : [],
            status: 'submitted' as const,
            submittedAt: new Date(),
        });

        // 7. Emit notification event
        const user = await User.findById(userId).select('fullName email').lean();
        const org = await PartnerOrganization.findById(opening.partnerOrgId).select('name').lean();

        notificationEmitter.emit('jobApplication.submitted', {
            applicationId: (application as any)._id.toString(),
            userId,
            userName: user?.fullName || user?.email || 'Participant',
            jobTitle: opening.title,
            partnerOrgName: (org as any)?.name || 'Partner',
            partnerOrgId: opening.partnerOrgId.toString(),
        });

        res.status(201).json({ message: 'Application submitted successfully.', application });
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(409).json({ message: 'You have already applied to this job opening.' });
            return;
        }
        res.status(500).json({ message: 'Error submitting application.', error: err.message });
    }
};
