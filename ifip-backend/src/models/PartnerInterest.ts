import { Schema, model, Document, Types } from 'mongoose';

export interface IPartnerInterest extends Document {
    partnerOrgId: Types.ObjectId;
    userId: Types.ObjectId;       // the intern being requested
    note?: string;                // partner's optional reason for selection
    status: 'pending' | 'approved' | 'declined';
    adminReason?: string;         // admin note if declined
    requestedAt: Date;
    reviewedAt?: Date;
}

const partnerInterestSchema = new Schema<IPartnerInterest>({
    partnerOrgId: { type: Schema.Types.ObjectId, ref: 'PartnerOrganization', required: true },
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note:         { type: String },
    status:       { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending', required: true },
    adminReason:  { type: String },
    requestedAt:  { type: Date, default: Date.now },
    reviewedAt:   { type: Date },
}, { timestamps: false });

// Prevent a partner from submitting duplicate active requests for the same intern
partnerInterestSchema.index({ partnerOrgId: 1, userId: 1, status: 1 });

export const PartnerInterest = model<IPartnerInterest>('PartnerInterest', partnerInterestSchema);
