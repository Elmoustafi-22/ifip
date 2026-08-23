import { Schema, model, Document, Types } from 'mongoose';

export interface ICoupon extends Document {
    code: string;
    discountPercent: number;
    expiresAt: Date;
    expiredMessage: string;
    isActive: boolean;
    maxUses?: number;
    usedCount: number;
    createdByAdminId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        discountPercent: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        expiredMessage: {
            type: String,
            required: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        maxUses: {
            type: Number,
            min: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        createdByAdminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);
