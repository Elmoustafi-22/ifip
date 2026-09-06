import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getDashboardStats,
    getAdminApplications,
    assignApplicationCohort,
    withdrawApplication,
    setPlacementReady,
    getCohorts,
    createCohort,
    updateCohort,
    deleteCohort,
    createModule,
    updateModule,
    publishModule,
    unpublishModule,
    getAdminModules,
    getModuleOutline,
    updateModuleOutline,
    deleteModule,
    getAdminUsers,
    broadcastCustomNotification,
    getBroadcasts,
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
    getWaitlist,
    deleteWaitlistEntry,
    exportApplicantsCSV,
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
    sendPartnerInvite,
    getAdminPartnerInterests,
    approvePartnerInterest,
    declinePartnerInterest,
    sendPartnerNotification,
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
import {
    getAdminCoupons,
    createCoupon,
    getCouponById,
    updateCoupon,
    deleteCoupon,
} from '../controllers/couponController.js';
import {
    getAdminSessions,
    createAdminSession,
    updateAdminSession,
    deleteAdminSession,
    togglePublishSession,
    bulkPublishWeek,
} from '../controllers/programmeSessionController.js';

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
router.get('/applicants/export-csv', exportApplicantsCSV);
router.patch('/applications/:id/cohort', assignApplicationCohort);
router.patch('/applications/:id/withdraw', withdrawApplication);
router.patch('/applications/:id/set-placement-ready', setPlacementReady);
router.post('/notifications/broadcast', broadcastCustomNotification);
router.get('/notifications/broadcasts', getBroadcasts);

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

// ── Waitlist Management ──────────────────────────────────────────────
router.get('/waitlist', getWaitlist);
router.delete('/waitlist/:id', deleteWaitlistEntry);

router.get('/cohorts', getCohorts);
router.post('/cohorts', createCohort);
router.patch('/cohorts/:id', updateCohort);
router.delete('/cohorts/:id', deleteCohort);

router.get('/modules', getAdminModules);
router.post('/modules', createModule);
router.patch('/modules/:id', updateModule);
router.patch('/modules/:id/publish', publishModule);
router.patch('/modules/:id/unpublish', unpublishModule);
router.get('/modules/:id/outline', getModuleOutline);
router.patch('/modules/:id/outline', updateModuleOutline);
router.delete('/modules/:id', deleteModule);

// ─── Programme Schedule / Timetable Operations ─────────────────────────
router.get('/schedule', getAdminSessions);
router.post('/schedule', createAdminSession);
router.patch('/schedule/bulk-publish', bulkPublishWeek);
router.patch('/schedule/:id', updateAdminSession);
router.patch('/schedule/:id/publish', togglePublishSession);
router.delete('/schedule/:id', deleteAdminSession);

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

// ─── Superadmin Only — Coupon Code Management ─────────────────────────────────
router.get('/coupons',          authorize('superadmin'), getAdminCoupons);
router.post('/coupons',         authorize('superadmin'), createCoupon);
router.get('/coupons/:id',      authorize('superadmin'), getCouponById);
router.patch('/coupons/:id',    authorize('superadmin'), updateCoupon);
router.delete('/coupons/:id',   authorize('superadmin'), deleteCoupon);

// ─── Superadmin Only — Partner Management ─────────────────────────────────────
// Partner Organizations (direct CRUD & Invite)
router.get('/partners',          authorize('superadmin'), getAdminPartners);
router.post('/partners',         authorize('superadmin'), createPartnerOrg);
router.patch('/partners/:id',    authorize('superadmin'), updatePartnerOrg);
router.delete('/partners/:id',   authorize('superadmin'), deletePartnerOrg);
router.post('/partners/:id/invite', authorize('superadmin'), sendPartnerInvite);

// Partner Applications (review queue)
router.get('/partners/applications',          authorize('superadmin'), getPartnerApplications);
router.get('/partners/applications/:id',      authorize('superadmin'), getPartnerApplicationById);
router.patch('/partners/applications/:id',    authorize('superadmin'), reviewPartnerApplication);

// Partner Interest Requests (Admin + Superadmin review queue)
router.get('/partner-interests',               authorize('admin', 'superadmin'), getAdminPartnerInterests);
router.patch('/partner-interests/:id/approve', authorize('admin', 'superadmin'), approvePartnerInterest);
router.patch('/partner-interests/:id/decline', authorize('admin', 'superadmin'), declinePartnerInterest);

// Partner Push Notification
router.post('/notifications/partner',          authorize('superadmin'), sendPartnerNotification);

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
