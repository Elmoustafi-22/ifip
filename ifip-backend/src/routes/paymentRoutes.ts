import { Router } from 'express';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { initiatePayment, getPaymentStatus, handlePaystackWebhook, handleFlutterwaveWebhook } from '../controllers/paymentController.js';

const router = Router();

router.post('/webhook/paystack', handlePaystackWebhook);
router.post('/webhook/flutterwave', handleFlutterwaveWebhook);
router.post('/initiate', authenticateApplicant, initiatePayment);
router.get('/:reference/status', getPaymentStatus);

export default router;