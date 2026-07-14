import { Schema, model, Document } from 'mongoose';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export interface IActiveOpening extends Document {
    title: string;
    department: string;
    workMode: WorkMode;
    location: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const activeOpeningSchema = new Schema<IActiveOpening>(
    {
        title:      { type: String, required: true, trim: true },
        department: { type: String, required: true, trim: true },
        workMode:   { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true },
        location:   { type: String, required: true, trim: true },
        isActive:   { type: Boolean, default: true },
        order:      { type: Number, default: 0 }
    },
    { timestamps: true }
);

export const ActiveOpening = model<IActiveOpening>('ActiveOpening', activeOpeningSchema);
