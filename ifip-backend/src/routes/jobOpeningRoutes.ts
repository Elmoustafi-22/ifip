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

// All routes require authenticated participant
router.use(authenticate, authorize('participant'));

router.get('/', getOpenJobOpenings);
router.get('/eligibility', checkEligibility);
router.get('/my-applications', getMyJobApplications);
router.get('/:id', getJobOpeningById);
router.post('/:id/apply', applyToJobOpening);

export default router;
