import { Schema, model, Document, Types } from 'mongoose';

export interface IProgress extends Document {
    userId: Types.ObjectId;
    moduleId: Types.ObjectId;
    status: 'locked' | 'in_progress' | 'completed';
    completedAt?: Date;
    createdAt: Date;
}

const progressSchema = new Schema<IProgress>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    status: { type: String, enum: ['locked', 'in_progress', 'completed'], default: 'locked' },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

export const Progress = model<IProgress>('Progress', progressSchema);
