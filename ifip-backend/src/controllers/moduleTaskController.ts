import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { ModuleTaskSubmission } from '../models/ModuleTaskSubmission.js';
import { ModuleTaskReward } from '../models/ModuleTaskReward.js';
import { Progress } from '../models/Progress.js';

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
            status,
            message: status === 'qualified'
                ? 'Your approved module tasks qualify you for program progression.'
                : 'Keep submitting and completing task requirements to build your points.',
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

        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required.' });
            return;
        }

        const submissions = await ModuleTaskSubmission.find({
            moduleId: new Types.ObjectId(moduleId),
        }).populate('userId', 'fullName email').sort({ submittedAt: -1 });

        res.json(submissions);
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
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to review task submission.', error: error.message });
    }
};
