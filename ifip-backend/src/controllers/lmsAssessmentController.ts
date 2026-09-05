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
import { evaluateOpenAnswerWithAI, generateModelSolutionFromModule } from '../services/aiGradingService.js';

// Helper to verify user module access and initialize progress if unlocked
const ensureUserModuleAccess = async (userId: string, moduleId: string) => {
    const mod = await Module.findById(moduleId);
    if (!mod) return null;

    let progress = await Progress.findOne({
        userId: new Types.ObjectId(userId),
        moduleId: new Types.ObjectId(moduleId),
    });

    if (progress) {
        if (progress.status === 'locked') return null;
        return progress;
    }

    // Check if previous modules are all completed
    const previousModules = await Module.find({ order: { $lt: mod.order } });
    if (previousModules.length > 0) {
        const prevIds = previousModules.map(m => m._id);
        const completedCount = await Progress.countDocuments({
            userId: new Types.ObjectId(userId),
            moduleId: { $in: prevIds },
            status: 'completed'
        });
        if (completedCount < previousModules.length) {
            return null; // Locked
        }
    }

    // Module is unlocked: initialize progress
    progress = await Progress.create({
        userId: new Types.ObjectId(userId),
        moduleId: new Types.ObjectId(moduleId),
        status: 'in_progress',
        assessmentStatus: 'not_started'
    });

    return progress;
};

