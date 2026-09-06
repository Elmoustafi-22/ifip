import { Schema, model, Document, Types } from 'mongoose';

export interface IResource extends Document {
    title: string;
    description: string;
    category: 'guidelines' | 'templates' | 'supplements';
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'xlsx' | 'link' | 'video' | 'other';
    fileSize?: string;
    cohortId?: Types.ObjectId;
    uploadedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        category: {
            type: String,
            enum: ['guidelines', 'templates', 'supplements'],
            required: true,
            default: 'guidelines',
        },
        fileUrl: { type: String, default: '', trim: true },
        fileType: {
            type: String,
            enum: ['pdf', 'docx', 'xlsx', 'link', 'video', 'other'],
            default: 'pdf',
        },
        fileSize: { type: String, default: '1.0 MB' },
        cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

resourceSchema.index({ category: 1, createdAt: -1 });
resourceSchema.index({ cohortId: 1 });

export const Resource = model<IResource>('Resource', resourceSchema);
