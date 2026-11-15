import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { isAdminRole, recentAdminMfaSeconds, validAdminSession } from '../services/adminMfa.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }
    let decoded;
    try {
        decoded = verifyAccessToken(header.slice(7));
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
        return;
    }
    let mfaAt: number | undefined;
    if (isAdminRole(decoded.role)) {
        const user = await User.findById(decoded.sub).select('role mfaEnabled passwordHash +mfaSecret');
        if (!user || user.role !== decoded.role || !validAdminSession(user, decoded)) {
            res.status(401).json({ message: 'Sign in again with your authenticator.' });
            return;
        }
        mfaAt = decoded.mfaAt;
    }
    req.user = { id: decoded.sub, role: decoded.role, mfaAt };
    next();
};

export const requireRecentAdminMfa = (req: Request, res: Response, next: NextFunction) => {
    const mfaAt = req.user?.mfaAt;
    if (!req.user || !isAdminRole(req.user.role) || mfaAt === undefined ||
        Math.floor(Date.now() / 1000) - mfaAt >= recentAdminMfaSeconds) {
        res.status(403).json({
            code: 'RECENT_ADMIN_MFA_REQUIRED',
            message: 'Sign out and sign in with your authenticator, then retry this action within 10 minutes.',
        });
        return;
    }
    next();
};

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    next();
};
