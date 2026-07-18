import { Router } from 'express';
import multer from 'multer';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCv, uploadCvAuth, uploadLogo, uploadBrochure } from '../controllers/uploadController.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // limit set to 10MB
});

const router = Router();

router.post('/cv', authenticateApplicant, upload.single('cv'), uploadCv);
router.post('/cv-auth', authenticate, upload.single('cv'), uploadCvAuth);
// Public — used by partner applicants uploading their company logo (no auth needed)
router.post('/logo', upload.single('logo'), uploadLogo);
// Admin-only alias kept for backward compatibility
router.post('/logo/admin', authenticate, authorize('admin', 'superadmin'), upload.single('logo'), uploadLogo);
router.post('/brochure', authenticate, authorize('admin', 'superadmin'), upload.single('brochure'), uploadBrochure);

export default router;