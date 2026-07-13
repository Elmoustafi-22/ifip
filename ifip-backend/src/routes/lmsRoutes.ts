import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getModules, completeModule } from '../controllers/lmsController.js';

const router = Router();

router.use(authenticate);
router.get('/modules', getModules);
router.post('/modules/complete', completeModule);

export default router;
