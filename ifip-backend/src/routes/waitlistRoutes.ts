import { Router } from 'express';
import { joinWaitlist } from '../controllers/waitlistController.js';

const router = Router();

router.post('/', joinWaitlist);

export default router;
