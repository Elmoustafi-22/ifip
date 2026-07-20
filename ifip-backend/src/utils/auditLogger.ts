import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

/**
 * Log an action for an already-authenticated request.
 * Requires req.user to be populated by the auth middleware.
 */
export const logAction = async (
    req: Request,
    action: string,
    description: string,
    targetDetails?: { targetId?: string; targetType?: string }
) => {
    try {
        if (!req.user) return;

        // Fetch user email since it's not stored in the access token payload
        const user = await User.findById(req.user.id);
        const userEmail = user?.email || 'N/A';

        const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const ipAddress = Array.isArray(rawIp)
            ? rawIp[0]
            : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined);

        const targetId = targetDetails?.targetId ? new Types.ObjectId(targetDetails.targetId) : undefined;

        await AuditLog.create({
            userId: new Types.ObjectId(req.user.id),
            userEmail,
            userRole: req.user.role,
            action,
            description,
            ipAddress,
            userAgent: req.headers['user-agent'],
            targetId,
            targetType: targetDetails?.targetType,
        });
    } catch (err) {
        console.error('Audit logger failed:', err);
    }
};

/**
 * Log an action that occurs before or outside the authenticated request lifecycle.
 * Used for events like login, OTP verification, payment webhook callbacks, etc.,
 * where req.user may not be set yet.
 */
export const logRawAction = async (
    params: {
        userId: string;
        userEmail: string;
        userRole: string;
        action: string;
        description: string;
        ipAddress?: string;
        userAgent?: string;
        targetId?: string;
        targetType?: string;
    }
) => {
    try {
        const targetId = params.targetId ? new Types.ObjectId(params.targetId) : undefined;
        await AuditLog.create({
            userId: new Types.ObjectId(params.userId),
            userEmail: params.userEmail,
            userRole: params.userRole,
            action: params.action,
            description: params.description,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            targetId,
            targetType: params.targetType,
        });
    } catch (err) {
        console.error('Audit logger (raw) failed:', err);
    }
};
