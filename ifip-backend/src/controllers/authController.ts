import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/User.js';
import {
    signAccessToken,
    signRefreshToken,
    signResetPasswordToken,
    verifyRefreshToken,
    verifyResetPasswordToken,
    verifySetPasswordToken,
} from '../utils/jwt.js';
import { env } from '../config/env.js';
import type {
    SetPasswordInput,
    LoginInput,
    ForgotPasswordInput,
    ResetPasswordInput,
} from '../validators/authValidators.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { logRawAction } from '../utils/auditLogger.js';

// ── Shared helper: issue tokens + set refresh cookie ──────────────────
const getCookieOptions = () => {
    const isProd = env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for all users/admins
        path: '/',
    };
};

const issueTokens = (res: Response, userId: string, role: 'applicant' | 'participant' | 'admin' | 'superadmin') => {
    const accessToken = signAccessToken(userId, role);
    const refreshExpiry = '7d';

    const refreshToken = signRefreshToken(userId, refreshExpiry);
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return { accessToken, refreshToken };
};

// ── POST /api/v1/auth/set-password ────────────────────────────────────
export const setPassword = async (req: Request<{}, {}, SetPasswordInput>, res: Response) => {
    const { token, password } = req.body;

    let decoded;
    try {
        decoded = verifySetPasswordToken(token);
    } catch {
        res.status(400).json({ message: 'This link is invalid or has expired.' });
        return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        res.status(404).json({ message: 'Account not found.' });
        return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = issueTokens(res, user.id, user.role);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
};

// ── GET /api/v1/auth/token-info ──────────────────────────────────────
// Decodes a set-password token and retrieves the associated user's email.
export const getTokenInfo = async (req: Request, res: Response) => {
    const { token } = req.query;
    if (typeof token !== 'string') {
        res.status(400).json({ message: 'Token query parameter is required.' });
        return;
    }

    try {
        const decoded = verifySetPasswordToken(token);
        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.json({ email: user.email });
    } catch {
        res.status(400).json({ message: 'Invalid or expired token.' });
    }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────
export const login = async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ message: 'Invalid credentials.' });
        return;
    }

    if (user.mfaEnabled) {
        const mfaToken = jwt.sign(
            { sub: user.id, purpose: 'mfa-verify' },
            env.JWT_ACCESS_SECRET,
            { expiresIn: '3m' }
        );
        res.json({ mfaRequired: true, mfaToken });
        return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = issueTokens(res, user.id, user.role);

    // Audit — fire-and-forget, do not block the response
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined);
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    logRawAction({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: isAdmin ? 'ADMIN_LOGIN' : 'USER_LOGIN',
        description: `${isAdmin ? 'Admin' : 'User'} "${user.email}" signed in successfully`,
        ipAddress,
        userAgent: req.headers['user-agent'],
    });

    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
};

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────
// Reads the httpOnly refreshToken cookie and issues a new access token.
// The refresh token itself is not rotated here to keep the implementation
// simple for v1 — add rotation (delete old, issue new cookie) before production.
export const refresh = async (req: Request, res: Response) => {
    const token = (
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string)
    ) as string | undefined;

    if (!token) {
        res.status(401).json({ message: 'No refresh token.' });
        return;
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(token);
    } catch {
        res.clearCookie('refreshToken', getCookieOptions());
        res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
        return;
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
        res.clearCookie('refreshToken', getCookieOptions());
        res.status(401).json({ message: 'User not found.' });
        return;
    }

    // Issue a fresh access token (and rotate the refresh cookie/token)
    const { accessToken } = issueTokens(res, user.id, user.role);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
};

// ── POST /api/v1/auth/logout ──────────────────────────────────────────
export const logout = async (_req: Request, res: Response) => {
    res.clearCookie('refreshToken', getCookieOptions());
    res.json({ message: 'Logged out successfully.' });
};

// ── POST /api/v1/auth/forgot-password ────────────────────────────────
// Always returns 200 regardless of whether the email exists — prevents
// user enumeration. The reset link is delivered by email only.
export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    // Respond immediately regardless of whether the user exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    // Fire-and-forget after responding — avoids leaking timing differences
    if (user && user.passwordHash) {
        const resetToken = signResetPasswordToken(user.id);
        await sendPasswordResetEmail(user.email, resetToken);
    }
};

