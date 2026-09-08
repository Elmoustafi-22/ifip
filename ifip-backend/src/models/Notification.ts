import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'alert';
    read: boolean;
    link?: string;
    expiresAt?: Date;      // If set, notification is hidden after this date
    cohortPhase?: string;  // e.g. 'onboarding', 'week1', 'placement' — for bulk-expire by phase
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'alert'], default: 'info', required: true },
    read: { type: Boolean, default: false, required: true },
    link: { type: String },
    expiresAt: { type: Date, default: null },
    cohortPhase: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

export const Notification = model<INotification>('Notification', notificationSchema);
