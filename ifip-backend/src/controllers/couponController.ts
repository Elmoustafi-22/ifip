import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { Payment } from '../models/Payments.js';
import { logRawAction } from '../utils/auditLogger.js';

/**
 * Public/Applicant Endpoint: Validate coupon code at checkout
 * POST /api/payments/coupon/validate
 */
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string' || !code.trim()) {
            res.status(400).json({ message: 'Please enter a valid coupon code.' });
            return;
        }

        const normalizedCode = code.trim().toUpperCase();
        const coupon = await Coupon.findOne({ code: normalizedCode });

        if (!coupon) {
            res.status(404).json({ message: 'Invalid coupon code. Please check and try again.' });
            return;
        }

        if (!coupon.isActive) {
            res.status(400).json({ message: 'This coupon code is currently inactive.' });
            return;
        }

        const now = new Date();
        if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) {
            res.status(400).json({ message: coupon.expiredMessage || 'This coupon code has expired.' });
            return;
        }

        if (coupon.maxUses !== undefined && coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            res.status(400).json({ message: 'This coupon code has reached its maximum usage limit.' });
            return;
        }

        res.json({
            valid: true,
            code: coupon.code,
            discountPercent: coupon.discountPercent,
            message: `${coupon.discountPercent}% discount code applied successfully!`,
        });
    } catch (error: any) {
        console.error('[validateCoupon] Error:', error);
        res.status(500).json({ message: 'An error occurred while validating coupon code.' });
    }
};

/**
 * Superadmin Endpoint: List all coupons with filters, pagination, and summary stats
 * GET /api/admin/coupons
 */
export const getAdminCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = (req.query.status as string) || 'all';
        const search = req.query.search as string | undefined;
        const page = (req.query.page as string) || '1';
        const limit = (req.query.limit as string) || '20';

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 20);
        const skip = (pageNum - 1) * limitNum;

        const now = new Date();
        const query: any = {};

        if (search && search.trim()) {
            query.code = { $regex: search.trim().toUpperCase(), $options: 'i' };
        }

        if (status === 'active') {
            query.isActive = true;
            query.expiresAt = { $gt: now };
            query.$expr = {
                $or: [
                    { $eq: [{ $ifNull: ['$maxUses', null] }, null] },
                    { $lt: ['$usedCount', '$maxUses'] },
                ],
            };
        } else if (status === 'expired') {
            query.expiresAt = { $lte: now };
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        const [coupons, total] = await Promise.all([
            Coupon.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('createdByAdminId', 'fullName email')
                .lean(),
            Coupon.countDocuments(query),
        ]);

        // Aggregate summary metrics across ALL coupons in database
        const [allCouponsStats] = await Coupon.aggregate([
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    activeCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$isActive', true] },
                                        { $gt: ['$expiresAt', now] },
                                        {
                                            $or: [
                                                { $eq: [{ $ifNull: ['$maxUses', null] }, null] },
                                                { $lt: ['$usedCount', '$maxUses'] },
                                            ],
                                        },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    expiredCount: {
                        $sum: {
                            $cond: [{ $lte: ['$expiresAt', now] }, 1, 0],
                        },
                    },
                    totalRedemptions: { $sum: '$usedCount' },
                },
            },
        ]);

        const summary = allCouponsStats || {
            totalCount: 0,
            activeCount: 0,
            expiredCount: 0,
            totalRedemptions: 0,
        };

        res.json({
            coupons,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            summary: {
                totalCoupons: summary.totalCount,
                activeCoupons: summary.activeCount,
                expiredCoupons: summary.expiredCount,
                totalRedemptions: summary.totalRedemptions,
            },
        });
    } catch (error: any) {
        console.error('[getAdminCoupons] Error:', error);
        res.status(500).json({ message: 'Failed to retrieve coupons.' });
    }
};

/**
 * Superadmin Endpoint: Create new coupon
 * POST /api/admin/coupons
 */
export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, discountPercent, expiresAt, expiredMessage, maxUses, isActive = true } = req.body;

        if (!code || typeof code !== 'string' || !code.trim()) {
            res.status(400).json({ message: 'Coupon code is required.' });
            return;
        }

        const normalizedCode = code.trim().toUpperCase();

        const existing = await Coupon.findOne({ code: normalizedCode });
        if (existing) {
            res.status(400).json({ message: `Coupon code '${normalizedCode}' already exists.` });
            return;
        }

        const discountNum = Number(discountPercent);
        if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
            res.status(400).json({ message: 'Discount percentage must be an integer between 1 and 100.' });
            return;
        }

        if (!expiresAt) {
            res.status(400).json({ message: 'Expiration date is required.' });
            return;
        }

        const parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
            res.status(400).json({ message: 'Invalid expiration date format.' });
            return;
        }

        if (!expiredMessage || typeof expiredMessage !== 'string' || !expiredMessage.trim()) {
            res.status(400).json({ message: 'Custom expired error message is required.' });
            return;
        }

        let parsedMaxUses: number | undefined = undefined;
        if (maxUses !== undefined && maxUses !== null && maxUses !== '') {
            parsedMaxUses = Number(maxUses);
            if (isNaN(parsedMaxUses) || parsedMaxUses < 1) {
                res.status(400).json({ message: 'Max uses must be a positive integer.' });
                return;
            }
        }

        const coupon = await Coupon.create({
            code: normalizedCode,
            discountPercent: discountNum,
            expiresAt: parsedExpiresAt,
            expiredMessage: expiredMessage.trim(),
            maxUses: parsedMaxUses,
            isActive: Boolean(isActive),
            usedCount: 0,
            createdByAdminId: req.user?.id ? new Types.ObjectId(req.user.id) : undefined,
        });

        // Audit Log
        if (req.user) {
            logRawAction({
                userId: req.user.id,
                userEmail: (req.user as any).email || 'admin@ifip.org',
                userRole: req.user.role,
                action: 'COUPON_CREATED',
                description: `Created coupon '${coupon.code}' with ${coupon.discountPercent}% discount expiring at ${coupon.expiresAt.toISOString()}`,
                targetId: coupon.id,
                targetType: 'Coupon',
            });
        }

        res.status(201).json({ message: 'Coupon code created successfully.', coupon });
    } catch (error: any) {
        console.error('[createCoupon] Error:', error);
        res.status(500).json({ message: 'Failed to create coupon code.' });
    }
};

