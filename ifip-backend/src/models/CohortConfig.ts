import { Schema, model, Document } from 'mongoose';

export interface ICohortConfig extends Document {
    cohortStartDate: Date;
    cohortCap: number;
    dashboardViewOverride: 'default' | 'coming_soon' | 'unlocked';
    brochureUrl?: string;
    updatedAt: Date;
}

const cohortConfigSchema = new Schema<ICohortConfig>({
    cohortStartDate: { type: Date, required: true },
    cohortCap: { type: Number, required: true, default: 100 },
    dashboardViewOverride: { type: String, enum: ['default', 'coming_soon', 'unlocked'], default: 'default' },
    brochureUrl: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

export const CohortConfig = model<ICohortConfig>('CohortConfig', cohortConfigSchema);
