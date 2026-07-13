import cloudinary from '../config/cloudinary.js';
import { Applicant } from '../models/Applicants.js';
import { Application } from '../models/Application.js';

export const purgeOrphanedCvs = async () => {
    const { resources } = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: 'ifipp/cvs/',
        max_results: 500,
    });

    const activeCvUrls = new Set([
        ...(await Applicant.find().distinct('cvUrl')),
        ...(await Application.find().distinct('cvUrl')),
    ]);

    for (const resource of resources) {
        if (!activeCvUrls.has(resource.secure_url)) {
            await cloudinary.uploader.destroy(resource.public_id, { resource_type: 'raw' });
            console.log(`Purged orphaned CV: ${resource.public_id}`);
        }
    }
};

export const schedulePurgeJob = () => {
    purgeOrphanedCvs().catch((err) => console.error('Initial CV purge failed:', err));
    setInterval(() => {
        purgeOrphanedCvs().catch((err) => console.error('Scheduled CV purge failed:', err));
    }, 60 * 60 * 1000);
};