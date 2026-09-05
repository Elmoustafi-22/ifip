import { Schema, model, Document, Types } from 'mongoose';

export type SessionType =
    | 'orientation'
    | 'live_class'
    | 'async_module'
    | 'breakout'
    | 'assessment'
    | 'other';

export type MeetingPlatform = 'zoom' | 'google_meet' | 'teams' | 'other';

export interface IProgrammeSession extends Document {
    cohortId?: Types.ObjectId;
    weekNumber: number;
    sessionDate: Date;
    title: string;
    sessionType: SessionType;
    description?: string;
    moduleId?: Types.ObjectId;
    meetingUrl?: string;
    meetingPlatform?: MeetingPlatform;
    durationMinutes?: number;
    isPublished: boolean;
    order: number;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const programmeSessionSchema = new Schema<IProgrammeSession>(
    {
        cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
        weekNumber: { type: Number, required: true, default: 1 },
        sessionDate: { type: Date, required: true },
        title: { type: String, required: true },
        sessionType: {
            type: String,
            enum: ['orientation', 'live_class', 'async_module', 'breakout', 'assessment', 'other'],
            default: 'live_class',
            required: true,
        },
        description: { type: String },
        moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
        meetingUrl: { type: String },
        meetingPlatform: {
            type: String,
            enum: ['zoom', 'google_meet', 'teams', 'other'],
            default: 'zoom',
        },
        durationMinutes: { type: Number, default: 60 },
        isPublished: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
    }
);

// Index for efficient schedule queries sorted by week and session date
programmeSessionSchema.index({ cohortId: 1, weekNumber: 1, sessionDate: 1, order: 1 });

export const ProgrammeSession = model<IProgrammeSession>('ProgrammeSession', programmeSessionSchema);
