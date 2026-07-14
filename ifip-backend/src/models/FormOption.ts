import { Schema, model, Document } from 'mongoose';

export type FormOptionGroup = 'placement_interests' | 'academic_status' | 'sector_tags';

export interface IFormOption extends Document {
    group: FormOptionGroup;
    label: string;
    value: string;
    order: number;
    isActive: boolean;
}

const formOptionSchema = new Schema<IFormOption>(
    {
        group:    { type: String, required: true, index: true },
        label:    { type: String, required: true, trim: true },
        value:    { type: String, required: true, trim: true },
        order:    { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Prevent duplicate values within the same group
formOptionSchema.index({ group: 1, value: 1 }, { unique: true });

export const FormOption = model<IFormOption>('FormOption', formOptionSchema);
