import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assessment } from '../models/Assessment.js';
import { Module } from '../models/Module.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { Progress } from '../models/Progress.js';
import { createAssessmentSchema, updateAssessmentSchema } from '../validators/assessmentValidators.js';
import { unlockNextModule } from '../services/lmsService.js';
import { User } from '../models/User.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

// ─── GET /api/v1/admin/assessments ────────────────────────────────────────────
export const getAssessments = async (req: Request, res: Response) => {
    try {
        const assessments = await Assessment.find()
            .populate('moduleId', 'title order')
            .populate('createdBy', 'fullName title')
            .sort({ createdAt: -1 });
        res.json(assessments);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving assessments.', error: e.message });
    }
};

// ─── GET /api/v1/admin/assessments/:id ────────────────────────────────────────
export const getAssessmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id)
            .populate('moduleId', 'title order')
            .populate('createdBy', 'fullName title');
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }
        res.json(assessment);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving assessment.', error: e.message });
    }
};

// Helper to sanitize option/question IDs and map correctOptionIds correctly
const sanitizeQuestionsAndOptions = (questions: any[]) => {
    return questions.map((q: any) => {
        const questionId = q._id ? new Types.ObjectId(q._id) : new Types.ObjectId();
        
        // Generate IDs for options if they don't have them
        const optionIdMap = new Map<string, Types.ObjectId>();
        const sanitizedOptions = (q.options || []).map((opt: any) => {
            const optId = opt._id ? new Types.ObjectId(opt._id) : new Types.ObjectId();
            if (opt._id) {
                optionIdMap.set(opt._id.toString(), optId);
            }
            return { _id: optId, text: opt.text };
        });

        // Convert correctOptionIds string representations to ObjectIds
        const sanitizedCorrectOptionIds = (q.correctOptionIds || []).map((idStr: string) => {
            // If the ID matches a client-submitted temporary ID, replace with generated Mongo ID
            const mappedId = optionIdMap.get(idStr);
            return mappedId || new Types.ObjectId(idStr);
        });

        return {
            _id: questionId,
            text: q.text,
            type: q.type,
            options: sanitizedOptions,
            correctOptionIds: sanitizedCorrectOptionIds,
            partialCredit: q.partialCredit || false,
            points: q.points || 1,
            order: q.order,
        };
    });
};

// ─── POST /api/v1/admin/assessments ───────────────────────────────────────────
export const createAssessment = async (req: Request, res: Response) => {
    try {
        const validation = createAssessmentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: 'Invalid assessment data.',
                errors: validation.error.flatten(),
            });
            return;
        }

        const data = validation.data;

        // Check if module exists
        const moduleObjId = new Types.ObjectId(data.moduleId);
        const linkedModule = await Module.findById(moduleObjId);
        if (!linkedModule) {
            res.status(404).json({ message: 'Linked module not found.' });
            return;
        }

        // Check if module already has an assessment
        const existingAssessment = await Assessment.findOne({ moduleId: moduleObjId });
        if (existingAssessment) {
            res.status(400).json({ message: 'This module already has an assessment attached to it.' });
            return;
        }

        const sanitizedQuestions = sanitizeQuestionsAndOptions(data.questions);

        const newAssessment = new Assessment({
            moduleId: moduleObjId,
            title: data.title,
            instructions: data.instructions,
            status: 'draft',
            passMark: data.passMark,
            maxAttempts: data.maxAttempts,
            timeLimitMinutes: data.timeLimitMinutes,
            retakeCooldownHours: data.retakeCooldownHours,
            questions: sanitizedQuestions,
            createdBy: new Types.ObjectId(req.user!.id),
        });

        await newAssessment.save();

        // Update module to link assessment
        linkedModule.assessmentId = newAssessment._id as any;
        await linkedModule.save();

        res.status(201).json({ message: 'Assessment created successfully.', assessment: newAssessment });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating assessment.', error: e.message });
    }
};

// ─── PATCH /api/v1/admin/assessments/:id ──────────────────────────────────────
export const updateAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }

        if (assessment.status !== 'draft') {
            res.status(400).json({ message: 'Cannot edit an assessment that is already published or archived.' });
            return;
        }

        const validation = updateAssessmentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: 'Invalid assessment data.',
                errors: validation.error.flatten(),
            });
            return;
        }

        const data = validation.data;

        if (data.title !== undefined) assessment.title = data.title;
        if (data.instructions !== undefined) assessment.instructions = data.instructions;
        if (data.passMark !== undefined) assessment.passMark = data.passMark;
        if (data.maxAttempts !== undefined) assessment.maxAttempts = data.maxAttempts;
        if (data.timeLimitMinutes !== undefined) assessment.timeLimitMinutes = data.timeLimitMinutes;
        if (data.retakeCooldownHours !== undefined) assessment.retakeCooldownHours = data.retakeCooldownHours;

        if (data.questions !== undefined) {
            assessment.questions = sanitizeQuestionsAndOptions(data.questions) as any;
        }

        await assessment.save();
        res.json({ message: 'Assessment updated successfully.', assessment });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating assessment.', error: e.message });
    }
};

// ─── PATCH /api/v1/admin/assessments/:id/publish ──────────────────────────────
export const publishAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }

        assessment.status = 'published';
        await assessment.save();
        notificationEmitter.emit('assessment.published', { assessmentTitle: assessment.title, moduleId: assessment.moduleId });

        res.json({ message: 'Assessment published successfully.', status: assessment.status });
    } catch (e: any) {
        res.status(500).json({ message: 'Error publishing assessment.', error: e.message });
    }
};

