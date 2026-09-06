import { Router } from 'express';
import multer from 'multer';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCv, uploadCvAuth, uploadLogo, uploadBrochure, uploadAvatarAuth, getUploadSignature, saveCvUrl, saveCvUrlAuth, uploadModuleTaskEvidence, uploadResourceFile } from '../controllers/uploadController.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // limit set to 10MB
});

const handleUpload = (fieldName: string) => {
    return (req: any, res: any, next: any) => {
        upload.single(fieldName)(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size exceeds 10MB limit. Please upload a smaller file.' });
                }
                return res.status(400).json({ message: `Upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message || 'File upload failed' });
            }
            next();
        });
    };
};

const router = Router();

// Signature generation for direct Cloudinary upload from browser
router.get('/signature', authenticateApplicant, getUploadSignature);
router.get('/signature-auth', authenticate, getUploadSignature);

// Save Cloudinary secure URL directly
router.post('/save-cv', authenticateApplicant, saveCvUrl);
router.post('/save-cv-auth', authenticate, saveCvUrlAuth);

// Fallback legacy proxy uploads
router.post('/cv', authenticateApplicant, handleUpload('cv'), uploadCv);
router.post('/cv-auth', authenticate, handleUpload('cv'), uploadCvAuth);

router.post('/avatar', authenticate, handleUpload('avatar'), uploadAvatarAuth);
router.post('/module-task-evidence', authenticate, handleUpload('file'), uploadModuleTaskEvidence);
router.post('/resource-file', authenticate, handleUpload('file'), uploadResourceFile);
// Public — used by partner applicants uploading their company logo (no auth needed)
router.post('/logo', handleUpload('logo'), uploadLogo);
// Admin-only alias kept for backward compatibility
router.post('/logo/admin', authenticate, authorize('admin', 'superadmin'), handleUpload('logo'), uploadLogo);
router.post('/brochure', authenticate, authorize('admin', 'superadmin'), handleUpload('brochure'), uploadBrochure);

export default router;