import type { Request, Response, NextFunction } from 'express';
import { Application } from '../models/Application.js';

/**
 * Middleware that restricts access to participants with an 'active' or 'completed' application.
 * Gating LMS access here ensures that paid-but-unassigned (payment_confirmed) applicants
 * cannot bypass the cohort enrollment flow.
 */
export const requireActiveApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        // Admins and superadmins bypass active application checks to view/manage LMS coursework
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            next();
            return;
        }

        const application = await Application.findOne({ userId: req.user.id });
        
        if (!application) {
            res.status(403).json({
                code: 'NO_APPLICATION',
                message: 'You do not have an active application. Please submit your application first.',
            });
            return;
        }

        if (application.status !== 'active' && application.status !== 'completed') {
            res.status(403).json({
                code: 'AWAITING_COHORT_ASSIGNMENT',
                message: 'Your payment is confirmed, but you have not yet been assigned to a training cohort. Please wait for an administrator to assign your cohort.',
            });
            return;
        }

        // Attach cohortId and application to request context for downstream convenience
        req.application = application;
        
        next();
    } catch (e: any) {
        res.status(500).json({ message: 'Internal server error during application gate verification.', error: e.message });
    }
};
