import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getDashboardStats,
    getAdminApplications,
    assignApplicationCohort,
    withdrawApplication,
    getCohorts,
    createCohort,
    updateCohort,
    deleteCohort,
    createModule,
    updateModule,
    deleteModule,
} from '../controllers/adminController.js';
import {
    getPartnerApplications,
    getPartnerApplicationById,
    reviewPartnerApplication,
    getAdminPartners,
    createPartnerOrg,
    updatePartnerOrg,
    deletePartnerOrg,
} from '../controllers/partnerController.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ─── Admin + Superadmin ───────────────────────────────────────────────────────
router.use(authorize('admin', 'superadmin'));

router.get('/stats', getDashboardStats);
router.get('/applications', getAdminApplications);
router.patch('/applications/:id/cohort', assignApplicationCohort);
router.patch('/applications/:id/withdraw', withdrawApplication);

router.get('/cohorts', getCohorts);
router.post('/cohorts', createCohort);
router.patch('/cohorts/:id', updateCohort);
router.delete('/cohorts/:id', deleteCohort);

router.post('/modules', createModule);
router.patch('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

// ─── Superadmin Only — Partner Management ─────────────────────────────────────
// Partner Organizations (direct CRUD)
router.get('/partners',          authorize('superadmin'), getAdminPartners);
router.post('/partners',         authorize('superadmin'), createPartnerOrg);
router.patch('/partners/:id',    authorize('superadmin'), updatePartnerOrg);
router.delete('/partners/:id',   authorize('superadmin'), deletePartnerOrg);

// Partner Applications (review queue)
router.get('/partners/applications',          authorize('superadmin'), getPartnerApplications);
router.get('/partners/applications/:id',      authorize('superadmin'), getPartnerApplicationById);
router.patch('/partners/applications/:id',    authorize('superadmin'), reviewPartnerApplication);

export default router;
