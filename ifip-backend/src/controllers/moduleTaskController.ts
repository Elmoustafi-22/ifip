import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { ModuleTaskSubmission } from '../models/ModuleTaskSubmission.js';
import { ModuleTaskReward } from '../models/ModuleTaskReward.js';
import { Progress } from '../models/Progress.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { sendModuleTaskReminderEmail } from '../services/emailService.js';

const getRouteParamId = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const isSubmissionWindowOpen = (module: any) => {
    if (!module?.moduleTask?.dueDate) {
        return true;
    }

    return new Date() <= new Date(module.moduleTask.dueDate);
};

export const getTaskRewardSummary = async (_req: Request, res: Response) => {
    try {
        const progressRecords = await Progress.find({}).populate('userId', 'fullName email').lean();

        const leaderboardMap = new Map<string, {
            userId: string;
            fullName: string;
            email: string;
            totalAwardedPoints: number;
            passedModules: number;
            status: 'qualified' | 'in_progress';
        }>();

        for (const record of progressRecords) {
            const populatedUser = record.userId as any;
            const userId = populatedUser && typeof populatedUser === 'object' && populatedUser._id
                ? populatedUser._id.toString()
                : (record.userId as any)?.toString?.();

            if (!userId) {
                continue;
            }

            const existing = leaderboardMap.get(userId) || {
                userId,
                fullName: populatedUser?.fullName || 'Participant',
                email: populatedUser?.email || '',
                totalAwardedPoints: 0,
                passedModules: 0,
                status: 'in_progress' as const,
            };

            const awardedPoints = Number(record.taskPointsAwarded || 0);
            if (awardedPoints > 0) {
                existing.totalAwardedPoints += awardedPoints;
            }

            if (record.moduleTaskStatus === 'passed') {
                existing.passedModules += 1;
            }

            if (populatedUser?.fullName) {
                existing.fullName = populatedUser.fullName;
            }
            if (populatedUser?.email) {
                existing.email = populatedUser.email;
            }

            existing.status = existing.totalAwardedPoints > 0 ? 'qualified' : 'in_progress';
            leaderboardMap.set(userId, existing);
        }

        const leaderboard = Array.from(leaderboardMap.values())
            .map((row) => ({
                ...row,
                fullName: row.fullName || row.email?.split('@')[0] || 'Participant',
            }))
            .sort((a, b) => b.totalAwardedPoints - a.totalAwardedPoints || b.passedModules - a.passedModules);

        res.json({
            summary: leaderboard,
            totalQualified: leaderboard.filter((entry) => entry.status === 'qualified').length,
            totalParticipants: leaderboard.length,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch task reward summary.', error: error.message });
    }
};

export const getMyTaskRewardSummary = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const progressRecords = await Progress.find({ userId: new Types.ObjectId(userId) }).lean();

        const totalAwardedPoints = progressRecords.reduce((sum, record) => sum + Number(record.taskPointsAwarded || 0), 0);
        const passedModules = progressRecords.filter((record) => record.moduleTaskStatus === 'passed').length;
        const status = totalAwardedPoints > 0 || passedModules > 0 ? 'qualified' : 'in_progress';

        res.json({
            totalAwardedPoints,
            passedModules,
            passedTasks: passedModules,
            completionNote: status === 'qualified' ? 'Task Requirements Satisfied' : 'In Progress',
            status,
            message: status === 'qualified'
                ? 'Your approved module tasks qualify you for program progression.'
                : 'Keep submitting and completing module tasks to progress through the curriculum.',
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch your task reward summary.', error: error.message });
    }
};

export const getModuleTaskStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const moduleId = getRouteParamId(req.params.id);

        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const module = await Module.findById(moduleId);
        if (!module || module.status === 'draft') {
            res.status(404).json({ message: 'Module not found or not published yet.' });
            return;
        }

        if (!module.moduleTask || Object.keys(module.moduleTask).length === 0) {
            res.status(404).json({ message: 'This module does not have a task attached.' });
            return;
        }

        const latestSubmission = await ModuleTaskSubmission.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
        }).sort({ submittedAt: -1 });

        const progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
        });

        res.json({
            moduleTask: module.moduleTask,
            submissionWindowOpen: isSubmissionWindowOpen(module),
            latestSubmission: latestSubmission ? {
                _id: latestSubmission._id,
                status: latestSubmission.status,
                fileUrl: latestSubmission.fileUrl,
                fileName: latestSubmission.fileName,
                note: latestSubmission.note,
                pointsAwarded: latestSubmission.pointsAwarded,
                adminFeedback: latestSubmission.adminFeedback,
                submittedAt: latestSubmission.submittedAt,
                attemptNumber: latestSubmission.attemptNumber,
            } : null,
            progressStatus: progress?.moduleTaskStatus || 'not_started',
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch module task status.', error: error.message });
    }
};

