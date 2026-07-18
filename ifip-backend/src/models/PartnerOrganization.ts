import { Schema, model, Document, Types } from 'mongoose';
import { IPartnerOpening } from './PartnerApplication.js';

export interface IPartnerOrganization extends Document {
    name: string;
    logoUrl?: string;
    description?: string;
    sectorTags: string[];
    activeSlots: number;
    status: 'active' | 'inactive';
    contactEmail?: string;
    contactPerson?: string;
    contactPhone?: string;
    website?: string;
    cohorts: Types.ObjectId[];
    hasOpenings: boolean;
    openings: IPartnerOpening[];
    createdAt: Date;
}

const partnerOpeningSchema = new Schema<IPartnerOpening>({
    role: { type: String, required: true },
    mode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true },
    location: { type: String },
    count: { type: Number, required: true, default: 1 }
});

const partnerOrganizationSchema = new Schema<IPartnerOrganization>({
    name:          { type: String, required: true },
    logoUrl:       { type: String },
    description:   { type: String },
    sectorTags:    { type: [String], default: [] },
    activeSlots:   { type: Number, required: true, default: 5 },
    status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
    contactEmail:  { type: String },
    contactPerson: { type: String },
    contactPhone:  { type: String },
    website:       { type: String },
    cohorts:       [{ type: Schema.Types.ObjectId, ref: 'Cohort', default: [] }],
    hasOpenings:   { type: Boolean, default: false },
    openings:      { type: [partnerOpeningSchema], default: [] },
    createdAt:     { type: Date, default: Date.now },
});

export const PartnerOrganization = model<IPartnerOrganization>('PartnerOrganization', partnerOrganizationSchema);
