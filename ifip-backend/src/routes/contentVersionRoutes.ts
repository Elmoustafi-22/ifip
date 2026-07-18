import { Router } from 'express';
import { getContentVersions } from '../controllers/contentVersionController.js';

const router = Router();

// Public — no auth required
router.get('/', getContentVersions);

export default router;
