import { Router } from 'express';
import { CohortConfig } from '../models/CohortConfig.js';
import { env } from '../config/env.js';
import { getActiveRegistrationCohort, checkCohortCapacity } from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

const router = Router();

router.get('/registration-status', async (req, res) => {
    try {
        const cohort = await getActiveRegistrationCohort();
        if (!cohort) {
            res.json({ hasActiveCohort: false, isFull: true });
            return;
        }

        const capacity = await checkCohortCapacity(cohort._id);
        res.json({
            hasActiveCohort: true,
            isFull: capacity.isFull,
            cohortName: cohort.name,
            registrationEndDate: cohort.registrationEndDate.toISOString(),
            cap: capacity.cap,
            count: capacity.count
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error checking cohort registration status.', error: e.message });
    }
});

router.get('/active', authenticate, async (req, res) => {
    try {
        const config = await CohortConfig.findOne();
        if (!config) {
            res.json({
                cohortStartDate: env.COHORT_START_DATE,
                cohortCap: Number(env.COHORT_CAP || 100),
                dashboardViewOverride: 'default'
            });
            return;
        }
        res.json({
            cohortStartDate: config.cohortStartDate.toISOString(),
            cohortCap: config.cohortCap,
            dashboardViewOverride: config.dashboardViewOverride || 'default'
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
            const start = startDate ? new Date(startDate) : new Date(env.COHORT_START_DATE);
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
