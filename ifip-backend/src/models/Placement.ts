import { Schema, model, Document, Types } from 'mongoose';

export interface IPlacement extends Document {
    userId: Types.ObjectId;
    partnerOrgId: Types.ObjectId;
    areaOfInterest?: string;
    status: 'matched' | 'interviewing' | 'placed' | 'declined';
    notes?: string;
    // Partner-specific fields (not visible to intern or admin unless specified)
    partnerNotes?: string;
    interviewScheduledAt?: Date;
    interviewFormat?: 'Video' | 'Call' | 'In-person';
    partnerOutcome?: 'offer_extended' | 'not_selected';
    createdAt: Date;
}

const placementSchema = new Schema<IPlacement>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    partnerOrgId: { type: Schema.Types.ObjectId, ref: 'PartnerOrganization', required: true },
    areaOfInterest: { type: String },
    status: {
        type: String,
        enum: ['matched', 'interviewing', 'placed', 'declined'],
        default: 'matched',
        required: true
    },
    notes: { type: String },
    partnerNotes: { type: String },
    interviewScheduledAt: { type: Date },
    interviewFormat: { type: String, enum: ['Video', 'Call', 'In-person'] },
    partnerOutcome: { type: String, enum: ['offer_extended', 'not_selected'] },
    createdAt: { type: Date, default: Date.now }
});

export const Placement = model<IPlacement>('Placement', placementSchema);
