import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyApplication, updateMyApplication } from '../controllers/applicationController.js';

const router = Router();

router.use(authenticate);
router.get('/me', getMyApplication);
router.patch('/me', updateMyApplication);

export default router;