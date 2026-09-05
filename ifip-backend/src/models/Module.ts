import { Schema, model, Document, Types } from 'mongoose';

export interface ITopicOutline {
    title: string;
    subtopics?: string[];
    learningActivity?: string;
    materials?: { label: string; url?: string }[];
}

export interface IModuleOutline {
    purpose?: string;
    learningObjectives?: string[];
    topics?: ITopicOutline[];
    expectedOutcomes?: string[];
}

export interface IModule extends Document {
    title: string;
    description: string;
    order: number;
    weekNumber?: number; // Maps 1-to-1 to cohort week (Week 1, Week 2, Week 3, Week 4)
    contentType: 'video' | 'text' | 'quiz' | 'assignment';
    contentUrl?: string;
    body?: string;
    outline?: IModuleOutline;
    estimatedDuration?: number; // optional (duration belongs to assessment)
    cohortId?: Types.ObjectId;
    assessmentId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    createdAt: Date;
}

const topicOutlineSchema = new Schema<ITopicOutline>({
    title: { type: String, required: true },
    subtopics: [{ type: String }],
    learningActivity: { type: String },
    materials: [{
        label: { type: String, required: true },
        url: { type: String }
    }]
}, { _id: false });

const moduleOutlineSchema = new Schema<IModuleOutline>({
    purpose: { type: String },
    learningObjectives: [{ type: String }],
    topics: [topicOutlineSchema],
    expectedOutcomes: [{ type: String }]
}, { _id: false });

const moduleSchema = new Schema<IModule>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, required: true, unique: true },
    weekNumber: { type: Number, min: 1, max: 52 },
    contentType: { type: String, enum: ['video', 'text', 'quiz', 'assignment'], required: true },
    contentUrl: { type: String },
    body: { type: String },
    outline: { type: moduleOutlineSchema, default: () => ({}) },
    estimatedDuration: { type: Number, default: 0 },
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

export const Module = model<IModule>('Module', moduleSchema);

