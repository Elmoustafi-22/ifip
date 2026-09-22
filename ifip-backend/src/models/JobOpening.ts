import { Schema, model, Document, Types } from 'mongoose';

export type JobOpeningStatus = 'pending_review' | 'open' | 'closed' | 'rejected';
export type JobWorkMode = 'Remote' | 'Hybrid' | 'On-site';

export interface IJobOpening extends Document {
    partnerOrgId: Types.ObjectId;
    createdByUserId?: Types.ObjectId;
    title: string;
    description: string;
    department?: string;
    workMode: JobWorkMode;
    location?: string;
    slots: number;
    requirements: string[];
    adminRequirements: string[];
    qualifications?: string;
    status: JobOpeningStatus;
    adminNotes?: string;
    applicationDeadline?: Date;
    migratedFromOpeningId?: string;
    openedAt?: Date;
    closedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const jobOpeningSchema = new Schema<IJobOpening>(
    {
        partnerOrgId: { type: Schema.Types.ObjectId, ref: 'PartnerOrganization', required: true },
        createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        department: { type: String, trim: true },
        workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true },
        location: { type: String, trim: true },
        slots: { type: Number, default: 1, min: 1 },
        requirements: { type: [String], default: [] },
        adminRequirements: { type: [String], default: [] },
        qualifications: { type: String },
        status: {
            type: String,
            enum: ['pending_review', 'open', 'closed', 'rejected'],
            default: 'pending_review',
            required: true,
        },
        adminNotes: { type: String },
        applicationDeadline: { type: Date },
        migratedFromOpeningId: { type: String },
        openedAt: { type: Date },
        closedAt: { type: Date },
    },
    { timestamps: true }
);

jobOpeningSchema.index({ partnerOrgId: 1, status: 1 });
jobOpeningSchema.index({ status: 1, createdAt: -1 });
jobOpeningSchema.index({ migratedFromOpeningId: 1 }, { unique: true, sparse: true });

export const JobOpening = model<IJobOpening>('JobOpening', jobOpeningSchema);
