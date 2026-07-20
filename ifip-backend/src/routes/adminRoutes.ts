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
    getAdminUsers,
    broadcastCustomNotification,
    inviteAdmin,
    getAuditLogs,
    getRegistrationApplicants,
    getAdminPayments,
    getAdminPaymentById,
    resolvePayment,
} from '../controllers/adminController.js';
import {
    getAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    publishAssessment,
    archiveAssessment,
    deleteAssessment,
    getAssessmentSubmissions,
    gradeSubmission,
    resetAttempts,
} from '../controllers/assessmentController.js';
import {
    getPartnerApplications,
    getPartnerApplicationById,
    reviewPartnerApplication,
    getAdminPartners,
    createPartnerOrg,
    updatePartnerOrg,
    deletePartnerOrg,
} from '../controllers/partnerController.js';
import {
    adminListOptions,
    adminCreateOption,
    adminUpdateOption,
    adminDeleteOption,
    adminReorderOptions,
} from '../controllers/formOptionController.js';
import {
    adminListOpenings,
    adminCreateOpening,
    adminUpdateOpening,
    adminDeleteOpening,
    adminReorderOpenings,
} from '../controllers/activeOpeningController.js';
import {
    adminListOpportunities,
    adminCreateOpportunity,
    adminUpdateOpportunity,
    adminDeleteOpportunity,
    adminReorderOpportunities,
} from '../controllers/placementOpportunityController.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ─── Admin + Superadmin ───────────────────────────────────────────────────────
router.use(authorize('admin', 'superadmin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAdminUsers);
router.post('/users/invite', authorize('superadmin'), inviteAdmin);
router.get('/audit-logs', authorize('superadmin'), getAuditLogs);
router.get('/applications', getAdminApplications);
router.patch('/applications/:id/cohort', assignApplicationCohort);
router.patch('/applications/:id/withdraw', withdrawApplication);
router.post('/notifications/broadcast', broadcastCustomNotification);

// ── Registration Funnel (anonymised — no PII) ────────────────────────
router.get('/registration-funnel/applicants', getRegistrationApplicants);

// ── Payment Tracking & Resolution ────────────────────────────────────
router.get('/payments', getAdminPayments);
router.get('/payments/:id', getAdminPaymentById);
router.patch('/payments/:id/resolve', resolvePayment);

router.get('/cohorts', getCohorts);
router.post('/cohorts', createCohort);
router.patch('/cohorts/:id', updateCohort);
router.delete('/cohorts/:id', deleteCohort);

router.post('/modules', createModule);
router.patch('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

// ─── Admin + Superadmin — Assessment Operations ──────────────────────────────
router.get('/assessments', getAssessments);
router.get('/assessments/:id', getAssessmentById);
router.post('/assessments', createAssessment);
router.patch('/assessments/:id', updateAssessment);
router.patch('/assessments/:id/publish', publishAssessment);
router.patch('/assessments/:id/archive', archiveAssessment);
router.delete('/assessments/:id', deleteAssessment);
router.get('/assessments/:id/submissions', getAssessmentSubmissions);
router.patch('/assessments/:id/submissions/:subId/grade', gradeSubmission);
router.post('/assessments/:id/submissions/reset', resetAttempts);

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

// ─── Superadmin Only — Form Options CRUD ──────────────────────────────────────
router.get('/form-options',          authorize('superadmin'), adminListOptions);
router.post('/form-options',         authorize('superadmin'), adminCreateOption);
router.post('/form-options/reorder', authorize('superadmin'), adminReorderOptions);
router.patch('/form-options/:id',    authorize('superadmin'), adminUpdateOption);
router.delete('/form-options/:id',   authorize('superadmin'), adminDeleteOption);

// ─── Superadmin Only — Active Openings CRUD ───────────────────────────────────
router.get('/active-openings',          authorize('superadmin'), adminListOpenings);
router.post('/active-openings',         authorize('superadmin'), adminCreateOpening);
router.post('/active-openings/reorder', authorize('superadmin'), adminReorderOpenings);
router.patch('/active-openings/:id',    authorize('superadmin'), adminUpdateOpening);
router.delete('/active-openings/:id',   authorize('superadmin'), adminDeleteOpening);

// ─── Superadmin Only — Placement Opportunities CRUD ───────────────────────────
router.get('/placement-opportunities',          authorize('superadmin'), adminListOpportunities);
router.post('/placement-opportunities',         authorize('superadmin'), adminCreateOpportunity);
router.post('/placement-opportunities/reorder', authorize('superadmin'), adminReorderOpportunities);
router.patch('/placement-opportunities/:id',    authorize('superadmin'), adminUpdateOpportunity);
router.delete('/placement-opportunities/:id',   authorize('superadmin'), adminDeleteOpportunity);

export default router;
