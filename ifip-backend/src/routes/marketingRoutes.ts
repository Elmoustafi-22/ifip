import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMarketingPreference, setMarketingPreference, unsubscribeMarketingEmail } from '../controllers/marketingPreferenceController.js';

const router = Router();
router.post('/unsubscribe', unsubscribeMarketingEmail);
router.get('/preference', authenticate, getMarketingPreference);
router.put('/preference', authenticate, setMarketingPreference);
export default router;
