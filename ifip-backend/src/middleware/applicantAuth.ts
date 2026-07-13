import type { Request, Response, NextFunction } from 'express';
import { verifyApplicantSessionToken } from '../utils/jwt.js';

export const authenticateApplicant = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No applicant session token provided' });
        return;
    }
    try {
        const decoded = verifyApplicantSessionToken(header.split(' ')[1]);
        req.applicant = { id: decoded.applicantId };
        next();
    } catch {
        res.status(401).json({ message: 'Applicant session expired or invalid. Please resume via your email link.' });
    }
};