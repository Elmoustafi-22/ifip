import { Schema, model, Document } from 'mongoose';

export interface ICohort extends Document {
    name: string;
    startDate: Date;
    endDate: Date;
    status: 'upcoming' | 'active' | 'completed';
    registrationStartDate: Date;
    registrationEndDate: Date;
    cohortCap: number;
    totalWeeks: number; // Programme length in weeks (extendable beyond the default 4)
    createdAt: Date;
}

const cohortSchema = new Schema<ICohort>({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
    registrationStartDate: { type: Date, required: true, default: Date.now },
    registrationEndDate: { type: Date, required: true, default: function(this: any) { return this.startDate || Date.now(); } },
    cohortCap: { type: Number, required: true, default: 100 },
    totalWeeks: { type: Number, min: 1, max: 52, default: 4 },
    createdAt: { type: Date, default: Date.now }
});

export const Cohort = model<ICohort>('Cohort', cohortSchema);
