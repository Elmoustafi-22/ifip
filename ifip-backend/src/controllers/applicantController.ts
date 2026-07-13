import type { Request, Response } from 'express';
import { Applicant } from '../models/Applicants.js';
import { generateOtp, verifyOtp, checkOtpSendAllowed } from '../services/otpServices.js';
import { generateResumeToken, hashToken } from '../services/tokenService.js';
import { sendOtpEmail, sendResumeLinkEmail, sendSetPasswordEmail } from '../services/emailService.js';
import { signApplicantSessionToken, signSetPasswordToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payments.js';
import { paymentReadySchema } from '../validators/applicantValidators.js';
import { env } from '../config/env.js';
import { CohortConfig } from '../models/CohortConfig.js';


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

    let applicant = await Applicant.findOne({ email });
    if (!applicant) {
        applicant = new Applicant({ email });
        applicant.refreshExpiry();
    }

    const rateLimitCheck = checkOtpSendAllowed(applicant);
    if (!rateLimitCheck.allowed) {
        res.status(429).json({
            message: rateLimitCheck.reason,
            retryAfterSeconds: rateLimitCheck.retryAfterSeconds,
        });
        return;
    }

    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const windowExpired = (now - (applicant.otpWindowStart?.getTime() ?? 0)) > windowMs;

    if (windowExpired) {
        applicant.otpSendCount = 1;
        applicant.otpWindowStart = new Date();
    } else {
        applicant.otpSendCount += 1;
    }

    const { code, hash, expiry } = generateOtp();
    applicant.otpCodeHash = hash;
    applicant.otpExpiry = expiry;
    await applicant.save();

    await sendOtpEmail(email, code);

    res.json({ message: 'Verification code sent. Please check your email.' });
};

export const verifyApplicantOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const applicant = await Applicant.findOne({ email });
    if (!applicant || !applicant.otpCodeHash || !applicant.otpExpiry) {
        res.status(400).json({ message: 'No verification pending for this email.' });
        return;
    }

    if (applicant.otpExpiry < new Date()) {
        res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
        return;
    }

    if (!verifyOtp(otp, applicant.otpCodeHash)) {
        res.status(400).json({ message: 'Incorrect verification code.' });
        return;
    }

    applicant.emailVerified = true;
    applicant.otpCodeHash = undefined;
    applicant.otpExpiry = undefined;

    const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
    applicant.resumeTokenHash = resumeTokenHash;
    applicant.refreshExpiry();
    await applicant.save();

    await sendResumeLinkEmail(email, resumeTokenRaw, applicant.isPaid);

    const sessionToken = signApplicantSessionToken(applicant.id);
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

    Object.assign(applicant, req.body);
    applicant.refreshExpiry();
    await applicant.save();

    res.json(applicant);
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

    const user = await User.create({
        email: applicant.email,
        fullName: applicant.fullName,
        phone: applicant.phone,
        dob: applicant.dob,
        gender: applicant.gender,
        country: applicant.country,
        stateCity: applicant.stateCity
    });

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
        status: 'payment_confirmed',
    });

    payment.applicationId = application._id as any;
    await payment.save();

    const setPasswordToken = signSetPasswordToken(user.id, user.email);
    try {
        await sendSetPasswordEmail(applicant.email, setPasswordToken, applicant.country);
    } catch (emailError) {
        console.error('Failed to send set-password email during submission:', emailError);
    }

    await Applicant.deleteOne({ _id: applicant._id });

    res.json({
        message: 'Application submitted successfully. Please check your email to set your password.',
        application,
        setPasswordToken
    });
};