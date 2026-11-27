import { Schema, model } from 'mongoose';

const schema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: ['unknown', 'subscribed', 'declined', 'unsubscribed'], default: 'unknown', index: true },
    source: { type: String, enum: ['registration', 'account_prompt', 'unsubscribe', 'legacy_import'], default: 'registration' },
    consentSource: { type: String, enum: ['registration', 'account_prompt', 'legacy_import'] },
    consentDate: Date,
    consentEvidence: { type: String, maxlength: 500 },
    consentImportedAt: Date,
    consentImportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const MarketingSubscriber = model('MarketingSubscriber', schema);
