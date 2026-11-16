import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { recentAdminMfaSeconds, validAdminSession } from './adminMfa.js';

const purpose = 'admin-password-confirmation';

export const limitAdminPasswordConfirmation = rateLimit({
    windowMs: recentAdminMfaSeconds * 1000,
    limit: 5,
    keyGenerator: req => req.user!.id,
    skipSuccessfulRequests: true,
    message: { message: 'Too many password attempts. Try again in a few minutes.' },
});

export async function confirmAdminPassword(req: Request, res: Response) {
    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !password) {
        res.status(400).json({ message: 'Enter your current password.' });
        return;
    }

    const session = req.adminSession;
    const user = await User.findById(req.user?.id).select('role passwordHash mfaEnabled +mfaSecret');
    if (!user || !session || !validAdminSession(user, session)) {
        res.status(401).json({ message: 'Your session expired. Sign in again to continue.' });
        return;
    }
    if (!(await user.comparePassword(password))) {
        res.status(403).json({ message: 'Incorrect password. Try again.' });
        return;
    }

    const token = jwt.sign({ purpose, sub: user.id, ...session }, env.JWT_ACCESS_SECRET, {
        expiresIn: recentAdminMfaSeconds,
    });
    res.set('Cache-Control', 'no-store').json({ token, expiresIn: recentAdminMfaSeconds });
}

export function hasAdminPasswordConfirmation(req: Request) {
    const token = req.headers['x-admin-password-confirmation'];
    const session = req.adminSession;
    if (typeof token !== 'string' || !session || !req.user) return false;
    try {
        const proof = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
        return typeof proof === 'object' && proof.purpose === purpose && proof.sub === req.user.id &&
            proof.mfaAt === session.mfaAt && proof.adminBinding === session.adminBinding;
    } catch {
        return false;
    }
}
