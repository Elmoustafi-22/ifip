import { Schema, model, Document } from 'mongoose';

export interface IContentVersion extends Document {
    key: string;
    lastUpdated: Date;
}

const contentVersionSchema = new Schema<IContentVersion>(
    {
        key:         { type: String, required: true, unique: true, index: true },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const ContentVersion = model<IContentVersion>('ContentVersion', contentVersionSchema);
