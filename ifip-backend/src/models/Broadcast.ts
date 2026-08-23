import { Schema, model, Document, Types } from 'mongoose';

export interface IBroadcast extends Document {
    senderId: Types.ObjectId;
    senderEmail: string;
    targetType: 'paid' | 'pending' | 'all_applicants' | 'individual';
    targetCohortId?: Types.ObjectId;
    targetCohortName?: string;
    targetEmail?: string;
    title: string;
    message: string;
    link?: string;
    notificationType: string;
    sentAt: Date;
}

const broadcastSchema = new Schema<IBroadcast>(
    {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderEmail: { type: String, required: true },
        targetType: { type: String, required: true },
        targetCohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
        targetCohortName: String,
        targetEmail: String,
        title: { type: String, required: true },
        message: { type: String, required: true },
        link: String,
        notificationType: { type: String, default: 'info' },
        sentAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

export const Broadcast = model<IBroadcast>('Broadcast', broadcastSchema);