export const submitModuleTask = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const moduleId = getRouteParamId(req.params.id);
        const { fileUrl, fileName, files, note } = req.body;

        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const module = await Module.findById(moduleId);
        if (!module || module.status === 'draft') {
            res.status(404).json({ message: 'Module not found or not published yet.' });
            return;
        }

        if (!module.moduleTask || Object.keys(module.moduleTask).length === 0) {
            res.status(400).json({ message: 'This module does not have a task attached.' });
            return;
        }

        if (!isSubmissionWindowOpen(module)) {
            res.status(400).json({
                message: 'The submission window for this task is now closed.',
            });
            return;
        }

        const submissionFiles: { fileUrl: string; fileName?: string }[] = Array.isArray(files)
            ? files.filter((f) => f && typeof f.fileUrl === 'string' && f.fileUrl.trim().length > 0)
            : [];

        const primaryFileUrl = submissionFiles.length > 0 ? submissionFiles[0].fileUrl : fileUrl;
        const primaryFileName = submissionFiles.length > 0 ? submissionFiles[0].fileName : fileName;

        if (!primaryFileUrl && submissionFiles.length === 0 && !note) {
            res.status(400).json({
                message: 'Please upload at least one file or provide a short task note before submitting.',
            });
            return;
        }

        const attemptNumber = (await ModuleTaskSubmission.countDocuments({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
        })) + 1;

        const submission = await ModuleTaskSubmission.create({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
            moduleTitle: module.title,
            fileUrl: primaryFileUrl || undefined,
            fileName: primaryFileName || undefined,
            files: submissionFiles.length > 0 ? submissionFiles : undefined,
            note: note || undefined,
            status: 'submitted',
            attemptNumber,
            pointsAwarded: 0,
            submittedAt: new Date(),
            windowOpen: true,
        });

        let progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
        });

        if (!progress) {
            progress = await Progress.create({
                userId: new Types.ObjectId(userId),
                moduleId: new Types.ObjectId(moduleId),
                status: 'in_progress',
                assessmentStatus: 'not_started',
                moduleTaskStatus: 'submitted',
                moduleTaskSubmissionId: submission._id,
            });
        } else {
            progress.moduleTaskStatus = 'submitted';
            progress.moduleTaskSubmissionId = submission._id;
            await progress.save();
        }

        res.status(201).json({
            message: 'Task submitted successfully.',
            submission,
            progress,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to submit module task.', error: error.message });
    }
};

export const getModuleTaskSubmissions = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const moduleId = getRouteParamId(req.params.id);

        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const submissions = await ModuleTaskSubmission.find({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(moduleId),
        }).sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch task submissions.', error: error.message });
    }
};

