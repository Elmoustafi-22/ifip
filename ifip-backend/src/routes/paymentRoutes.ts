import { Router } from 'express';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { initiatePayment, getPaymentStatus, handlePaystackWebhook, handleFlutterwaveWebhook } from '../controllers/paymentController.js';
import { validateCoupon } from '../controllers/couponController.js';
import { getMyBankTransfer, submitApplicantTransferProof, uploadTransferReceipt } from '../controllers/bankTransferController.js';

const router = Router();

router.post('/webhook/paystack', handlePaystackWebhook);
router.post('/webhook/flutterwave', handleFlutterwaveWebhook);
router.post('/coupon/validate', authenticateApplicant, validateCoupon);
router.post('/initiate', authenticateApplicant, initiatePayment);
router.get('/bank-transfer', authenticateApplicant, getMyBankTransfer);
router.post('/bank-transfer/proof', authenticateApplicant, uploadTransferReceipt, submitApplicantTransferProof);
router.get('/:reference/status', getPaymentStatus);

export default router;
