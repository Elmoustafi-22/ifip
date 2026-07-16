import { Schema, model, Document, Types } from 'mongoose';

export interface IModule extends Document {
    title: string;
    description: string;
    order: number;
    contentType: 'video' | 'text' | 'quiz' | 'assignment';
    contentUrl?: string;
    body?: string;
    estimatedDuration: number; // in minutes
    cohortId?: Types.ObjectId;
    assessmentId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    createdAt: Date;
}

const moduleSchema = new Schema<IModule>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, required: true, unique: true },
    contentType: { type: String, enum: ['video', 'text', 'quiz', 'assignment'], required: true },
    contentUrl: { type: String },
    body: { type: String },
    estimatedDuration: { type: Number, required: true, default: 15 },
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

export const Module = model<IModule>('Module', moduleSchema);
