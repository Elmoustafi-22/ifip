import { Schema, model, Document, Types } from 'mongoose';

// ─── Answer sub-document ──────────────────────────────────────────────────────

export interface IAnswer {
    questionId: Types.ObjectId;
    /** IDs of selected option(s) — used for mcq, multi_select, true_false */
    selectedOptionIds: Types.ObjectId[];
    /** Free text — used for short_answer only */
    textAnswer?: string;
    /**
     * null  = pending manual review (short_answer questions only)
     * true  = correct
     * false = incorrect
     */
    isCorrect: boolean | null;
    pointsAwarded: number;
}

// ─── AssessmentSubmission document ───────────────────────────────────────────

export interface IAssessmentSubmission extends Document {
    assessmentId: Types.ObjectId;
    userId: Types.ObjectId;
    /** Denormalised for efficient LMS unlock gating queries */
    moduleId: Types.ObjectId;
    /** 1-indexed attempt counter for this user on this assessment */
    attemptNumber: number;
    answers: IAnswer[];
    /** Score as a percentage (0–100), calculated at submit time */
    score: number;
    /**
     * null           = pending manual review of short_answer questions
     * true           = score >= passMark and no pending_review answers
     * false          = score < passMark
     */
    passed: boolean | null;
    /**
     * submitted      = auto-graded, result determined
     * passed         = passed (convenience alias for query filtering)
     * failed         = failed (convenience alias for query filtering)
     * pending_review = has short_answer questions awaiting admin grading
     */
    status: 'submitted' | 'passed' | 'failed' | 'pending_review';
    /** True if the participant submitted after the time limit (flagged, not rejected) */
    timedOut: boolean;
    /** When the participant clicked "Start Assessment" */
    startedAt: Date;
    /** When the participant submitted */
    submittedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const answerSchema = new Schema<IAnswer>(
    {
        questionId: { type: Schema.Types.ObjectId, required: true },
        selectedOptionIds: { type: [Schema.Types.ObjectId], default: [] },
        textAnswer: { type: String, default: '' },
        isCorrect: { type: Boolean, default: null },
        pointsAwarded: { type: Number, default: 0 },
    },
    { _id: false }
);

const assessmentSubmissionSchema = new Schema<IAssessmentSubmission>(
    {
        assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
        attemptNumber: { type: Number, required: true, min: 1 },
        answers: { type: [answerSchema], default: [] },
        score: { type: Number, default: 0, min: 0, max: 100 },
        passed: { type: Boolean, default: null },
        status: {
            type: String,
            enum: ['submitted', 'passed', 'failed', 'pending_review'],
            default: 'submitted',
        },
        timedOut: { type: Boolean, default: false },
        startedAt: { type: Date, required: true },
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Fast lookup: all submissions by a user for a given assessment
assessmentSubmissionSchema.index({ assessmentId: 1, userId: 1 });
// Fast lookup: has this user passed the assessment for this module? (unlock gate)
assessmentSubmissionSchema.index({ userId: 1, moduleId: 1 });
// Admin view: all submissions for an assessment ordered by time
assessmentSubmissionSchema.index({ assessmentId: 1, submittedAt: -1 });

export const AssessmentSubmission = model<IAssessmentSubmission>(
    'AssessmentSubmission',
    assessmentSubmissionSchema
);
