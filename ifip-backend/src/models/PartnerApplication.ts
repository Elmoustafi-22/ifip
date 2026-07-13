import { Schema, model, Document } from 'mongoose';

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
    adminNotes?: string;
    reviewedAt?: Date;
    createdAt: Date;
}

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
    adminNotes:    { type: String },
    reviewedAt:    { type: Date },
    createdAt:     { type: Date, default: Date.now },
});

export const PartnerApplication = model<IPartnerApplication>('PartnerApplication', partnerApplicationSchema);
