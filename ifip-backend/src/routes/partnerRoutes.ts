import { Router } from 'express';
import { submitPartnerApplication, getActivePartners } from '../controllers/partnerController.js';

const router = Router();

// Public — landing page partner display (only active orgs)
router.get('/active', getActivePartners);

// Public — partner interest/application submission
router.post('/apply', submitPartnerApplication);

export default router;