export const getAllModuleTaskSubmissions = async (req: Request, res: Response) => {
    try {
        const moduleId = getRouteParamId(req.params.id);
        const grouped = req.query.grouped === 'true';

        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const submissions = await ModuleTaskSubmission.find({
            moduleId: new Types.ObjectId(moduleId),
        }).populate('userId', 'fullName email').sort({ submittedAt: -1 });

        if (!grouped) {
            // Legacy flat list
            res.json(submissions);
            return;
        }

        // Group by userId — one entry per participant, latest submission on top
        const participantMap = new Map<string, {
            userId: any;
            moduleId: Types.ObjectId;
            latestSubmission: typeof submissions[0];
            totalAttempts: number;
            allSubmissions: typeof submissions;
        }>();

        for (const submission of submissions) {
            const uid = (submission.userId as any)?._id?.toString() ?? submission.userId?.toString();
            if (!uid) continue;

            if (!participantMap.has(uid)) {
                participantMap.set(uid, {
                    userId: submission.userId,
                    moduleId: submission.moduleId,
                    latestSubmission: submission,  // already sorted desc, first is latest
                    totalAttempts: 1,
                    allSubmissions: [submission],
                });
            } else {
                const existing = participantMap.get(uid)!;
                existing.totalAttempts += 1;
                existing.allSubmissions.push(submission);
            }
        }

        const groupedResult = Array.from(participantMap.values());

        res.json(groupedResult);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch submissions for review.', error: error.message });
    }
};


