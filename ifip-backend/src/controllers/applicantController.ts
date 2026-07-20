import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Applicant } from '../models/Applicants.js';
import { generateOtp, verifyOtp } from '../services/otpServices.js';
import { generateResumeToken, hashToken } from '../services/tokenService.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { signApplicantSessionToken, signSetPasswordToken } from '../utils/jwt.js';
import { redisClient } from '../services/redisService.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payments.js';
import { Cohort } from '../models/Cohort.js';
import { paymentReadySchema } from '../validators/applicantValidators.js';
import { env } from '../config/env.js';
import { CohortConfig } from '../models/CohortConfig.js';
import { logRawAction } from '../utils/auditLogger.js';


export const getCohortStatus = async (req: Request, res: Response) => {
    try {
        const count = await Application.countDocuments({ status: { $ne: 'withdrawn' } });
        let cap = Number(env.COHORT_CAP || 100);
        const config = await CohortConfig.findOne();
        if (config && config.cohortCap !== undefined) {
            cap = config.cohortCap;
        }
        res.json({ count, cap, full: count >= cap });
    } catch {
        res.status(500).json({ message: 'Failed to fetch cohort status.' });
    }
};

export const startApplication = async (req: Request, res: Response) => {
    const { email } = req.body;

    const activeApplicationsCount = await Application.countDocuments({ status: { $ne: 'withdrawn' } });
    let cap = Number(env.COHORT_CAP || 100);
    const config = await CohortConfig.findOne();
    if (config && config.cohortCap !== undefined) {
        cap = config.cohortCap;
    }
    if (activeApplicationsCount >= cap) {
        res.status(403).json({
            code: 'COHORT_FULL',
            message: 'Batch 2026 Fall-A26 is now full. Please join the waitlist.',
        });
        return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(400).json({
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'This email is already registered. Please log in to your dashboard.',
        });
        return;
    }

    // Rate enforcement is handled upstream by otpIpLimiter + otpEmailLimiter middleware.
    // Controller is pure business logic from here.

    const { code, hash } = generateOtp();
    const otpExpiryMinutes = Number(env.OTP_EXPIRY_MINUTES || 10);
    const otpKey = `pending_otp:${email.toLowerCase()}`;

    await redisClient.set(otpKey, hash, { EX: otpExpiryMinutes * 60 });

    notificationEmitter.emit('otp.requested', { email, otp: code });

    // Audit — APPLICATION_START (fire-and-forget)
    // req.ip is now the real client IP thanks to app.set('trust proxy', 1)
    const SYSTEM_USER_ID = '000000000000000000000000';
    logRawAction({
        userId: SYSTEM_USER_ID,
        userEmail: email,
        userRole: 'applicant',
        action: 'APPLICATION_START',
        description: `New application started for "${email}" — OTP sent`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Verification code sent. Please check your email.' });
};

export const verifyApplicantOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const otpKey = `pending_otp:${email.toLowerCase()}`;
    const cachedHash = await redisClient.get(otpKey);

    if (!cachedHash) {
        res.status(400).json({ message: 'No verification pending or code expired. Please request a new one.' });
        return;
    }

    if (!verifyOtp(otp, cachedHash)) {
        res.status(400).json({ message: 'Incorrect verification code.' });
        return;
    }

    // Create or update Applicant document in MongoDB upon verification
    let applicant = await Applicant.findOne({ email });
    if (!applicant) {
        applicant = new Applicant({ email, emailVerified: true });
    } else {
        applicant.emailVerified = true;
    }

    const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
    applicant.resumeTokenHash = resumeTokenHash;
    applicant.refreshExpiry();
    await applicant.save();

    // Clean up OTP key in Redis
    await redisClient.del(otpKey);

    notificationEmitter.emit('applicant.resume', { email, token: resumeTokenRaw, isPaid: applicant.isPaid });

    const sessionToken = signApplicantSessionToken(applicant.id);

    // Audit — OTP_VERIFIED (fire-and-forget)
    const rawIpV = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const ipAddressV = Array.isArray(rawIpV) ? rawIpV[0] : (typeof rawIpV === 'string' ? rawIpV.split(',')[0].trim() : undefined);
    logRawAction({
        userId: applicant.id,
        userEmail: applicant.email,
        userRole: 'applicant',
        action: 'OTP_VERIFIED',
        description: `Email OTP verified for "${applicant.email}" — application session started`,
        ipAddress: ipAddressV,
        userAgent: req.headers['user-agent'],
        targetId: applicant.id,
        targetType: 'Applicant',
    });

    res.json({ sessionToken, applicant });
};

export const resumeApplication = async (req: Request, res: Response) => {
    const { token } = req.body;
    const tokenHash = hashToken(token);

    const applicant = await Applicant.findOne({ resumeTokenHash: tokenHash });
    if (!applicant) {
        res.status(404).json({ message: 'This resume link is invalid or has expired.' });
        return;
    }

    applicant.refreshExpiry();
    await applicant.save();

    const sessionToken = signApplicantSessionToken(applicant.id);
    res.json({ sessionToken, applicant });
};

export const getMyApplicant = async (req: Request, res: Response) => {
    const applicant = await Applicant.findById(req.applicant!.id);
    if (!applicant) {
        res.status(404).json({ message: 'Session expired — please resume via your email link.' });
        return;
    }
    res.json(applicant);
};

export const updateMyApplicant = async (req: Request, res: Response) => {
    const applicant = await Applicant.findById(req.applicant!.id);
    if (!applicant) {
        res.status(404).json({ message: 'Session expired — please resume via your email link.' });
        return;
    }

    // --- Strict field whitelist (mass-assignment protection) ---
    // Only form-step fields may be written via this endpoint.
    // System-controlled fields (isPaid, cohortId, checkoutStartedAt, expiresAt,
    // emailVerified, resumeTokenHash, email) are never
    // accepted from the request body — any attempt to send them is silently ignored.
    const ALLOWED_FIELDS = [
        'fullName', 'phone', 'dob', 'gender', 'country', 'stateCity',
        'academicInfo', 'programInterest', 'skills', 'motivation',
        'cvUrl', 'linkedinUrl', 'portfolioUrl', 'leadSource',
        'levyAcknowledged', 'declaration', 'currentStep',
    ] as const;

    for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
            (applicant as any)[field] = req.body[field];
        }
    }

    applicant.refreshExpiry();
    await applicant.save();

    res.json(applicant);
};

