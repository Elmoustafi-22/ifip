import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getOpenJobOpenings,
    checkEligibility,
    getMyJobApplications,
    getJobOpeningById,
    applyToJobOpening,
} from '../controllers/jobOpeningController.js';

const router = Router();

// All routes require authenticated user
router.use(authenticate);

// View openings & eligibility (participants + admin preview)
router.get('/', authorize('participant', 'admin', 'superadmin'), getOpenJobOpenings);
router.get('/eligibility', authorize('participant', 'admin', 'superadmin'), checkEligibility);
router.get('/eligibility/check', authorize('participant', 'admin', 'superadmin'), checkEligibility);
router.get('/my-applications', authorize('participant', 'admin', 'superadmin'), getMyJobApplications);
router.get('/:id', authorize('participant', 'admin', 'superadmin'), getJobOpeningById);

// Submitting applications is strictly for participants
router.post('/:id/apply', authorize('participant'), applyToJobOpening);

export default router;
