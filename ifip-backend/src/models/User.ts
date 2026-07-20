import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'applicant' | 'participant' | 'admin' | 'superadmin';

export interface IUser extends Document {
    email: string;
    passwordHash?: string; // absent until set post-payment
    role: UserRole;
    emailVerified: boolean;
    fullName?: string;
    phone?: string;
    dob?: Date;
    gender?: string;
    country?: string;
    stateCity?: string;
    title?: string;
    avatarUrl?: string;
    mfaEnabled: boolean;
    mfaSecret?: string;
    lastLoginAt?: Date;
    comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String },
        role: { type: String, enum: ['applicant', 'participant', 'admin', 'superadmin'], default: 'applicant' },
        emailVerified: { type: Boolean, default: true },
        fullName: { type: String },
        phone: { type: String },
        dob: { type: Date },
        gender: { type: String },
        country: { type: String },
        stateCity: { type: String },
        title: { type: String },
        avatarUrl: { type: String },
        mfaEnabled: { type: Boolean, default: false },
        mfaSecret: { type: String },
        lastLoginAt: { type: Date },
    },
    { timestamps: true }
);

userSchema.methods.comparePassword = function (this: IUser, candidate: string) {
    if (!this.passwordHash) return Promise.resolve(false);
    return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>('User', userSchema);