import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { QueryFilter } from 'mongoose';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { User, type IUser } from '../models/User.js';
import type { AdminSessionProof } from '../utils/jwt.js';
import { sendAdminMfaSetupCode } from './emailService.js';

const challengeFields = '+mfaSecret +adminMfaChallenge';
const maxAttempts = 5;
export const adminSessionSeconds = 8 * 60 * 60;
export const recentAdminMfaSeconds = 10 * 60;

export function isAdminRole(role: string) {
    return role === 'admin' || role === 'superadmin';
}

function digest(parts: unknown[]) {
    return createHmac('sha256', env.JWT_REFRESH_SECRET).update(JSON.stringify(parts)).digest('hex');
}

export function adminSessionProof(user: IUser, mfaAt: number): AdminSessionProof {
    return {
        mfaAt,
        adminBinding: digest(['admin-session', String(user._id), user.role, user.passwordHash, user.mfaSecret]),
    };
}

export function adminPasswordBinding(user: IUser) {
    return digest(['admin-password-reset', String(user._id), user.role, user.passwordHash]);
}

export function validAdminSession(user: IUser, proof: Partial<AdminSessionProof>): proof is AdminSessionProof {
    if (!isAdminRole(user.role) || !user.mfaEnabled || !user.mfaSecret ||
        typeof proof.mfaAt !== 'number' || !Number.isSafeInteger(proof.mfaAt)) return false;
    const age = Math.floor(Date.now() / 1000) - proof.mfaAt;
    return age >= 0 && age < adminSessionSeconds &&
        proof.adminBinding === adminSessionProof(user, proof.mfaAt).adminBinding;
}

function credentialFilter(user: IUser) {
    return { _id: user._id, role: user.role, passwordHash: user.passwordHash };
}

export async function beginAdminMfa(user: IUser, res: Response) {
    const now = new Date();
    const phase = user.mfaEnabled ? 'login' : 'email';
    const id = randomUUID();
    const code = phase === 'email' ? String(randomInt(100_000_000)).padStart(8, '0') : undefined;
    const expiresAt = new Date(now.getTime() + (code ? 10 : 3) * 60_000);
    const filter = { ...credentialFilter(user), mfaEnabled: user.mfaEnabled ? true : { $ne: true } };
    const updated = await User.findOneAndUpdate(
        { ...filter, 'adminMfaChallenge.expiresAt': { $not: { $gt: now } } },
        { $set: { adminMfaChallenge: { id, phase, attempts: 0, expiresAt, emailDigest: code && digest(['admin-enroll', id, code]) } } },
    );
    if (updated && code) {
        try {
            await sendAdminMfaSetupCode(user.email, code);
        } catch {
            await User.updateOne({ _id: user._id, 'adminMfaChallenge.id': id }, { $unset: { adminMfaChallenge: 1 } });
            res.status(503).json({ message: 'We could not send the admin setup code. Try signing in again.' });
            return;
        }
    }
    const challenge = updated ? { id, phase, expiresAt, attempts: 0 } :
        (await User.findOne(filter).select('+adminMfaChallenge'))?.adminMfaChallenge;
    if (!challenge || challenge.expiresAt <= now || challenge.attempts >= maxAttempts || challenge.phase === 'setup') {
        res.status(429).json({ message: 'Admin verification is temporarily unavailable. Wait for the current challenge to expire and sign in again.' });
        return;
    }
    const purpose = challenge.phase === 'email' ? 'admin-mfa-enroll' : 'admin-mfa-login';
    const mfaToken = jwt.sign({ sub: String(user._id), jti: challenge.id, purpose }, env.JWT_ACCESS_SECRET, {
        expiresIn: Math.max(1, Math.ceil((challenge.expiresAt.getTime() - Date.now()) / 1000)),
    });
    res.set('Cache-Control', 'no-store').json({ mfaRequired: true, mfaEnrollmentRequired: challenge.phase === 'email', mfaToken });
}

function readChallenge(token: unknown, phase: 'login' | 'email' | 'setup'): QueryFilter<IUser> | null {
    if (typeof token !== 'string') return null;
    try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
        const purpose = phase === 'login' ? 'admin-mfa-login' : 'admin-mfa-enroll';
        if (typeof payload === 'object' && payload.purpose === purpose &&
            typeof payload.sub === 'string' && typeof payload.jti === 'string') {
            return {
                _id: payload.sub,
                role: { $in: ['admin', 'superadmin'] },
                mfaEnabled: phase === 'login' ? true : { $ne: true },
                'adminMfaChallenge.id': payload.jti,
                'adminMfaChallenge.phase': phase,
                'adminMfaChallenge.expiresAt': { $gt: new Date() },
            };
        }
    } catch {
        return null;
    }
    return null;
}

async function takeAttempt(token: unknown, phase: 'login' | 'email' | 'setup') {
    const filter = readChallenge(token, phase);
    if (!filter) return null;
    const user = await User.findOneAndUpdate(
        { ...filter, 'adminMfaChallenge.attempts': { $lt: maxAttempts } },
        { $inc: { 'adminMfaChallenge.attempts': 1 } },
        { returnDocument: 'after' },
    ).select(challengeFields);
    return user ? { user, filter: { ...filter, passwordHash: user.passwordHash } } : null;
}

export async function verifyAdminEnrollmentEmail(req: Request, res: Response) {
    const { mfaToken, code } = req.body ?? {};
    const attempt = await takeAttempt(mfaToken, 'email');
    const challenge = attempt?.user.adminMfaChallenge;
    if (!attempt || !challenge?.emailDigest || typeof code !== 'string' || !/^\d{8}$/.test(code) ||
        !timingSafeEqual(Buffer.from(challenge.emailDigest, 'hex'), Buffer.from(digest(['admin-enroll', challenge.id, code]), 'hex'))) {
        res.status(401).json({ message: 'The setup code is incorrect or expired. Sign in again if you need a new code.' });
        return;
    }
    const secret = generateSecret();
    const qrCode = await QRCode.toDataURL(generateURI({ label: attempt.user.email, issuer: 'IFIP Platform', secret }));
    const updated = await User.updateOne(attempt.filter, {
        $set: { 'adminMfaChallenge.phase': 'setup', 'adminMfaChallenge.setupSecret': secret, 'adminMfaChallenge.attempts': 0 },
        $unset: { 'adminMfaChallenge.emailDigest': 1 },
    });
    if (!updated.modifiedCount) {
        res.status(401).json({ message: 'The setup session has expired or was already used.' });
        return;
    }
    res.set('Cache-Control', 'no-store').json({ secret, qrCode });
}

export async function verifyAdminAuthenticator(token: unknown, code: unknown, phase: 'login' | 'setup') {
    const attempt = await takeAttempt(token, phase);
    const secret = phase === 'setup' ? attempt?.user.adminMfaChallenge?.setupSecret : attempt?.user.mfaSecret;
    if (!attempt || !secret || typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;

    const mfaAt = Math.floor(Date.now() / 1000);
    const verified = verifySync({ token: code, secret, epoch: mfaAt });
    if (!verified.valid) return null;
    const step = Math.floor(mfaAt / 30);
    return User.findOneAndUpdate(
        { ...attempt.filter, 'adminMfaStep': { $not: { $gte: step } } },
        {
            $set: { mfaEnabled: true, mfaSecret: secret, adminMfaStep: step, lastLoginAt: new Date() },
            $unset: { adminMfaChallenge: 1 },
        },
        { returnDocument: 'after' },
    ).select('+mfaSecret').then(user => user ? { user, proof: adminSessionProof(user, mfaAt) } : null);
}
