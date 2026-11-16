import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { isAdminRole, recentAdminMfaSeconds, validAdminSession } from '../services/adminMfa.js';
import { hasAdminPasswordConfirmation } from '../services/adminPasswordConfirmation.js';

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
    if (isAdminRole(decoded.role)) {
        const user = await User.findById(decoded.sub).select('role mfaEnabled passwordHash +mfaSecret');
        if (!user || user.role !== decoded.role || !validAdminSession(user, decoded)) {
            res.status(401).json({ message: 'Sign in again with your authenticator.' });
            return;
        }
        req.adminSession = { mfaAt: decoded.mfaAt, adminBinding: decoded.adminBinding };
    }
    req.user = { id: decoded.sub, role: decoded.role };
    next();
};

export const requireAdminConfirmation = (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminSession || !req.user || !isAdminRole(req.user.role)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    const age = Math.floor(Date.now() / 1000) - req.adminSession.mfaAt;
    if (!(age >= 0 && age < recentAdminMfaSeconds) && !hasAdminPasswordConfirmation(req)) {
        res.status(403).json({
            code: 'ADMIN_PASSWORD_CONFIRMATION_REQUIRED',
            message: 'Confirm your password to continue.',
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
