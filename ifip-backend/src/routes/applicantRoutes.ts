import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { startApplicationSchema, verifyOtpSchema, resumeSchema } from '../validators/applicantValidators.js';
import {
    startApplication,
    verifyApplicantOtp,
    resumeApplication,
    getMyApplicant,
    updateMyApplicant,
    submitApplication,
    getCohortStatus,
} from '../controllers/applicantController.js';

const router = Router();

router.get('/cohort-status', getCohortStatus);

router.post('/start', validate(startApplicationSchema), startApplication);
router.post('/verify-otp', validate(verifyOtpSchema), verifyApplicantOtp);
router.post('/resume', validate(resumeSchema), resumeApplication);

router.use(authenticateApplicant);
router.get('/me', getMyApplicant);
router.patch('/me', updateMyApplicant);
router.post('/submit', submitApplication);

export default router;