// ─── GET /api/v1/lms/modules/:id/assessment ──────────────────────────────────
export const getAssessmentForParticipant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // moduleId
        const userId = req.user!.id;

        const progress = await ensureUserModuleAccess(userId, id as string);
        if (!progress) {
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

        // Sanitize: Strip correctOptionIds and solution mappings before sending to participant
        const sanitizedQuestions = assessment.questions.map((q) => {
            const base: any = {
                _id: q._id,
                text: q.text,
                type: q.type,
                options: q.options,
                points: q.points,
                order: q.order,
            };

            if (q.type === 'matching' && q.matchingPairs && q.matchingPairs.length > 0) {
                base.matchingLeft = q.matchingPairs.map(p => p.left);
                // Shuffle the right definitions so student matches them
                base.matchingRight = [...q.matchingPairs.map(p => p.right)].sort(() => Math.random() - 0.5);
            }

            return base;
        }).sort((a, b) => a.order - b.order);

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

        const progress = await ensureUserModuleAccess(userId, id as string);
        if (!progress) {
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
                const elapsedMs = Date.now() - new Date(lastSubmission.submittedAt).getTime();
                if (elapsedMs < cooldownMs) {
                    const remainingHours = Math.ceil((cooldownMs - elapsedMs) / (60 * 60 * 1000));
                    res.status(403).json({
                        code: 'COOLDOWN_ACTIVE',
                        message: `Cooldown period active. You can retake this assessment in ${remainingHours} hour(s).`,
                    });
                    return;
                }
            }
        }

        // Update progress assessmentStatus to in_progress
        progress.assessmentStatus = 'in_progress';
        await progress.save();

        res.json({
            message: 'Assessment started.',
            startedAt: new Date().toISOString(),
            attemptNumber: attemptsCount + 1,
            maxAttempts: assessment.maxAttempts,
            timeLimitMinutes: assessment.timeLimitMinutes,
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

        const parseResult = submitAssessmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ message: 'Invalid payload.', errors: parseResult.error.format() });
            return;
        }

        const { startedAt, answers } = parseResult.data;

        const progress = await ensureUserModuleAccess(userId, id as string);
        if (!progress) {
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

        // Check time limit timeout (with 3-minute grace window for offline reconnection)
        const startedTime = new Date(startedAt);
        const submittedTime = new Date();
        let timedOut = false;
        
        if (assessment.timeLimitMinutes) {
            const timeLimitMs = assessment.timeLimitMinutes * 60 * 1000;
            const latencyPaddingMs = 180000; // 3 minutes grace padding
            if (submittedTime.getTime() - startedTime.getTime() > timeLimitMs + latencyPaddingMs) {
                timedOut = true;
            }
        }

        // Fetch module content for AI semantic grading context
        const moduleDoc = await Module.findById(assessment.moduleId);
        let compiledModuleContext = moduleDoc?.body || '';
        if (moduleDoc?.description) {
            compiledModuleContext = `${moduleDoc.description}\n\n${compiledModuleContext}`;
        }
        if (moduleDoc?.outline) {
            const outlineParts: string[] = [];
            if (moduleDoc.outline.purpose) outlineParts.push(`Purpose: ${moduleDoc.outline.purpose}`);
            if (moduleDoc.outline.learningObjectives?.length) outlineParts.push(`Learning Objectives:\n- ${moduleDoc.outline.learningObjectives.join('\n- ')}`);
            if (moduleDoc.outline.topics?.length) {
                const topicSummary = moduleDoc.outline.topics.map(t => {
                    const subs = t.subtopics?.length ? ` (${t.subtopics.join(', ')})` : '';
                    return `• ${t.title}${subs}`;
                }).join('\n');
                outlineParts.push(`Topics Covered:\n${topicSummary}`);
            }
            if (outlineParts.length > 0) {
                compiledModuleContext = `${outlineParts.join('\n\n')}\n\n${compiledModuleContext}`;
            }
        }

        // Map client answers
        const clientAnswersMap = new Map(answers.map(a => [a.questionId, a]));
        const gradedAnswers = [];
        let totalPointsAwarded = 0;
        let hasShortAnswerRequiringManualReview = false;

        for (const q of assessment.questions) {
            const clientAns = clientAnswersMap.get(q._id.toString());
            let isCorrect: boolean | null = false;
            let pointsAwarded = 0;
            let feedback = '';
            const selectedOptionIds = clientAns?.selectedOptionIds || [];
            const textAnswer = (clientAns?.textAnswer || '').trim();
            const matchingAnswers = clientAns?.matchingAnswers || [];

            if (q.type === 'short_answer') {
                const evalResult = await evaluateOpenAnswerWithAI({
                    questionText: q.text,
                    modelAnswer: q.explanation,
                    acceptedKeywords: q.acceptedKeywords,
                    studentAnswer: textAnswer,
                    moduleTitle: moduleDoc?.title || '',
                    moduleContent: compiledModuleContext,
                    maxPoints: q.points,
                });
                isCorrect = evalResult.isCorrect;
                pointsAwarded = evalResult.pointsAwarded;
                feedback = evalResult.feedback;

                if (!q.explanation && evalResult.modelAnswer) {
                    q.explanation = evalResult.modelAnswer;
                    Assessment.updateOne(
                        { _id: assessment._id, "questions._id": q._id },
                        { $set: { "questions.$.explanation": evalResult.modelAnswer } }
                    ).exec().catch(() => {});
                }
            } else if (q.type === 'matching') {
                const pairs = q.matchingPairs || [];
                let correctCount = 0;
                for (const pair of pairs) {
                    const studentChoice = matchingAnswers.find(m => m.left.trim() === pair.left.trim());
                    if (studentChoice && studentChoice.right.trim() === pair.right.trim()) {
                        correctCount++;
                    }
                }

                if (pairs.length > 0) {
                    const ratio = correctCount / pairs.length;
                    pointsAwarded = Math.round(ratio * q.points * 100) / 100;
                    isCorrect = ratio === 1;
                }
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
                    let correctCount = 0;
                    for (const id of selectedSet) {
                        if (correctSet.has(id)) {
                            correctCount++;
                        } else {
                            correctCount = Math.max(0, correctCount - 1);
                        }
                    }
                    const ratio = correctSet.size > 0 ? correctCount / correctSet.size : 0;
                    pointsAwarded = Math.round(ratio * q.points * 100) / 100;
                    isCorrect = ratio > 0;
                }
            }

            totalPointsAwarded += pointsAwarded;

            gradedAnswers.push({
                questionId: q._id,
                selectedOptionIds: selectedOptionIds.map(id => new Types.ObjectId(id)),
                textAnswer,
                matchingAnswers,
                isCorrect,
                pointsAwarded,
                feedback: feedback || undefined,
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

        if (hasShortAnswerRequiringManualReview) {
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

        const totalAttemptsMade = await AssessmentSubmission.countDocuments({
            assessmentId: assessment._id,
            userId: new Types.ObjectId(userId),
        });

        const maxAllowedAttempts = assessment.maxAttempts || 3;
        const isLastAttempt = totalAttemptsMade >= maxAllowedAttempts;
        const hasPassed = latestSubmission.passed === true;

        // Show solutions and answers ONLY on the last attempt, or if the assessment was passed
        const revealAnswers = hasPassed || isLastAttempt;

        // If answers are revealed, fetch module context to dynamically generate solutions for short answer questions if missing
        let compiledModuleContext = '';
        if (revealAnswers) {
            const moduleDoc = await Module.findById(assessment.moduleId);
            if (moduleDoc) {
                compiledModuleContext = moduleDoc.body || '';
                if (moduleDoc.description) compiledModuleContext = `${moduleDoc.description}\n\n${compiledModuleContext}`;
                if (moduleDoc.outline?.purpose) compiledModuleContext = `Purpose: ${moduleDoc.outline.purpose}\n\n${compiledModuleContext}`;
                if (moduleDoc.outline?.topics?.length) {
                    const topics = moduleDoc.outline.topics.map(t => `${t.title} (${(t.subtopics || []).join(', ')})`).join('; ');
                    compiledModuleContext = `Topics: ${topics}\n\n${compiledModuleContext}`;
                }
            }
        }

        const questionMap = new Map(assessment.questions.map(q => [q._id.toString(), q]));

        const sanitizedAnswers = await Promise.all(latestSubmission.answers.map(async (ans) => {
            const q = questionMap.get(ans.questionId.toString());
            let solutionExplanation = q?.explanation;

            if (revealAnswers && q && q.type === 'short_answer') {
                const needsGeneration = !solutionExplanation || 
                    solutionExplanation.includes('Correct conceptual understanding required') ||
                    solutionExplanation.toLowerCase().includes('not available') ||
                    solutionExplanation.toLowerCase().includes('based strictly on');

                if (needsGeneration) {
                    const moduleDoc = await Module.findById(assessment.moduleId);
                    solutionExplanation = await generateModelSolutionFromModule({
                        questionText: q.text,
                        moduleTitle: moduleDoc?.title || '',
                        moduleContent: compiledModuleContext,
                        existingExplanation: q.explanation
                    });
                    if (solutionExplanation) {
                        q.explanation = solutionExplanation;
                        Assessment.updateOne(
                            { _id: assessment._id, "questions._id": q._id },
                            { $set: { "questions.$.explanation": solutionExplanation } }
                        ).exec().catch(() => {});
                    }
                }
            }

            const isCorrect = ans.isCorrect === true;
            const feedback = isCorrect 
                ? (ans.feedback || "Correct. Your response is correct.") 
                : "Incorrect. Your answer is incorrect.";

            return {
                questionId: ans.questionId,
                selectedOptionIds: ans.selectedOptionIds,
                matchingAnswers: ans.matchingAnswers,
                textAnswer: ans.textAnswer,
                isCorrect: ans.isCorrect,
                pointsAwarded: ans.pointsAwarded,
                feedback,
                // Solutions revealed ONLY when revealAnswers is true (last attempt or passed)
                correctOptionIds: revealAnswers && q ? q.correctOptionIds : undefined,
                matchingPairs: revealAnswers && q ? q.matchingPairs : undefined,
                explanation: revealAnswers ? solutionExplanation : undefined,
                acceptedKeywords: revealAnswers && q ? q.acceptedKeywords : undefined,
            };
        }));

        res.json({
            _id: latestSubmission._id,
            attemptNumber: latestSubmission.attemptNumber,
            totalAttempts: totalAttemptsMade,
            attemptsRemaining: Math.max(0, (assessment.maxAttempts || 3) - totalAttemptsMade),
            maxAttempts: assessment.maxAttempts || 3,
            score: latestSubmission.score,
            passed: latestSubmission.passed,
            status: latestSubmission.status,
            timedOut: latestSubmission.timedOut,
            submittedAt: latestSubmission.submittedAt,
            revealAnswers,
            answers: sanitizedAnswers,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving assessment results.', error: e.message });
    }
};
