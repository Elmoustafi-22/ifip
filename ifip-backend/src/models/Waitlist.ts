import { Schema, model, Document } from 'mongoose';

export interface IWaitlist extends Document {
    email: string;
    createdAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const Waitlist = model<IWaitlist>('Waitlist', waitlistSchema);
