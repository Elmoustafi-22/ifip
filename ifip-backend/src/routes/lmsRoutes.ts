import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireActiveApplication } from '../middleware/requireActiveApplication.js';
import { getModules, getModuleById, completeModule } from '../controllers/lmsController.js';
import {
    getAssessmentForParticipant,
    startAssessment,
    submitAssessment,
    getLatestAssessmentResult
} from '../controllers/lmsAssessmentController.js';

const router = Router();

router.use(authenticate);
router.use(requireActiveApplication); // Gate entire LMS to active/completed cohort participants

router.get('/modules', getModules);
router.get('/modules/:id', getModuleById);
router.post('/modules/complete', completeModule);

// Assessment-specific endpoints
router.get('/modules/:id/assessment', getAssessmentForParticipant);
router.post('/modules/:id/assessment/start', startAssessment);
router.post('/modules/:id/assessment/submit', submitAssessment);
router.get('/modules/:id/assessment/result', getLatestAssessmentResult);

export default router;
