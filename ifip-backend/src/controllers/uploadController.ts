import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { Applicant } from '../models/Applicants.js';
import { CohortConfig } from '../models/CohortConfig.js';
import { logAction } from '../utils/auditLogger.js';
import { updateContentVersion } from './contentVersionController.js';


export const uploadCv = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({ message: 'Only PDF files are accepted' });
        return;
    }

    try {
        const applicant = await Applicant.findById(req.applicant!.id);
        if (!applicant) {
            res.status(404).json({ message: 'Session expired — please resume via your email link.' });
            return;
        }

        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Cloud storage upload timed out. Please try again.'));
            }, 45000);

            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'ifipp/cvs' },
                (error, result) => {
                    clearTimeout(timer);
                    if (error || !result) {
                        reject(error || new Error('Cloudinary upload returned empty result'));
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        applicant.cvUrl = uploadResult.secure_url;
        applicant.refreshExpiry();
        await applicant.save();

        res.json({ cvUrl: applicant.cvUrl });
    } catch (err: any) {
        console.error('CV upload error:', err);
        res.status(500).json({ message: err.message || 'CV upload failed' });
    }
};

import { Application } from '../models/Application.js';

export const uploadCvAuth = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({ message: 'Only PDF files are accepted' });
        return;
    }

    try {
        const application = await Application.findOne({ userId: req.user!.id });
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Cloud storage upload timed out. Please try again.'));
            }, 45000);

            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'ifipp/cvs' },
                (error, result) => {
                    clearTimeout(timer);
                    if (error || !result) {
                        reject(error || new Error('Cloudinary upload returned empty result'));
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        application.cvUrl = uploadResult.secure_url;
        await application.save();

        res.json({ cvUrl: application.cvUrl });
    } catch (err: any) {
        console.error('CV auth upload error:', err);
        res.status(500).json({ message: err.message || 'CV upload failed' });
    }
};

import { User } from '../models/User.js';

export const uploadAvatarAuth = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No image file uploaded' });
        return;
    }
    if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ message: 'Only image files (JPEG, PNG, WebP) are accepted' });
        return;
    }

    try {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: 'ifipp/avatars',
                    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
                },
                (error, result) => (error || !result ? reject(error) : resolve(result as { secure_url: string }))
            );
            stream.end(req.file!.buffer);
        });

        const avatarUrl = uploadResult.secure_url;

        // Update User model
        const user = await User.findById(req.user!.id);
        if (user) {
            user.avatarUrl = avatarUrl;
            await user.save();
        }

        // Update Application model if participant
        const application = await Application.findOne({ userId: req.user!.id });
        if (application) {
            application.avatarUrl = avatarUrl;
            await application.save();
        }

        res.json({ avatarUrl });
    } catch (err: any) {
        res.status(500).json({ message: 'Avatar upload failed', error: err.message });
    }
};

export const uploadLogo = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ message: 'Only image files are accepted' });
        return;
    }

    try {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'image', folder: 'ifipp/partners' },
                (error, result) => (error || !result ? reject(error) : resolve(result as { secure_url: string }))
            );
            stream.end(req.file!.buffer);
        });

        res.json({ url: uploadResult.secure_url });
    } catch (err: any) {
        res.status(500).json({ message: 'Logo upload failed', error: err.message });
    }
};

export const uploadBrochure = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({ message: 'Only PDF files are accepted' });
        return;
    }

    try {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'image', folder: 'ifipp/brochures' },
                (error, result) => (error || !result ? reject(error) : resolve(result as { secure_url: string }))
            );
            stream.end(req.file!.buffer);
        });

        let config = await CohortConfig.findOne();
        if (!config) {
            config = new CohortConfig({
                cohortStartDate: new Date(),
                cohortCap: 100,
                dashboardViewOverride: 'default'
            });
        }
        config.brochureUrl = uploadResult.secure_url;
        config.updatedAt = new Date();
        await config.save();
        await updateContentVersion('cohort');

        logAction(req, 'BROCHURE_UPLOAD', `Uploaded new curriculum brochure PDF: ${config.brochureUrl}`);

        res.json({ brochureUrl: config.brochureUrl });
    } catch (err: any) {
        res.status(500).json({ message: 'Brochure upload failed', error: err.message });
    }
};

export const getUploadSignature = async (req: Request, res: Response) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = req.query.folder ? String(req.query.folder) : 'ifipp/cvs';
        const resource_type = req.query.resource_type ? String(req.query.resource_type) : 'raw';

        // resource_type is a URL path segment on Cloudinary's API
        // (e.g. /v1_1/<cloud>/raw/upload) — it must NOT be included in the
        // signature params, only body-level parameters are signed.
        // allowed_formats is omitted — file type validation is enforced at the
        // application level (module task allowedFileTypes). Including it here
        // causes 403s for non-PDF files and is unreliable for resource_type=raw.
        const paramsToSign = {
            folder,
            timestamp,
        };

        const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

        res.json({
            signature,
            timestamp,
            apiKey: env.CLOUDINARY_API_KEY,
            cloudName: env.CLOUDINARY_CLOUD_NAME,
            folder,
            resource_type,
        });
    } catch (err: any) {
        console.error('Error generating upload signature:', err);
        res.status(500).json({ message: 'Failed to generate upload signature' });
    }
};

