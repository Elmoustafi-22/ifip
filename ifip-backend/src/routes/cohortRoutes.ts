import { Router } from 'express';
import { CohortConfig } from '../models/CohortConfig.js';
import { Cohort } from '../models/Cohort.js';
import { env } from '../config/env.js';
import { getActiveRegistrationCohort, checkCohortCapacity } from '../services/registrationAvailability.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { logAction } from '../utils/auditLogger.js';
import { updateContentVersion } from '../controllers/contentVersionController.js';
import { getLevyPricing } from '../controllers/levyPricingController.js';
import { RegistrationNotice } from '../models/RegistrationNotice.js';

const router = Router();

router.get('/levy-pricing', getLevyPricing);

router.get('/registration-notice', async (_req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const notice = await RegistrationNotice.findOne({ key: 'registration' });
        res.json(notice && notice.expiresAt.getTime() > Date.now()
            ? { message: notice.message, expiresAt: notice.expiresAt.toISOString() }
            : null);
    } catch {
        res.status(503).json({ message: 'Unable to load the registration notice.' });
    }
});

router.put('/registration-notice', authenticate, authorize('superadmin'), async (req, res) => {
    const { message, expiresAt } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim() || message.trim().length > 280 ||
        typeof expiresAt !== 'string' || !/Z$|[+-]\d{2}:\d{2}$/.test(expiresAt)) {
        res.status(400).json({ message: 'Enter a message and an expiry time with a timezone.' });
        return;
    }
    const expiry = new Date(expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) {
        res.status(400).json({ message: 'Choose a future expiry time.' });
        return;
    }
    try {
        const notice = await RegistrationNotice.findOneAndUpdate(
            { key: 'registration' },
            { $set: { message: message.trim(), expiresAt: expiry } },
            { upsert: true, returnDocument: 'after', runValidators: true },
        );
        res.json({ message: notice.message, expiresAt: notice.expiresAt.toISOString() });
    } catch {
        res.status(503).json({ message: 'Unable to save the registration notice.' });
    }
});

router.delete('/registration-notice', authenticate, authorize('superadmin'), async (_req, res) => {
    try {
        await RegistrationNotice.deleteOne({ key: 'registration' });
        res.status(204).end();
    } catch {
        res.status(503).json({ message: 'Unable to remove the registration notice.' });
    }
});

router.get('/registration-status', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const cohort = await getActiveRegistrationCohort();
        if (!cohort) {
            res.json({ hasActiveCohort: false, isFull: true });
            return;
        }

        const capacity = await checkCohortCapacity(cohort._id);
        const config = await CohortConfig.findOne();
        res.json({
            hasActiveCohort: true,
            isFull: capacity.isFull,
            cohortName: cohort.name,
            cohortStartDate: cohort.startDate?.toISOString(),
            registrationEndDate: cohort.registrationEndDate.toISOString(),
            cap: capacity.cap,
            count: capacity.count,
            brochureUrl: config?.brochureUrl
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error checking cohort registration status.', error: e.message });
    }
});

router.get('/active', authenticate, async (req, res) => {
    try {
        const config = await CohortConfig.findOne();
        if (!config) {
            // Fallback to active/upcoming cohort in database
            const activeCohort = await Cohort.findOne({ status: { $in: ['active', 'upcoming'] }, startDate: { $type: 'date' } }).sort({ startDate: 1 });
            const defaultDate = activeCohort?.startDate || new Date('2026-09-05T00:00:00.000Z');
            const defaultCap = activeCohort?.cohortCap || Number(env.COHORT_CAP || 100);

            res.json({
                cohortStartDate: defaultDate.toISOString(),
                cohortCap: defaultCap,
                dashboardViewOverride: 'default'
            });
            return;
        }
        res.json({
            cohortStartDate: config.cohortStartDate.toISOString(),
            cohortCap: config.cohortCap,
            dashboardViewOverride: config.dashboardViewOverride || 'default',
            brochureUrl: config.brochureUrl
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving active cohort configuration.', error: e.message });
    }
});

router.post('/active', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
    try {
        const { startDate, cohortCap, dashboardViewOverride } = req.body;
        if (!startDate && cohortCap === undefined && !dashboardViewOverride) {
            res.status(400).json({ message: 'At least one of startDate, cohortCap, or dashboardViewOverride is required.' });
            return;
        }

        if (dashboardViewOverride && !['default', 'coming_soon', 'unlocked'].includes(dashboardViewOverride)) {
            res.status(400).json({ message: 'Invalid dashboardViewOverride. Must be default, coming_soon, or unlocked.' });
            return;
        }

        let config = await CohortConfig.findOne();
        let overrideChanged = false;

        if (!config) {
            let start: Date;
            if (startDate) {
                start = new Date(startDate);
            } else {
                const activeCohort = await Cohort.findOne({ status: { $in: ['active', 'upcoming'] }, startDate: { $type: 'date' } }).sort({ startDate: 1 });
                start = activeCohort?.startDate || new Date('2026-09-05T00:00:00.000Z');
            }
            const cap = cohortCap !== undefined ? Number(cohortCap) : Number(env.COHORT_CAP || 100);
            const viewOverride = dashboardViewOverride || 'default';
            
            if (isNaN(start.getTime())) {
                res.status(400).json({ message: 'Invalid date format for startDate.' });
                return;
            }

            config = new CohortConfig({
                cohortStartDate: start,
                cohortCap: cap,
                dashboardViewOverride: viewOverride
            });
            overrideChanged = viewOverride !== 'default';
        } else {
            if (startDate) {
                const dateObj = new Date(startDate);
                if (isNaN(dateObj.getTime())) {
                    res.status(400).json({ message: 'Invalid date format for startDate.' });
                    return;
                }
                config.cohortStartDate = dateObj;
            }
            if (cohortCap !== undefined) {
                config.cohortCap = Number(cohortCap);
            }
            if (dashboardViewOverride) {
                overrideChanged = config.dashboardViewOverride !== dashboardViewOverride;
                config.dashboardViewOverride = dashboardViewOverride;
            }
            config.updatedAt = new Date();
        }

        await config.save();
        await updateContentVersion('cohort');

        logAction(req, 'SYSTEM_CONFIG_UPDATE', `Updated system launch configuration (capacity: ${config.cohortCap}, override mode: ${config.dashboardViewOverride})`);

        if (overrideChanged) {
            notificationEmitter.emit('cohort.override_changed', { override: config.dashboardViewOverride });
        }

        res.json({
            message: 'Cohort config updated successfully.',
            cohortStartDate: config.cohortStartDate.toISOString(),
            cohortCap: config.cohortCap,
            dashboardViewOverride: config.dashboardViewOverride
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error setting cohort configuration.', error: e.message });
    }
});

export default router;