// ─── PATCH /api/v1/admin/assessments/:id/archive ──────────────────────────────
export const archiveAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }

        assessment.status = 'archived';
        await assessment.save();

        res.json({ message: 'Assessment archived successfully.', status: assessment.status });
    } catch (e: any) {
        res.status(500).json({ message: 'Error archiving assessment.', error: e.message });
    }
};

// ─── DELETE /api/v1/admin/assessments/:id ─────────────────────────────────────
export const deleteAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }

        if (assessment.status !== 'draft') {
            res.status(400).json({ message: 'Only draft assessments can be deleted.' });
            return;
        }

        // Remove links in Module
        await Module.updateOne({ assessmentId: assessment._id }, { $unset: { assessmentId: '' } });
        await assessment.deleteOne();

        res.json({ message: 'Assessment deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting assessment.', error: e.message });
    }
};

// ─── GET /api/v1/admin/assessments/:id/submissions ────────────────────────────
export const getAssessmentSubmissions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const submissions = await AssessmentSubmission.find({ assessmentId: new Types.ObjectId(id as string) })
            .populate('userId', 'fullName email')
            .sort({ submittedAt: -1 });
        res.json(submissions);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving submissions.', error: e.message });
    }
};

// ─── PATCH /api/v1/admin/assessments/:id/submissions/:subId/grade ─────────────
export const gradeSubmission = async (req: Request, res: Response) => {
    try {
        const { id, subId } = req.params;
        const { grades } = req.body; // Array of { questionId: string, isCorrect: boolean, pointsAwarded: number }

        if (!Array.isArray(grades)) {
            res.status(400).json({ message: 'grades array is required in the body.' });
            return;
        }

        const submission = await AssessmentSubmission.findOne({
            _id: new Types.ObjectId(subId as string),
            assessmentId: new Types.ObjectId(id as string),
        });

        if (!submission) {
            res.status(404).json({ message: 'Submission not found.' });
            return;
        }

        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment associated with this submission not found.' });
            return;
        }

        // Apply grades
        const gradesMap = new Map(grades.map(g => [g.questionId, g]));
        
        submission.answers.forEach((ans) => {
            const gradeInfo = gradesMap.get(ans.questionId.toString());
            if (gradeInfo) {
                ans.isCorrect = gradeInfo.isCorrect;
                ans.pointsAwarded = gradeInfo.pointsAwarded;
            }
        });

        // Recalculate score
        const totalPointsPossible = assessment.questions.reduce((sum, q) => sum + q.points, 0);
        const totalPointsAwarded = submission.answers.reduce((sum, ans) => sum + ans.pointsAwarded, 0);
        
        submission.score = totalPointsPossible > 0 
            ? Math.round((totalPointsAwarded / totalPointsPossible) * 100)
            : 0;

        // Check if any answers are still pending review (isCorrect === null)
        const hasPendingAnswers = submission.answers.some(ans => ans.isCorrect === null);
        
        if (hasPendingAnswers) {
            submission.status = 'pending_review';
            submission.passed = null;
        } else {
            const hasPassed = submission.score >= assessment.passMark;
            submission.passed = hasPassed;
            submission.status = hasPassed ? 'passed' : 'failed';
        }

        await submission.save();

        // Update Progress record
        const progress = await Progress.findOne({
            userId: submission.userId,
            moduleId: submission.moduleId,
        });

        if (progress) {
            progress.assessmentStatus = submission.status;
            progress.assessmentSubmissionId = submission._id as any;

            if (submission.passed === true) {
                progress.status = 'completed';
                progress.completedAt = new Date();
                await progress.save();
                // Unlock next module and notify user
                await unlockNextModule(submission.userId, submission.moduleId);
            } else if (submission.passed === false) {
                progress.status = 'in_progress';
                await progress.save();
            } else {
                await progress.save();
            }
        }

        res.json({ message: 'Submission graded successfully.', submission });

        const studentUser = await User.findById(submission.userId);
        if (studentUser) {
            const attemptsCount = await AssessmentSubmission.countDocuments({
                assessmentId: assessment._id,
                userId: studentUser._id,
            });
            const attemptsRemaining = Math.max(0, assessment.maxAttempts - attemptsCount);
            notificationEmitter.emit('assessment.graded', { submission, assessment, user: studentUser, attemptsRemaining });
        }
    } catch (e: any) {
        res.status(500).json({ message: 'Error grading submission.', error: e.message });
    }
};

// ─── POST /api/v1/admin/assessments/:id/submissions/reset ──────────────────────
export const resetAttempts = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ message: 'userId is required in body.' });
            return;
        }

        const assessment = await Assessment.findById(id);
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }

        // Delete all submissions for this assessment & user to reset attempts count
        await AssessmentSubmission.deleteMany({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
        });

        // Reset progress record to not started
        const progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: assessment.moduleId,
        });

        if (progress) {
            progress.assessmentStatus = 'not_started';
            progress.assessmentSubmissionId = undefined;
            if (progress.status === 'completed') {
                progress.status = 'in_progress';
                progress.completedAt = undefined;
            }
            await progress.save();
        }

        // Send a notification to the student that attempts were reset via event emitter
        notificationEmitter.emit('assessment.attempts_reset', { userId, assessment });

        res.json({ message: 'Attempts reset successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error resetting attempts.', error: e.message });
    }
};
