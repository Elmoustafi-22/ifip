import { Schema, model } from 'mongoose';

const registrationNoticeSchema = new Schema({
    key: { type: String, required: true, unique: true, default: 'registration' },
    message: { type: String, required: true, maxlength: 280 },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const RegistrationNotice = model('RegistrationNotice', registrationNoticeSchema);
