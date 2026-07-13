import { Router } from 'express';
import multer from 'multer';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCv, uploadCvAuth, uploadLogo } from '../controllers/uploadController.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post('/cv', authenticateApplicant, upload.single('cv'), uploadCv);
router.post('/cv-auth', authenticate, upload.single('cv'), uploadCvAuth);
router.post('/logo', authenticate, authorize('admin', 'superadmin'), upload.single('logo'), uploadLogo);

export default router;