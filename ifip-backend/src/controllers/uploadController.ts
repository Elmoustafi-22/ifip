import type { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.js';
import { Applicant } from '../models/Applicants.js';
import { CohortConfig } from '../models/CohortConfig.js';
import { logAction } from '../utils/auditLogger.js';

export const uploadCv = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({ message: 'Only PDF files are accepted' });
        return;
    }

    const applicant = await Applicant.findById(req.applicant!.id);
    if (!applicant) {
        res.status(404).json({ message: 'Session expired — please resume via your email link.' });
        return;
    }

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'ifipp/cvs' },
            (error, result) => (error || !result ? reject(error) : resolve(result as { secure_url: string }))
        );
        stream.end(req.file!.buffer);
    });

    applicant.cvUrl = uploadResult.secure_url;
    applicant.refreshExpiry();
    await applicant.save();

    res.json({ cvUrl: applicant.cvUrl });
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

    const application = await Application.findOne({ userId: req.user!.id });
    if (!application) {
        res.status(404).json({ message: 'Application not found.' });
        return;
    }

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'ifipp/cvs' },
            (error, result) => (error || !result ? reject(error) : resolve(result as { secure_url: string }))
        );
        stream.end(req.file!.buffer);
    });

    application.cvUrl = uploadResult.secure_url;
    await application.save();

    res.json({ cvUrl: application.cvUrl });
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

        logAction(req, 'BROCHURE_UPLOAD', `Uploaded new curriculum brochure PDF: ${config.brochureUrl}`);

        res.json({ brochureUrl: config.brochureUrl });
    } catch (err: any) {
        res.status(500).json({ message: 'Brochure upload failed', error: err.message });
    }
};