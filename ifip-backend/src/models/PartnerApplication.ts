import { Schema, model, Document } from 'mongoose';

export interface IPartnerOpening {
    role: string;
    mode: 'Remote' | 'Hybrid' | 'On-site';
    location?: string;
    count: number;
}

export interface IPartnerApplication extends Document {
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    contactPerson: string;
    website?: string;
    sectorTags: string[];
    description?: string;
    activeSlots: number;
    logoUrl?: string;
    status: 'pending' | 'approved' | 'declined';
    hasOpenings: boolean;
    openings: IPartnerOpening[];
    adminNotes?: string;
    reviewedAt?: Date;
    createdAt: Date;
}

const partnerOpeningSchema = new Schema<IPartnerOpening>({
    role: { type: String, required: true },
    mode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true },
    location: { type: String },
    count: { type: Number, required: true, default: 1 }
});

const partnerApplicationSchema = new Schema<IPartnerApplication>({
    companyName:   { type: String, required: true },
    contactEmail:  { type: String, required: true },
    contactPhone:  { type: String, required: true },
    contactPerson: { type: String, required: true },
    website:       { type: String },
    sectorTags:    { type: [String], default: [] },
    description:   { type: String },
    activeSlots:   { type: Number, default: 0 },
    logoUrl:       { type: String },
    status:        { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    hasOpenings:   { type: Boolean, default: false },
    openings:      { type: [partnerOpeningSchema], default: [] },
    adminNotes:    { type: String },
    reviewedAt:    { type: Date },
    createdAt:     { type: Date, default: Date.now },
});

export const PartnerApplication = model<IPartnerApplication>('PartnerApplication', partnerApplicationSchema);
