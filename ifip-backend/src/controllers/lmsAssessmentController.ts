import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Assessment } from '../models/Assessment.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { Progress } from '../models/Progress.js';
import { Module } from '../models/Module.js';
import { submitAssessmentSchema } from '../validators/assessmentValidators.js';
import { unlockNextModule } from '../services/lmsService.js';
import { User } from '../models/User.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

// ─── GET /api/v1/lms/modules/:id/assessment ──────────────────────────────────
export const getAssessmentForParticipant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // moduleId
        const userId = req.user!.id;

        // Check if user has access to this module (progress status is 'in_progress' or 'completed')
        const progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(id as string),
        });

        if (!progress || progress.status === 'locked') {
            res.status(403).json({ message: 'Access denied. You must unlock this module first.' });
            return;
        }

        const assessment = await Assessment.findOne({
            moduleId: new Types.ObjectId(id as string),
            status: 'published',
        });

        if (!assessment) {
            res.status(404).json({ message: 'No published assessment found for this module.' });
            return;
        }

        // Sanitize: Strip correctOptionIds before sending to participant
        const sanitizedQuestions = assessment.questions.map((q) => ({
            _id: q._id,
            text: q.text,
            type: q.type,
            options: q.options,
            points: q.points,
            order: q.order,
        })).sort((a, b) => a.order - b.order);

        res.json({
            _id: assessment._id,
            moduleId: assessment.moduleId,
            title: assessment.title,
            instructions: assessment.instructions,
            timeLimitMinutes: assessment.timeLimitMinutes,
            passMark: assessment.passMark,
            maxAttempts: assessment.maxAttempts,
            retakeCooldownHours: assessment.retakeCooldownHours,
            questions: sanitizedQuestions,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving assessment.', error: e.message });
    }
};

// ─── POST /api/v1/lms/modules/:id/assessment/start ────────────────────────────
export const startAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // moduleId
        const userId = req.user!.id;

        const progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(id as string),
        });

        if (!progress || progress.status === 'locked') {
            res.status(403).json({ message: 'Access denied. You must unlock this module first.' });
            return;
        }

        const assessment = await Assessment.findOne({
            moduleId: new Types.ObjectId(id as string),
            status: 'published',
        });

        if (!assessment) {
            res.status(404).json({ message: 'No published assessment found for this module.' });
            return;
        }

        // Check if user has already passed
        if (progress.assessmentStatus === 'passed') {
            res.status(400).json({ message: 'You have already passed the assessment for this module.' });
            return;
        }

        // Check attempts count
        const attemptsCount = await AssessmentSubmission.countDocuments({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
        });

        if (attemptsCount >= assessment.maxAttempts) {
            res.status(403).json({
                code: 'ATTEMPTS_EXHAUSTED',
                message: `You have exhausted all ${assessment.maxAttempts} attempts for this assessment. Please contact support or your cohort coordinator to request a reset.`,
            });
            return;
        }

        // Check retake cooldown
        if (attemptsCount > 0 && assessment.retakeCooldownHours > 0) {
            const lastSubmission = await AssessmentSubmission.findOne({
                assessmentId: assessment._id,
                userId: new Types.ObjectId(userId),
            }).sort({ submittedAt: -1 });

            if (lastSubmission) {
                const cooldownMs = assessment.retakeCooldownHours * 60 * 60 * 1000;
                const timeElapsed = Date.now() - lastSubmission.submittedAt.getTime();
                
                if (timeElapsed < cooldownMs) {
                    const remainingHours = Math.ceil((cooldownMs - timeElapsed) / (60 * 60 * 1000));
                    res.status(429).json({
                        code: 'COOLDOWN_ACTIVE',
                        message: `Please wait ${remainingHours} hour(s) before attempting this assessment again.`,
                        remainingHours,
                    });
                    return;
                }
            }
        }

        res.json({
            message: 'Assessment attempt started successfully.',
            attemptNumber: attemptsCount + 1,
            startedAt: new Date(),
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error starting assessment.', error: e.message });
    }
};

