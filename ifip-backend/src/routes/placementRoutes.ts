import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getMyPlacement,
    getAdminPlacements,
    createMatch,
    updateMatchStatus,
    getPartners,
    createPartner,
    updatePartner,
    deletePartner
} from '../controllers/placementController.js';

const router = Router();

// Student routing
router.get('/my', authenticate, getMyPlacement);

// Admin routing
router.get('/admin/placements', authenticate, authorize('admin', 'superadmin'), getAdminPlacements);
router.post('/admin/placements/match', authenticate, authorize('admin', 'superadmin'), createMatch);
router.patch('/admin/placements/:id/status', authenticate, authorize('admin', 'superadmin'), updateMatchStatus);

router.get('/admin/partners', authenticate, authorize('admin', 'superadmin'), getPartners);
router.post('/admin/partners', authenticate, authorize('admin', 'superadmin'), createPartner);
router.patch('/admin/partners/:id', authenticate, authorize('admin', 'superadmin'), updatePartner);
router.delete('/admin/partners/:id', authenticate, authorize('admin', 'superadmin'), deletePartner);

export default router;