export const executeApplicationSubmission = async (applicantId: Types.ObjectId | string, paymentId: Types.ObjectId | string) => {
    const applicant = await Applicant.findById(applicantId);
    if (!applicant) {
        throw new Error('Applicant not found.');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'success') {
        throw new Error('Payment verification is required.');
    }

    let user = await User.findOne({ email: applicant.email });
    if (!user) {
        user = await User.create({
            email: applicant.email,
            fullName: applicant.fullName,
            phone: applicant.phone,
            dob: applicant.dob,
            gender: applicant.gender,
            country: applicant.country,
            stateCity: applicant.stateCity
        });
    }

    const application = await Application.create({
        userId: user._id,
        paymentId: payment._id,
        fullName: applicant.fullName,
        phone: applicant.phone,
        dob: applicant.dob,
        gender: applicant.gender,
        country: applicant.country,
        stateCity: applicant.stateCity,
        academicInfo: applicant.academicInfo,
        programInterest: applicant.programInterest,
        skills: applicant.skills,
        motivation: applicant.motivation,
        cvUrl: applicant.cvUrl,
        linkedinUrl: applicant.linkedinUrl,
        portfolioUrl: applicant.portfolioUrl,
        leadSource: applicant.leadSource,
        levyAcknowledged: applicant.levyAcknowledged,
        declaration: applicant.declaration,
        cohortId: applicant.cohortId,
        status: 'active',
    });

    user.role = 'participant';
    await user.save();

    payment.applicationId = application._id as any;
    await payment.save();

    const setPasswordToken = signSetPasswordToken(user.id, user.email);
    notificationEmitter.emit('application.submitted', { email: applicant.email, setPasswordToken, country: applicant.country });
    
    const cohort = await Cohort.findById(applicant.cohortId);
    if (cohort) {
        notificationEmitter.emit('cohort.assigned', { user, cohort });
    }

    notificationEmitter.emit('application.enrolled', { user, application });

    await Applicant.deleteOne({ _id: applicant._id });

    return { application, setPasswordToken };
};

export const submitApplication = async (req: Request, res: Response) => {
    const applicant = await Applicant.findById(req.applicant!.id);
    if (!applicant) {
        res.status(404).json({ message: 'Session expired — please resume via your email link.' });
        return;
    }

    const validation = paymentReadySchema.safeParse(applicant.toObject());
    if (!validation.success) {
        res.status(400).json({
            message: 'Application is incomplete. Please finish all sections before submitting.',
            errors: validation.error.flatten(),
        });
        return;
    }

    const payment = await Payment.findOne({ applicantId: applicant._id, status: 'success' });
    if (!payment) {
        res.status(402).json({
            message: 'Payment not found or is still pending verification. Please make the payment first.',
        });
        return;
    }

    try {
        const { application, setPasswordToken } = await executeApplicationSubmission(
            applicant._id,
            payment._id
        );

        // Audit — APPLICATION_SUBMIT (fire-and-forget)
        const rawIpS = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const ipAddressS = Array.isArray(rawIpS) ? rawIpS[0] : (typeof rawIpS === 'string' ? rawIpS.split(',')[0].trim() : undefined);
        logRawAction({
            userId: application.userId.toString(),
            userEmail: applicant.email,
            userRole: 'applicant',
            action: 'APPLICATION_SUBMIT',
            description: `Application submitted for "${applicant.email}" — payment confirmed, account created`,
            ipAddress: ipAddressS,
            userAgent: req.headers['user-agent'],
            targetId: application.id,
            targetType: 'Application',
        });

        res.json({
            message: 'Application submitted successfully. Please check your email to set your password.',
            application,
            setPasswordToken
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'An error occurred during submission.' });
    }
};