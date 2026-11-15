import { Schema, model } from 'mongoose';

const schema = new Schema({
    // One deterministic identifier per cohort and waitlist entry.
    _id: { type: String, required: true },
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort', required: true, index: true },
    waitlistId: { type: Schema.Types.ObjectId, ref: 'Waitlist', required: true },
    status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
}, { timestamps: true });

export const CohortWaitlistDelivery = model('CohortWaitlistDelivery', schema);
