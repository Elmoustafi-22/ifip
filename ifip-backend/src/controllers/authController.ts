import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { User, type UserRole } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import {
    signAccessToken,
    signRefreshToken,
    signResetPasswordToken,
    verifyRefreshToken,
    verifyResetPasswordToken,
    verifySetPasswordToken,
    type AdminSessionProof,
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
import { logAction, logRawAction } from '../utils/auditLogger.js';
import { adminPasswordBinding, beginAdminMfa, isAdminRole, validAdminSession, verifyAdminAuthenticator } from '../services/adminMfa.js';

// ── Shared helper: issue tokens + set refresh cookie ──────────────────
const getCookieOptions = (req?: Request, maxAge = 7 * 24 * 60 * 60 * 1000) => {
    const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
    const isSecure = isProd || Boolean(req && (req.secure || req.headers['x-forwarded-proto'] === 'https'));
    const options: any = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge,
        path: '/',
    };
    if (env.COOKIE_DOMAIN) {
        options.domain = env.COOKIE_DOMAIN;
    }
    return options;
};

const issueTokens = (res: Response, userId: string, role: UserRole, req?: Request, proof?: AdminSessionProof) => {
    if (isAdminRole(role) && !proof) throw new Error('Admin token issuance requires MFA');
    const accessToken = signAccessToken(userId, role, proof);
    const refreshExpiry = proof ? '8h' : '7d';

    const refreshToken = signRefreshToken(userId, refreshExpiry, proof);
    res.cookie('refreshToken', refreshToken, getCookieOptions(req, proof ? 8 * 60 * 60 * 1000 : undefined));
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

    if (isAdminRole(user.role)) {
        try {
            verifySetPasswordToken(token, env.SET_PASSWORD_TOKEN_EXPIRY);
        } catch {
            res.status(400).json({ message: 'This admin invitation has expired. Ask a superadmin to send a new invitation.' });
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await User.updateOne(
            { _id: user.id, role: user.role, passwordHash: null },
            { $set: { passwordHash } },
        );
        if (!result.modifiedCount) {
            res.status(400).json({ message: 'This admin invitation was already used. Sign in or reset your password.' });
            return;
        }
        res.clearCookie('refreshToken', getCookieOptions(req));
        res.json({ signInRequired: true });
        return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.lastLoginAt = new Date();
    await user.save();

    // Trigger welcome notification & welcome email for account completion
    notificationEmitter.emit('auth.password_set', { user });

    const { accessToken, refreshToken } = issueTokens(res, user.id, user.role, req);
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
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
        if (isAdminRole(user.role)) verifySetPasswordToken(token, env.SET_PASSWORD_TOKEN_EXPIRY);
        res.json({ email: user.email, role: user.role });
    } catch {
        res.status(400).json({ message: 'Invalid or expired token.' });
    }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────
export const login = async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const rawEmail = req.body.email || '';
    const email = rawEmail.trim().toLowerCase();
    const { password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(401).json({ message: 'Invalid credentials.' });
        return;
    }

    if (!user.passwordHash) {
        res.status(401).json({ message: 'Your password has not been set yet. Please check your email for the password setup link, or click "Forgot Password?" to set your password.' });
        return;
    }

    if (!(await user.comparePassword(password))) {
        res.status(401).json({ message: 'Invalid credentials.' });
        return;
    }

    if (isAdminRole(user.role)) {
        await beginAdminMfa(user, res);
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

    const { accessToken, refreshToken } = issueTokens(res, user.id, user.role, req);

    // Audit — fire-and-forget, do not block the response
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined);
    logRawAction({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'USER_LOGIN',
        description: `User "${user.email}" signed in successfully`,
        ipAddress,
        userAgent: req.headers['user-agent'],
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
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
        res.clearCookie('refreshToken', getCookieOptions(req));
        res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
        return;
    }

    const user = await User.findById(decoded.sub).select('+mfaSecret');
    if (!user) {
        res.clearCookie('refreshToken', getCookieOptions(req));
        res.status(401).json({ message: 'User not found.' });
        return;
    }

    let proof: AdminSessionProof | undefined;
    if (isAdminRole(user.role)) {
        if (!validAdminSession(user, decoded)) {
            res.clearCookie('refreshToken', getCookieOptions(req));
            res.status(401).json({ message: 'Sign in again with your authenticator.' });
            return;
        }
        proof = { mfaAt: decoded.mfaAt, adminBinding: decoded.adminBinding };
    } else if (decoded.adminBinding) {
        res.clearCookie('refreshToken', getCookieOptions(req));
        res.status(401).json({ message: 'Your account role changed. Sign in again.' });
        return;
    }

    const { accessToken, refreshToken: newRefreshToken } = issueTokens(res, user.id, user.role, req, proof);
    res.json({ accessToken, ...(proof ? {} : { refreshToken: newRefreshToken }), user: { id: user.id, email: user.email, role: user.role } });
};

// ── POST /api/v1/auth/logout ──────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
    res.clearCookie('refreshToken', getCookieOptions(req));
    res.json({ message: 'Logged out successfully.' });
};

// ── POST /api/v1/auth/forgot-password ────────────────────────────────
// Always returns 200 regardless of whether the email exists — prevents
// user enumeration. The reset link is delivered by email only.
export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
    const rawEmail = req.body.email || '';
    const email = rawEmail.trim().toLowerCase();

    const user = await User.findOne({ email });

    // Respond immediately regardless of whether the user exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    // Fire-and-forget after responding — avoids leaking timing differences
    if (user) {
        const resetToken = signResetPasswordToken(user.id, isAdminRole(user.role) ? adminPasswordBinding(user) : undefined);
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

    const admin = isAdminRole(user.role);
    if (admin && decoded.adminResetBinding !== adminPasswordBinding(user)) {
        res.status(400).json({ message: 'This link is invalid or already used. Request a new password reset link.' });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    if (admin) {
        const result = await User.updateOne(
            { _id: user.id, role: user.role, passwordHash: user.passwordHash ?? null },
            { $set: { passwordHash }, $unset: { adminMfaChallenge: 1 } },
        );
        if (!result.modifiedCount) {
            res.status(400).json({ message: 'This password reset link was already used.' });
            return;
        }
    } else {
        user.passwordHash = passwordHash;
        await user.save();
    }
    notificationEmitter.emit('auth.password_changed', { user });

    await logRawAction({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PASSWORD_RESET',
        description: 'Account password was reset via email verification link',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        targetId: user.id,
        targetType: 'User',
    });

    if (admin) {
        res.clearCookie('refreshToken', getCookieOptions(req));
        res.json({ signInRequired: true });
        return;
    }

    // Log the user in immediately after resetting
    const { accessToken } = issueTokens(res, user.id, user.role, req);
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

    const newHash = await bcrypt.hash(newPassword, 12);
    if (isAdminRole(user.role)) {
        const result = await User.updateOne(
            { _id: user.id, role: user.role, passwordHash: user.passwordHash },
            { $set: { passwordHash: newHash }, $unset: { adminMfaChallenge: 1 } },
        );
        if (!result.modifiedCount) {
            res.status(409).json({ message: 'Your credentials changed. Sign in again before changing your password.' });
            return;
        }
    } else {
        user.passwordHash = newHash;
        await user.save();
    }
    notificationEmitter.emit('auth.password_changed', { user });

    await logAction(
        req,
        'PASSWORD_CHANGE',
        'User changed account password',
        { targetId: user._id.toString(), targetType: 'User' }
    );

    res.json({ message: 'Password updated successfully.' });
};

// ── POST /api/v1/auth/login/mfa-verify ────────────────────────────────
async function completeAdminMfa(req: Request, res: Response, phase: 'login' | 'setup') {
    const { mfaToken, code } = req.body ?? {};
    const result = await verifyAdminAuthenticator(mfaToken, code, phase);
    if (!result) {
        res.status(401).json({ message: 'The authenticator code is incorrect, was already used, or the sign-in challenge expired.' });
        return;
    }
    const { user, proof } = result;
    const { accessToken } = issueTokens(res, user.id, user.role, req, proof);
    logRawAction({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: phase === 'setup' ? 'ADMIN_MFA_ENROLLED' : 'ADMIN_LOGIN',
        description: phase === 'setup' ? 'Admin authenticator enrolled' : 'Admin signed in with an authenticator',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    res.set('Cache-Control', 'no-store').json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
}

export const completeAdminMfaSetup = (req: Request, res: Response) => completeAdminMfa(req, res, 'setup');

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
            if (decoded.purpose !== 'mfa-verify' && decoded.purpose !== 'admin-mfa-login') {
                throw new Error('Invalid token purpose');
            }
        } catch (err) {
            res.status(401).json({ message: 'Invalid or expired login session.' });
            return;
        }

        if (decoded.purpose === 'admin-mfa-login') {
            await completeAdminMfa(req, res, 'login');
            return;
        }

        const user = await User.findById(decoded.sub).select('+mfaSecret');
        if (!user || isAdminRole(user.role) || !user.mfaEnabled || !user.mfaSecret) {
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

        const { accessToken, refreshToken } = issueTokens(res, user.id, user.role, req);
        res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
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

        if (isAdminRole(user.role) || user.mfaEnabled) {
            res.status(403).json({ message: 'Authenticator setup is unavailable for this session.' });
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

        if (isAdminRole(user.role) || user.mfaEnabled) {
            res.status(403).json({ message: 'An existing or mandatory authenticator cannot be replaced here.' });
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

        const user = await User.findById(userId).select('+mfaSecret');
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        if (isAdminRole(user.role)) {
            res.status(403).json({ message: 'MFA is required for administrator accounts.' });
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
        const { fullName, title, avatarUrl, emailNotificationsEnabled } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        const updatedFields: string[] = [];
        if (fullName !== undefined) {
            user.fullName = fullName;
            updatedFields.push('fullName');
        }
        if (title !== undefined) {
            user.title = title;
            updatedFields.push('title');
        }
        if (avatarUrl !== undefined) {
            user.avatarUrl = avatarUrl;
            updatedFields.push('avatarUrl');
        }
        if (emailNotificationsEnabled !== undefined) {
            user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);
            updatedFields.push('emailNotificationsEnabled');
            if (user.orgId) {
                await PartnerOrganization.findByIdAndUpdate(user.orgId, {
                    emailNotificationsEnabled: user.emailNotificationsEnabled,
                });
            }
        }
        await user.save();

        if (updatedFields.length > 0) {
            await logAction(
                req,
                'USER_PROFILE_UPDATE',
                `Updated account profile: ${updatedFields.join(', ')}`,
                { targetId: user._id.toString(), targetType: 'User' }
            );
        }

        res.json({
            message: 'Profile updated successfully.',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                title: user.title,
                role: user.role,
                avatarUrl: user.avatarUrl,
                emailNotificationsEnabled: user.emailNotificationsEnabled !== false,
            }
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating profile.', error: e.message });
    }
};

// ── PATCH /api/v1/auth/notification-preferences ─────────────────────────
export const updateNotificationPreferences = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { emailNotificationsEnabled } = req.body;

        if (typeof emailNotificationsEnabled !== 'boolean') {
            res.status(400).json({ message: 'emailNotificationsEnabled must be a boolean.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        user.emailNotificationsEnabled = emailNotificationsEnabled;
        await user.save();

        // If this user is linked to a partner organisation, keep the org preference in sync
        if (user.orgId) {
            await PartnerOrganization.findByIdAndUpdate(user.orgId, {
                emailNotificationsEnabled,
            });
        }

        await logAction(
            req,
            'NOTIFICATION_PREFERENCES_UPDATE',
            `Set email notifications to ${emailNotificationsEnabled ? 'enabled' : 'disabled'}`,
            { targetId: user._id.toString(), targetType: 'User' }
        );

        res.json({
            message: `Email notifications ${emailNotificationsEnabled ? 'enabled' : 'disabled'} successfully.`,
            emailNotificationsEnabled: user.emailNotificationsEnabled,
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating notification preferences.', error: e.message });
    }
};
