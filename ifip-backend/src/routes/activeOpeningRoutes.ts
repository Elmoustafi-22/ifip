import { Router } from 'express';
import { getPublicOpenings } from '../controllers/activeOpeningController.js';

const router = Router();

// Public read access
router.get('/', getPublicOpenings);

export default router;
