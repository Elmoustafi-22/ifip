import { Schema, model, Document, Types } from 'mongoose';

export interface IPartnerOrganization extends Document {
    name: string;
    logoUrl?: string;
    description?: string;
    sectorTags: string[];
    activeSlots: number;
    status: 'active' | 'inactive';
    contactEmail?: string;
    contactPerson?: string;
    website?: string;
    cohorts: Types.ObjectId[];
    createdAt: Date;
}

const partnerOrganizationSchema = new Schema<IPartnerOrganization>({
    name:          { type: String, required: true },
    logoUrl:       { type: String },
    description:   { type: String },
    sectorTags:    { type: [String], default: [] },
    activeSlots:   { type: Number, required: true, default: 5 },
    status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
    contactEmail:  { type: String },
    contactPerson: { type: String },
    website:       { type: String },
    cohorts:       [{ type: Schema.Types.ObjectId, ref: 'Cohort', default: [] }],
    createdAt:     { type: Date, default: Date.now },
});

export const PartnerOrganization = model<IPartnerOrganization>('PartnerOrganization', partnerOrganizationSchema);