/**
 * Superadmin Endpoint: Get single coupon details and redemption history
 * GET /api/admin/coupons/:id
 */
export const getCouponById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid coupon ID format.' });
            return;
        }

        const coupon = await Coupon.findById(id).populate('createdByAdminId', 'fullName email').lean();
        if (!coupon) {
            res.status(404).json({ message: 'Coupon not found.' });
            return;
        }

        // Fetch redemptions from Payment collection
        const payments = await Payment.find({ couponId: new Types.ObjectId(id), status: 'success' })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('applicantId', 'fullName email country')
            .lean();

        res.json({ coupon, redemptions: payments });
    } catch (error: any) {
        console.error('[getCouponById] Error:', error);
        res.status(500).json({ message: 'Failed to fetch coupon details.' });
    }
};

/**
 * Superadmin Endpoint: Update coupon details
 * PATCH /api/admin/coupons/:id
 */
export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid coupon ID format.' });
            return;
        }

        const coupon = await Coupon.findById(id);
        if (!coupon) {
            res.status(404).json({ message: 'Coupon not found.' });
            return;
        }

        const { code, discountPercent, expiresAt, expiredMessage, maxUses, isActive } = req.body;

        if (code !== undefined) {
            const normalizedCode = code.trim().toUpperCase();
            if (normalizedCode !== coupon.code) {
                const existing = await Coupon.findOne({ code: normalizedCode, _id: { $ne: coupon._id } });
                if (existing) {
                    res.status(400).json({ message: `Coupon code '${normalizedCode}' already exists.` });
                    return;
                }
                coupon.code = normalizedCode;
            }
        }

        if (discountPercent !== undefined) {
            const discountNum = Number(discountPercent);
            if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
                res.status(400).json({ message: 'Discount percentage must be an integer between 1 and 100.' });
                return;
            }
            coupon.discountPercent = discountNum;
        }

        if (expiresAt !== undefined) {
            const parsedExpiresAt = new Date(expiresAt);
            if (isNaN(parsedExpiresAt.getTime())) {
                res.status(400).json({ message: 'Invalid expiration date format.' });
                return;
            }
            coupon.expiresAt = parsedExpiresAt;
        }

        if (expiredMessage !== undefined) {
            if (!expiredMessage || typeof expiredMessage !== 'string' || !expiredMessage.trim()) {
                res.status(400).json({ message: 'Custom expired error message cannot be empty.' });
                return;
            }
            coupon.expiredMessage = expiredMessage.trim();
        }

        if (maxUses !== undefined) {
            if (maxUses === null || maxUses === '') {
                coupon.maxUses = undefined;
            } else {
                const parsedMaxUses = Number(maxUses);
                if (isNaN(parsedMaxUses) || parsedMaxUses < 1) {
                    res.status(400).json({ message: 'Max uses must be a positive integer.' });
                    return;
                }
                coupon.maxUses = parsedMaxUses;
            }
        }

        if (isActive !== undefined) {
            coupon.isActive = Boolean(isActive);
        }

        await coupon.save();

        // Audit Log
        if (req.user) {
            logRawAction({
                userId: req.user.id,
                userEmail: (req.user as any).email || 'admin@ifip.org',
                userRole: req.user.role,
                action: 'COUPON_UPDATED',
                description: `Updated coupon '${coupon.code}' parameters`,
                targetId: coupon.id,
                targetType: 'Coupon',
            });
        }

        res.json({ message: 'Coupon updated successfully.', coupon });
    } catch (error: any) {
        console.error('[updateCoupon] Error:', error);
        res.status(500).json({ message: 'Failed to update coupon code.' });
    }
};

/**
 * Superadmin Endpoint: Delete coupon
 * DELETE /api/admin/coupons/:id
 */
export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid coupon ID format.' });
            return;
        }

        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) {
            res.status(404).json({ message: 'Coupon not found.' });
            return;
        }

        // Audit Log
        if (req.user) {
            logRawAction({
                userId: req.user.id,
                userEmail: (req.user as any).email || 'admin@ifip.org',
                userRole: req.user.role,
                action: 'COUPON_DELETED',
                description: `Deleted coupon '${coupon.code}'`,
                targetId: coupon.id,
                targetType: 'Coupon',
            });
        }

        res.json({ message: `Coupon '${coupon.code}' deleted successfully.` });
    } catch (error: any) {
        console.error('[deleteCoupon] Error:', error);
        res.status(500).json({ message: 'Failed to delete coupon code.' });
    }
};
