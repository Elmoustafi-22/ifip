import { Schema, model } from 'mongoose';

const recipientSchema = new Schema({
    subscriberId: { type: Schema.Types.ObjectId, ref: 'MarketingSubscriber', required: true },
    status: { type: String, enum: ['pending', 'sending', 'accepted', 'failed', 'skipped', 'unknown'], default: 'pending' },
    updatedAt: Date,
}, { _id: false });

const schema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true, maxlength: 250 },
    message: { type: String, required: true, maxlength: 30000 },
    batchSize: { type: Number, required: true, min: 1, max: 1000, default: 400 },
    recipients: { type: [recipientSchema], default: [] },
    status: { type: String, enum: ['draft', 'queued', 'processing', 'ready', 'interrupted', 'completed'], default: 'draft', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    processingAt: Date,
}, { timestamps: true });

export const MarketingCampaign = model('MarketingCampaign', schema);

export function campaignSummary(campaign: any) {
    const recipients = campaign.recipients ?? [];
    const count = (status: string) => recipients.filter((recipient: any) => recipient.status === status).length;
    return {
        id: String(campaign._id), name: campaign.name, subject: campaign.subject, message: campaign.message,
        batchSize: campaign.batchSize, status: campaign.status, total: recipients.length,
        accepted: count('accepted'), failed: count('failed'), skipped: count('skipped'),
        remaining: count('pending'), sending: count('sending'), unknown: count('unknown'), createdAt: campaign.createdAt, updatedAt: campaign.updatedAt,
    };
}
