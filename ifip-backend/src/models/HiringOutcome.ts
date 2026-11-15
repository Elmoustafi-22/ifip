import { Schema, Types } from 'mongoose';

export const hiringStatuses = ['selected', 'offer_extended', 'hire_confirmed', 'not_selected'] as const;

export interface HiringOutcome {
    status: typeof hiringStatuses[number];
    recordedBy: Types.ObjectId;
    recordedAt: Date;
    note: string;
}

export const hiringOutcomeSchema = new Schema<HiringOutcome>({
    status: { type: String, enum: hiringStatuses, required: true },
    recordedBy: { type: Schema.Types.ObjectId, required: true, select: false },
    recordedAt: { type: Date, required: true },
    note: { type: String, required: true, maxlength: 500, select: false },
}, { _id: false });
