import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { submitPartnerApplication, getActivePartners } from '../controllers/partnerController.js';
import {
    getPartnerMe,
    getInternPool,
    getInternById,
    expressInterest,
    getMyInterests,
    withdrawInterest,
    getMyPlacements,
    logInterview,
    logOutcome,
    savePlacementNotes,
    getMyOpenings,
    addOpening,
    updateOpening,
    deleteOpening,
    getPartnerNotifications,
    markNotificationRead,
    updatePartnerSettings,
} from '../controllers/partnerPortalController.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/active', getActivePartners);
router.post('/apply', submitPartnerApplication);

// ─── Partner Portal (authenticated partner role) ───────────────────────────────
const partnerAuth = [authenticate, authorize('partner')];

router.get('/me',                                      ...partnerAuth, getPartnerMe);
router.get('/interns',                                 ...partnerAuth, getInternPool);
router.get('/interns/:userId',                         ...partnerAuth, getInternById);

router.post('/interests',                              ...partnerAuth, expressInterest);
router.get('/interests',                               ...partnerAuth, getMyInterests);
router.delete('/interests/:id',                        ...partnerAuth, withdrawInterest);

router.get('/placements',                              ...partnerAuth, getMyPlacements);
router.patch('/placements/:id/interview',              ...partnerAuth, logInterview);
router.patch('/placements/:id/outcome',                ...partnerAuth, logOutcome);
router.patch('/placements/:id/notes',                  ...partnerAuth, savePlacementNotes);

router.get('/openings',                                ...partnerAuth, getMyOpenings);
router.post('/openings',                               ...partnerAuth, addOpening);
router.patch('/openings/:openingId',                   ...partnerAuth, updateOpening);
router.delete('/openings/:openingId',                  ...partnerAuth, deleteOpening);

router.get('/notifications',                           ...partnerAuth, getPartnerNotifications);
router.patch('/notifications/:id/read',                ...partnerAuth, markNotificationRead);

router.patch('/settings',                              ...partnerAuth, updatePartnerSettings);

export default router;
