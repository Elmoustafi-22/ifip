import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'alert';
    read: boolean;
    link?: string;
    cvRequestOrgId?: Types.ObjectId;
    cvRequestEmailSentAt?: Date;
    cvRequestEmailClaimUntil?: Date;
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
    cvRequestOrgId: { type: Schema.Types.ObjectId, ref: 'PartnerOrganization', select: false },
    cvRequestEmailSentAt: { type: Date, select: false },
    cvRequestEmailClaimUntil: { type: Date, select: false },
    expiresAt: { type: Date, default: null },
    cohortPhase: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

notificationSchema.index(
    { userId: 1, cvRequestOrgId: 1 },
    { unique: true, partialFilterExpression: { read: false, cvRequestOrgId: { $exists: true } } },
);

export const Notification = model<INotification>('Notification', notificationSchema);
