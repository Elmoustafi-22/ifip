import { Schema, model, Document } from 'mongoose';

export interface IPlacementOpportunity extends Document {
    category: string;
    roles: string[];
    icon: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const placementOpportunitySchema = new Schema<IPlacementOpportunity>(
    {
        category: { type: String, required: true, trim: true },
        roles:    { type: [String], required: true },
        icon:     { type: String, required: true, default: 'TbBriefcase' },
        isActive: { type: Boolean, default: true },
        order:    { type: Number, default: 0 }
    },
    { timestamps: true }
);

export const PlacementOpportunity = model<IPlacementOpportunity>('PlacementOpportunity', placementOpportunitySchema);