// ── POST /api/v1/auth/reset-password ─────────────────────────────────
export const resetPassword = async (req: Request<{}, {}, ResetPasswordInput>, res: Response) => {
    const { token, password } = req.body;

    let decoded;
    try {
        decoded = verifyResetPasswordToken(token);
    } catch {
        res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
        return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        res.status(404).json({ message: 'Account not found.' });
        return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    notificationEmitter.emit('auth.password_changed', { user });

    // Log the user in immediately after resetting
    const { accessToken } = issueTokens(res, user.id, user.role);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
};

// ── POST /api/v1/auth/change-password ─────────────────────────────────
// Internal password update for authenticated users.
export const changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ message: 'Current password and new password are required.' });
        return;
    }

    if (newPassword.length < 8) {
        res.status(400).json({ message: 'New password must be at least 8 characters long.' });
        return;
    }

    const user = await User.findById(req.user!.id);
    if (!user || !user.passwordHash) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        res.status(400).json({ message: 'Incorrect current password.' });
        return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    notificationEmitter.emit('auth.password_changed', { user });

    res.json({ message: 'Password updated successfully.' });
};

// ── POST /api/v1/auth/login/mfa-verify ────────────────────────────────
export const loginMfaVerify = async (req: Request, res: Response) => {
    try {
        const { mfaToken, code } = req.body;
        if (!mfaToken || !code) {
            res.status(400).json({ message: 'mfaToken and code are required.' });
            return;
        }

        let decoded: any;
        try {
            decoded = jwt.verify(mfaToken, env.JWT_ACCESS_SECRET);
            if (decoded.purpose !== 'mfa-verify') {
                throw new Error('Invalid token purpose');
            }
        } catch (err) {
            res.status(401).json({ message: 'Invalid or expired login session.' });
            return;
        }

        const user = await User.findById(decoded.sub);
        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            res.status(400).json({ message: 'MFA is not enabled for this user.' });
            return;
        }

        const verifiedResult = verifySync({
            token: code,
            secret: user.mfaSecret
        });

        if (!verifiedResult || !verifiedResult.valid) {
            res.status(401).json({ message: 'Invalid verification code.' });
            return;
        }

        user.lastLoginAt = new Date();
        await user.save();

        const { accessToken } = issueTokens(res, user.id, user.role);
        res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
    } catch (e: any) {
        res.status(500).json({ message: 'Error verifying code.', error: e.message });
    }
};

// ── GET /api/v1/auth/mfa/setup ────────────────────────────────────────
export const mfaSetup = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        const tempSecret = generateSecret();
        const otpauthUrl = generateURI({
            label: user.email,
            issuer: 'IFIP Platform',
            secret: tempSecret
        });

        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

        res.json({
            secret: tempSecret,
            qrCode: qrCodeUrl
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error setting up MFA.', error: e.message });
    }
};

// ── POST /api/v1/auth/mfa/enable ──────────────────────────────────────
export const mfaEnable = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { secret, code } = req.body;

        if (!secret || !code) {
            res.status(400).json({ message: 'secret and code are required.' });
            return;
        }

        const verifiedResult = verifySync({
            token: code,
            secret
        });

        if (!verifiedResult || !verifiedResult.valid) {
            res.status(400).json({ message: 'Invalid verification code.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        user.mfaSecret = secret;
        user.mfaEnabled = true;
        await user.save();

        res.json({ message: 'MFA enabled successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error enabling MFA.', error: e.message });
    }
};

// ── POST /api/v1/auth/mfa/disable ─────────────────────────────────────
export const mfaDisable = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ message: 'Verification code is required to disable MFA.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        if (!user.mfaEnabled || !user.mfaSecret) {
            res.status(400).json({ message: 'MFA is not enabled.' });
            return;
        }

        const verifiedResult = verifySync({
            token: code,
            secret: user.mfaSecret
        });

        if (!verifiedResult || !verifiedResult.valid) {
            res.status(400).json({ message: 'Invalid verification code.' });
            return;
        }

        user.mfaSecret = undefined;
        user.mfaEnabled = false;
        await user.save();

        res.json({ message: 'MFA disabled successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error disabling MFA.', error: e.message });
    }
};

// ── PATCH /api/v1/auth/profile ────────────────────────────────────────
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { fullName, title, avatarUrl } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (title !== undefined) user.title = title;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
        await user.save();

        res.json({
            message: 'Profile updated successfully.',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                title: user.title,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating profile.', error: e.message });
    }
};