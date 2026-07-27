import { Router } from 'express';
import multer from 'multer';
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
    resendSetPasswordLink,
    getAuditLogs,
    getRegistrationApplicants,
    getPendingApplicants,
    sendPendingApplicantReminder,
    sendBulkPendingApplicantReminders,
    uploadPendingApplicantCv,
    recordManualPaymentForApplicant,
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
router.post('/users/:id/resend-invite', authorize('superadmin'), resendSetPasswordLink);
router.get('/audit-logs', authorize('superadmin'), getAuditLogs);
router.get('/applications', getAdminApplications);
router.patch('/applications/:id/cohort', assignApplicationCohort);
router.patch('/applications/:id/withdraw', withdrawApplication);
router.post('/notifications/broadcast', broadcastCustomNotification);

// ── Registration Funnel & Pending Applicants ──────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const handleUpload = (fieldName: string) => {
    return (req: any, res: any, next: any) => {
        upload.single(fieldName)(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size exceeds 10MB limit. Please upload a smaller file.' });
                }
                return res.status(400).json({ message: `Upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message || 'File upload failed' });
            }
            next();
        });
    };
};

router.get('/registration-funnel/applicants', getRegistrationApplicants);
router.get('/pending-applicants', getPendingApplicants);
router.post('/pending-applicants/bulk-remind-email', sendBulkPendingApplicantReminders);
router.post('/pending-applicants/:applicantId/remind-email', sendPendingApplicantReminder);
router.post('/pending-applicants/:applicantId/upload-cv', handleUpload('cv'), uploadPendingApplicantCv);
router.post('/pending-applicants/:applicantId/record-manual-payment', handleUpload('receipt'), recordManualPaymentForApplicant);

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
