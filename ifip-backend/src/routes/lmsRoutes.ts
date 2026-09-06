import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireActiveApplication } from '../middleware/requireActiveApplication.js';
import { getModules, getModuleById, getModuleOutline, completeModule } from '../controllers/lmsController.js';
import {
    getAssessmentForParticipant,
    startAssessment,
    submitAssessment,
    getLatestAssessmentResult
} from '../controllers/lmsAssessmentController.js';
import {
    getParticipantSchedule,
    getUpcomingSessions
} from '../controllers/programmeSessionController.js';
import {
    getModuleTaskStatus,
    submitModuleTask,
    getModuleTaskSubmissions,
    getMyTaskRewardSummary,
} from '../controllers/moduleTaskController.js';

const router = Router();

router.use(authenticate);
router.use(requireActiveApplication); // Gate entire LMS to active/completed cohort participants

router.get('/modules', getModules);
router.get('/modules/:id/outline', getModuleOutline);
router.get('/modules/:id', getModuleById);
router.get('/modules/:id/task', getModuleTaskStatus);
router.post('/modules/:id/task/submit', submitModuleTask);
router.get('/modules/:id/task/submissions', getModuleTaskSubmissions);
router.get('/task-rewards/summary', getMyTaskRewardSummary);
router.post('/modules/complete', completeModule);

// Schedule / Timetable endpoints
router.get('/schedule', getParticipantSchedule);
router.get('/schedule/upcoming', getUpcomingSessions);

// Assessment-specific endpoints
router.get('/modules/:id/assessment', getAssessmentForParticipant);
router.post('/modules/:id/assessment/start', startAssessment);
router.post('/modules/:id/assessment/submit', submitAssessment);
router.get('/modules/:id/assessment/result', getLatestAssessmentResult);

export default router;

