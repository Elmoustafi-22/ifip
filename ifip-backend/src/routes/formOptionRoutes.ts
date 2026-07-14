import { Router } from 'express';
import { getPublicOptions } from '../controllers/formOptionController.js';

const router = Router();

// Public — no auth required
router.get('/', getPublicOptions);

export default router;
