import { Schema, model, Document } from 'mongoose';

export interface ICohortConfig extends Document {
    cohortStartDate: Date;
    cohortCap: number;
    dashboardViewOverride: 'default' | 'coming_soon' | 'unlocked';
    updatedAt: Date;
}

const cohortConfigSchema = new Schema<ICohortConfig>({
    cohortStartDate: { type: Date, required: true },
    cohortCap: { type: Number, required: true, default: 100 },
    dashboardViewOverride: { type: String, enum: ['default', 'coming_soon', 'unlocked'], default: 'default' },
    updatedAt: { type: Date, default: Date.now }
});

export const CohortConfig = model<ICohortConfig>('CohortConfig', cohortConfigSchema);