// ─── POST /api/v1/lms/modules/:id/assessment/submit ───────────────────────────
export const submitAssessment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // moduleId
        const userId = req.user!.id;

        const validation = submitAssessmentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                message: 'Invalid submission data.',
                errors: validation.error.flatten(),
            });
            return;
        }

        const { startedAt, answers } = validation.data;

        // Check module access
        const progress = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: new Types.ObjectId(id as string),
        });

        if (!progress || progress.status === 'locked') {
            res.status(403).json({ message: 'Access denied. You must unlock this module first.' });
            return;
        }

        const assessment = await Assessment.findOne({
            moduleId: new Types.ObjectId(id as string),
            status: 'published',
        });

        if (!assessment) {
            res.status(404).json({ message: 'No published assessment found for this module.' });
            return;
        }

        // Validate attempts count
        const attemptsCount = await AssessmentSubmission.countDocuments({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
        });

        if (attemptsCount >= assessment.maxAttempts) {
            res.status(403).json({ message: 'You have exhausted all attempts for this assessment.' });
            return;
        }

        // Check time limit timeout
        const startedTime = new Date(startedAt);
        const submittedTime = new Date();
        let timedOut = false;
        
        if (assessment.timeLimitMinutes) {
            const timeLimitMs = assessment.timeLimitMinutes * 60 * 1000;
            // Add a graceful 30-second network latency padding before flagging timeout
            const latencyPaddingMs = 30000;
            if (submittedTime.getTime() - startedTime.getTime() > timeLimitMs + latencyPaddingMs) {
                timedOut = true;
            }
        }

        // Map client answers
        const clientAnswersMap = new Map(answers.map(a => [a.questionId, a]));
        const gradedAnswers = [];
        let totalPointsAwarded = 0;
        let hasShortAnswer = false;

        for (const q of assessment.questions) {
            const clientAns = clientAnswersMap.get(q._id.toString());
            let isCorrect: boolean | null = false;
            let pointsAwarded = 0;
            const selectedOptionIds = clientAns?.selectedOptionIds || [];
            const textAnswer = clientAns?.textAnswer || '';

            if (q.type === 'short_answer') {
                isCorrect = null; // Stays pending until manual grade
                pointsAwarded = 0;
                hasShortAnswer = true;
            } else if (q.type === 'mcq' || q.type === 'true_false') {
                const correctId = q.correctOptionIds[0]?.toString();
                const selectedId = selectedOptionIds[0]?.toString();
                if (correctId && selectedId === correctId) {
                    isCorrect = true;
                    pointsAwarded = q.points;
                }
            } else if (q.type === 'multi_select') {
                const correctSet = new Set(q.correctOptionIds.map(id => id.toString()));
                const selectedSet = new Set(selectedOptionIds.map(id => id.toString()));
                
                // Compare matching sets
                let match = correctSet.size === selectedSet.size;
                if (match) {
                    for (const id of selectedSet) {
                        if (!correctSet.has(id)) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    isCorrect = true;
                    pointsAwarded = q.points;
                } else if (q.partialCredit) {
                    // Calculate partial score
                    let correctCount = 0;
                    for (const id of selectedSet) {
                        if (correctSet.has(id)) {
                            correctCount++;
                        } else {
                            // Penalise incorrect selections to prevent guessing
                            correctCount = Math.max(0, correctCount - 1);
                        }
                    }
                    const ratio = correctCount / correctSet.size;
                    pointsAwarded = Math.round(ratio * q.points * 100) / 100;
                    isCorrect = ratio > 0;
                }
            }

            totalPointsAwarded += pointsAwarded;

            gradedAnswers.push({
                questionId: q._id,
                selectedOptionIds: selectedOptionIds.map(id => new Types.ObjectId(id)),
                textAnswer,
                isCorrect,
                pointsAwarded,
            });
        }

        // Calculate score percentage
        const totalPointsPossible = assessment.questions.reduce((sum, q) => sum + q.points, 0);
        const score = totalPointsPossible > 0
            ? Math.round((totalPointsAwarded / totalPointsPossible) * 100)
            : 0;

        // Establish outcome status
        let passed: boolean | null = false;
        let submissionStatus: 'passed' | 'failed' | 'pending_review' = 'failed';

        if (hasShortAnswer) {
            submissionStatus = 'pending_review';
            passed = null;
        } else {
            const hasPassed = score >= assessment.passMark;
            passed = hasPassed;
            submissionStatus = hasPassed ? 'passed' : 'failed';
        }

        // Save submission record
        const newSubmission = await AssessmentSubmission.create({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
            moduleId: assessment.moduleId,
            attemptNumber: attemptsCount + 1,
            answers: gradedAnswers,
            score,
            passed,
            status: submissionStatus,
            timedOut,
            startedAt: startedTime,
            submittedAt: submittedTime,
        });

        // Update Progress document
        progress.assessmentStatus = submissionStatus;
        progress.assessmentSubmissionId = newSubmission._id as any;

        if (passed === true) {
            progress.status = 'completed';
            progress.completedAt = new Date();
            await progress.save();
            await unlockNextModule(userId, assessment.moduleId);
        } else {
            await progress.save();
        }

        const userObj = await User.findById(userId);
        const moduleObj = await Module.findById(assessment.moduleId);
        if (userObj) {
            notificationEmitter.emit('assessment.submitted', {
                submission: newSubmission,
                assessment,
                moduleName: moduleObj?.title || 'Coursework',
                user: userObj
            });
        }

        res.status(201).json({
            message: 'Assessment submitted successfully.',
            submission: {
                _id: newSubmission._id,
                attemptNumber: newSubmission.attemptNumber,
                score: newSubmission.score,
                passed: newSubmission.passed,
                status: newSubmission.status,
                timedOut: newSubmission.timedOut,
                submittedAt: newSubmission.submittedAt,
            },
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error submitting assessment.', error: e.message });
    }
};

// ─── GET /api/v1/lms/modules/:id/assessment/result ───────────────────────────
export const getLatestAssessmentResult = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // moduleId
        const userId = req.user!.id;

        const assessment = await Assessment.findOne({
            moduleId: new Types.ObjectId(id as string),
            status: 'published',
        });

        if (!assessment) {
            res.status(404).json({ message: 'No published assessment found for this module.' });
            return;
        }

        const latestSubmission = await AssessmentSubmission.findOne({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
        }).sort({ submittedAt: -1 });

        if (!latestSubmission) {
            res.json({ status: 'not_attempted' });
            return;
        }

        // Strip correct answer info from submission payload before returning to user
        const sanitizedAnswers = latestSubmission.answers.map((ans) => ({
            questionId: ans.questionId,
            selectedOptionIds: ans.selectedOptionIds,
            textAnswer: ans.textAnswer,
            isCorrect: ans.isCorrect, // Participant can see if they got it right, but not the actual correct Option ID
            pointsAwarded: ans.pointsAwarded,
        }));

        res.json({
            _id: latestSubmission._id,
            attemptNumber: latestSubmission.attemptNumber,
            score: latestSubmission.score,
            passed: latestSubmission.passed,
            status: latestSubmission.status,
            timedOut: latestSubmission.timedOut,
            submittedAt: latestSubmission.submittedAt,
            answers: sanitizedAnswers,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving assessment results.', error: e.message });
    }
};
