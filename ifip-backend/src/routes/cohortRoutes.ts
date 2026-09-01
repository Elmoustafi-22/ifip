import { Router } from 'express';
import { CohortConfig } from '../models/CohortConfig.js';
import { Cohort } from '../models/Cohort.js';
import { env } from '../config/env.js';
import { getActiveRegistrationCohort, checkCohortCapacity } from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { logAction } from '../utils/auditLogger.js';
import { updateContentVersion } from '../controllers/contentVersionController.js';

const router = Router();

router.get('/registration-status', async (req, res) => {
    try {
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
            const activeCohort = await Cohort.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ startDate: 1 });
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
                const activeCohort = await Cohort.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ startDate: 1 });
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
