import { Router } from 'express';
import { getPublicOpportunities } from '../controllers/placementOpportunityController.js';

const router = Router();

// Public read access
router.get('/', getPublicOpportunities);

export default router;
