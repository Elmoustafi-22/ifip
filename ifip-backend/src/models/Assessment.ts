import { Schema, model, Document, Types } from 'mongoose';

// ─── Question sub-document ────────────────────────────────────────────────────

export interface IQuestionOption {
    _id: Types.ObjectId;
    text: string;
}

export interface IQuestion {
    _id: Types.ObjectId;
    text: string;
    type: 'mcq' | 'multi_select' | 'true_false' | 'short_answer';
    /** Visible answer choices — populated for all types except short_answer */
    options: IQuestionOption[];
    /**
     * IDs of the correct option(s) — stored server-side ONLY.
     * Never returned in participant-facing GET responses.
     * For true_false, options are always [{ text: 'True' }, { text: 'False' }]
     * and correctOptionIds holds the single correct one.
     */
    correctOptionIds: Types.ObjectId[];
    /** Whether multi_select questions award partial credit per correct option */
    partialCredit: boolean;
    /** Points this question is worth (default 1) */
    points: number;
    /** Display order within the assessment */
    order: number;
}

// ─── Assessment document ──────────────────────────────────────────────────────

export interface IAssessment extends Document {
    /** The module this assessment is attached to and gates */
    moduleId: Types.ObjectId;
    title: string;
    /** Instructions shown above the question list (markdown supported) */
    instructions: string;
    /**
     * Visibility gate:
     * - draft     → only admins can see it, participants cannot
     * - published → visible to participants whose module is in_progress/completed
     * - archived  → hidden from participants, read-only for admins
     */
    status: 'draft' | 'published' | 'archived';
    /** Minimum score (0–100%) required to pass. Default: 70 */
    passMark: number;
    /** Maximum number of submission attempts allowed. Default: 3 */
    maxAttempts: number;
    /** Time limit in minutes. null = no limit */
    timeLimitMinutes: number | null;
    /** Hours a participant must wait between failed attempts. 0 = no cooldown */
    retakeCooldownHours: number;
    questions: IQuestion[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const questionOptionSchema = new Schema<IQuestionOption>(
    {
        text: { type: String, required: true },
    },
    { _id: true }
);

const questionSchema = new Schema<IQuestion>(
    {
        text: { type: String, required: true },
        type: {
            type: String,
            enum: ['mcq', 'multi_select', 'true_false', 'short_answer'],
            required: true,
        },
        options: { type: [questionOptionSchema], default: [] },
        correctOptionIds: { type: [Schema.Types.ObjectId], default: [] },
        partialCredit: { type: Boolean, default: false },
        points: { type: Number, default: 1, min: 1 },
        order: { type: Number, required: true },
    },
    { _id: true }
);

const assessmentSchema = new Schema<IAssessment>(
    {
        moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
        title: { type: String, required: true, trim: true },
        instructions: { type: String, default: '' },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        passMark: { type: Number, default: 70, min: 1, max: 100 },
        maxAttempts: { type: Number, default: 3, min: 1 },
        timeLimitMinutes: { type: Number, default: null },
        retakeCooldownHours: { type: Number, default: 0, min: 0 },
        questions: { type: [questionSchema], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

// One assessment per module (enforced at application layer for flexibility,
// but indexed for fast lookup by moduleId)
assessmentSchema.index({ moduleId: 1 });
assessmentSchema.index({ status: 1 });

export const Assessment = model<IAssessment>('Assessment', assessmentSchema);
