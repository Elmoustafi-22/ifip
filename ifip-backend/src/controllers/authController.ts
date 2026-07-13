import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
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

// ── Shared helper: issue tokens + set refresh cookie ──────────────────
const issueTokens = (res: Response, userId: string, role: 'applicant' | 'participant' | 'admin' | 'superadmin') => {
    const accessToken = signAccessToken(userId, role);
    const refreshToken = signRefreshToken(userId);
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
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

    const { accessToken } = issueTokens(res, user.id, user.role);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
};

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────
// Reads the httpOnly refreshToken cookie and issues a new access token.
// The refresh token itself is not rotated here to keep the implementation
// simple for v1 — add rotation (delete old, issue new cookie) before production.
export const refresh = async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
        res.status(401).json({ message: 'No refresh token.' });
        return;
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(token);
    } catch {
        res.clearCookie('refreshToken');
        res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
        return;
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
        res.clearCookie('refreshToken');
        res.status(401).json({ message: 'User not found.' });
        return;
    }

    // Issue a fresh access token (and rotate the refresh cookie)
    const { accessToken } = issueTokens(res, user.id, user.role);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
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

    res.json({ message: 'Password updated successfully.' });
};