/** POST /uploads/module-task-evidence
 *  Proxies the file to Cloudinary server-side, avoiding client-side signatures.
 *  resource_type 'auto' lets Cloudinary handle PDFs, images, and documents. */
export const uploadModuleTaskEvidence = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    try {
        const originalName = req.file.originalname || '';
        const ext = originalName.split('.').pop()?.toLowerCase() || '';
        const mime = req.file.mimetype || '';

        const isImageOrPdf =
            mime.startsWith('image/') ||
            mime === 'application/pdf' ||
            ext === 'pdf' ||
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);

        const isVideoOrAudio = mime.startsWith('video/') || mime.startsWith('audio/');

        const resourceType: 'image' | 'video' | 'raw' | 'auto' = isImageOrPdf
            ? 'image'
            : isVideoOrAudio
            ? 'video'
            : 'auto';

        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Cloud storage upload timed out. Please try again.'));
            }, 120000);

            const stream = cloudinary.uploader.upload_stream(
                { resource_type: resourceType, folder: 'ifipp/module-task-evidence' },
                (error, result) => {
                    clearTimeout(timer);
                    if (error || !result) {
                        reject(error || new Error('Cloudinary upload returned empty result'));
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        res.json({ fileUrl: uploadResult.secure_url });
    } catch (err: any) {
        console.error('Module task evidence upload error:', err);
        res.status(500).json({ message: err?.message || 'Cloudinary file upload failed' });
    }
};

/** POST /uploads/resource-file
 *  Proxies admin resource files (PDF, DOCX, XLSX, etc.) to Cloudinary.
 *  Returns { fileUrl, fileSize, fileName }. */
export const uploadResourceFile = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const originalName = req.file.originalname || 'resource';
    const bytes = req.file.size || req.file.buffer?.length || 0;

    let fileSizeStr = '';
    if (bytes >= 1024 * 1024) {
        fileSizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
        fileSizeStr = `${Math.round(bytes / 1024)} KB`;
    } else if (bytes > 0) {
        fileSizeStr = `${bytes} B`;
    }

    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const mime = req.file.mimetype || '';

    const isImageOrPdf =
        mime.startsWith('image/') ||
        mime === 'application/pdf' ||
        ext === 'pdf' ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);

    const isVideoOrAudio = mime.startsWith('video/') || mime.startsWith('audio/');

    const resourceType: 'image' | 'video' | 'raw' | 'auto' = isImageOrPdf
        ? 'image'
        : isVideoOrAudio
        ? 'video'
        : 'auto';

    try {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Cloud storage upload timed out. Please try again.'));
            }, 120000);

            const stream = cloudinary.uploader.upload_stream(
                { resource_type: resourceType, folder: 'ifipp/resources' },
                (error, result) => {
                    clearTimeout(timer);
                    if (error || !result) {
                        reject(error || new Error('Cloudinary upload returned empty result'));
                    } else {
                        resolve(result as { secure_url: string });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        res.json({ fileUrl: uploadResult.secure_url, fileSize: fileSizeStr, fileName: originalName });
    } catch (err: any) {
        console.error('Resource file upload error:', err);
        res.status(500).json({ message: err?.message || 'Cloudinary resource upload failed' });
    }
};


export const saveCvUrl = async (req: Request, res: Response) => {
    const { cvUrl } = req.body;
    if (!cvUrl || typeof cvUrl !== 'string' || !cvUrl.startsWith('http')) {
        res.status(400).json({ message: 'Valid CV URL is required' });
        return;
    }

    try {
        const applicant = await Applicant.findById(req.applicant!.id);
        if (!applicant) {
            res.status(404).json({ message: 'Session expired — please resume via your email link.' });
            return;
        }

        applicant.cvUrl = cvUrl;
        applicant.refreshExpiry();
        await applicant.save();

        res.json({ cvUrl: applicant.cvUrl });
    } catch (err: any) {
        console.error('Save CV URL error:', err);
        res.status(500).json({ message: err.message || 'Failed to save CV URL' });
    }
};

export const saveCvUrlAuth = async (req: Request, res: Response) => {
    const { cvUrl } = req.body;
    if (!cvUrl || typeof cvUrl !== 'string' || !cvUrl.startsWith('http')) {
        res.status(400).json({ message: 'Valid CV URL is required' });
        return;
    }

    try {
        const application = await Application.findOne({ userId: req.user!.id });
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        application.cvUrl = cvUrl;
        await application.save();

        res.json({ cvUrl: application.cvUrl });
    } catch (err: any) {
        console.error('Save CV URL auth error:', err);
        res.status(500).json({ message: err.message || 'Failed to save CV URL' });
    }
};