export const reviewModuleTaskSubmission = async (req: Request, res: Response) => {
    try {
        const adminId = req.user!.id;
        const submissionId = getRouteParamId(req.params.submissionId);
        const { status, pointsAwarded, adminFeedback } = req.body;

        if (!submissionId) {
            res.status(400).json({ message: 'submissionId is required.' });
            return;
        }

        if (!['approved', 'rejected', 'needs_resubmission', 'pending_review'].includes(status)) {
            res.status(400).json({ message: 'Invalid review status selected.' });
            return;
        }

        const submission = await ModuleTaskSubmission.findById(submissionId);
        if (!submission) {
            res.status(404).json({ message: 'Submission not found.' });
            return;
        }

        submission.status = status;
        submission.pointsAwarded = Number(pointsAwarded || 0);
        submission.adminFeedback = adminFeedback || '';
        submission.reviewedBy = new Types.ObjectId(adminId);
        submission.reviewedAt = new Date();
        submission.windowOpen = status === 'approved' ? false : true;
        await submission.save();

        const progress = await Progress.findOne({
            userId: submission.userId,
            moduleId: submission.moduleId,
        });

        if (progress) {
            progress.moduleTaskStatus = status === 'approved'
                ? 'passed'
                : status === 'rejected'
                    ? 'failed'
                    : status === 'needs_resubmission'
                        ? 'needs_resubmission'
                        : 'pending_review';
            progress.moduleTaskSubmissionId = submission._id;
            progress.taskPointsAwarded = status === 'approved' ? submission.pointsAwarded : 0;
            await progress.save();
        }

        if (status === 'approved') {
            await ModuleTaskReward.findOneAndUpdate(
                { submissionId: submission._id },
                {
                    userId: submission.userId,
                    moduleId: submission.moduleId,
                    taskTitle: submission.moduleTitle,
                    pointsAwarded: submission.pointsAwarded,
                    status: 'awarded',
                    awardedAt: new Date(),
                    awardedBy: new Types.ObjectId(adminId),
                    reason: adminFeedback || 'Task approved by admin.',
                },
                { upsert: true, new: true }
            );
        }

        res.json({ message: 'Task submission reviewed successfully.', submission });

        try {
            const studentUser = await User.findById(submission.userId);
            const moduleItem = await Module.findById(submission.moduleId);
            const moduleTitle = submission.moduleTitle || moduleItem?.title || 'Module Task';

            if (studentUser) {
                notificationEmitter.emit('module_task.reviewed', {
                    submission,
                    user: studentUser,
                    moduleTitle,
                    moduleId: submission.moduleId,
                });
            }
        } catch (notifErr) {
            console.error('Failed to trigger review notifications:', notifErr);
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to review task submission.', error: error.message });
    }
};

/**
 * GET /admin/modules/:id/task-non-submitters
 * Returns all active participants who have NOT yet submitted anything
 * for the module's task. Used to power the admin reminder panel.
 */
export const getModuleTaskNonSubmitters = async (req: Request, res: Response) => {
    try {
        const moduleId = getRouteParamId(req.params.id);
        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const module = await Module.findById(moduleId).lean();
        if (!module || !module.moduleTask) {
            res.status(404).json({ message: 'Module or task not found.' });
            return;
        }

        // 1. Find all userIds who have submitted for this module
        const submitted = await ModuleTaskSubmission.find({
            moduleId: new Types.ObjectId(moduleId),
        }).distinct('userId');

        const submittedSet = new Set(submitted.map((id) => id.toString()));

        // 2. Find all active participants (active or payment_confirmed cohort members)
        const activeApps = await Application.find({
            status: { $in: ['active', 'payment_confirmed', 'placement_ready'] },
        }).lean();

        const activeUserIds = activeApps.map((app) => app.userId);

        // 3. Fetch user details for those who haven't submitted
        const nonSubmitterIds = activeUserIds.filter(
            (uid) => !submittedSet.has(uid.toString())
        );

        const users = await User.find(
            { _id: { $in: nonSubmitterIds } },
            'fullName email'
        ).lean();

        res.json({
            moduleTitle: module.title,
            moduleTaskTitle: module.moduleTask?.title || module.title,
            total: users.length,
            nonSubmitters: users,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch non-submitters.', error: error.message });
    }
};

/**
 * POST /admin/modules/:id/task-remind
 * Sends a reminder email + in-app notification to one or all non-submitters.
 * Body: { userIds?: string[] }  — omit to send to ALL non-submitters.
 */
export const sendModuleTaskReminder = async (req: Request, res: Response) => {
    try {
        const moduleId = getRouteParamId(req.params.id);
        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const module = await Module.findById(moduleId).lean();
        if (!module || !module.moduleTask) {
            res.status(404).json({ message: 'Module or task not found.' });
            return;
        }

        const { userIds } = req.body || {};
        const moduleTitle = module.title;
        const taskTitle = module.moduleTask?.title || module.title;
        const dashboardUrl = `/dashboard/modules/${moduleId}`;

        let targetUsers: { _id: Types.ObjectId; fullName?: string; email: string }[];

        if (Array.isArray(userIds) && userIds.length > 0) {
            // Remind specific users
            targetUsers = await User.find(
                { _id: { $in: userIds.map((id: string) => new Types.ObjectId(id)) } },
                'fullName email'
            ).lean() as any[];
        } else {
            // Remind all non-submitters
            const submitted = await ModuleTaskSubmission.find({
                moduleId: new Types.ObjectId(moduleId),
            }).distinct('userId');
            const submittedSet = new Set(submitted.map((id) => id.toString()));

            const activeApps = await Application.find({
                status: { $in: ['active', 'payment_confirmed', 'placement_ready'] },
            }).lean();
            const nonSubmitterIds = activeApps
                .map((app) => app.userId)
                .filter((uid) => !submittedSet.has(uid.toString()));

            targetUsers = await User.find(
                { _id: { $in: nonSubmitterIds } },
                'fullName email'
            ).lean() as any[];
        }

        if (targetUsers.length === 0) {
            res.json({ message: 'No users to remind.', reminded: 0 });
            return;
        }

        let sent = 0;
        const errors: string[] = [];

        await Promise.allSettled(
            targetUsers.map(async (user) => {
                try {
                    // In-app notification
                    await Notification.create({
                        userId: user._id,
                        title: `Reminder: ${taskTitle} — Submission Pending 📋`,
                        message: `Just a friendly nudge! Your task submission for "${moduleTitle}" is still pending. Head to the module page to submit your work as soon as possible.`,
                        type: 'info',
                        link: dashboardUrl,
                    });

                    // Email
                    if (user.email) {
                        await sendModuleTaskReminderEmail({
                            to: user.email,
                            fullName: user.fullName || 'Participant',
                            moduleTitle,
                            taskTitle,
                            moduleId,
                        });
                    }

                    sent++;
                } catch (err: any) {
                    errors.push(`${user.email}: ${err.message}`);
                }
            })
        );

        res.json({
            message: `Reminders sent to ${sent} participant${sent !== 1 ? 's' : ''}.`,
            reminded: sent,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to send reminders.', error: error.message });
    }
};
