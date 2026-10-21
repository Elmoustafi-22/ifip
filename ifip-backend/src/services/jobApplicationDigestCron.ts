/**
 * jobApplicationDigestService.ts
 *
 * Batches candidate job applications to prevent spamming partner organizations.
 * Partners receive a consolidated digest email instead of individual emails per applicant.
 *
 * Dispatched ONLY when 20 applications pile up for a job opening (BATCH_THRESHOLD = 20),
 * or when an opening is closed. No daily recurring emails disturbance.
 */
import { Types } from 'mongoose';
import { JobApplication } from '../models/JobApplication.js';
import { JobOpening } from '../models/JobOpening.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';
import { sendPartnerJobApplicationDigestEmail, ApplicationDigestEntry } from './emailService.js';
import { generatePartnerUnsubscribeToken } from '../utils/partnerUnsubscribeToken.js';
import { env } from '../config/env.js';

export const BATCH_THRESHOLD = 20;

/**
 * Dispatches a digest email for a specific job opening if there are pending unnotified applications.
 */
export const sendOpeningApplicationDigest = async (openingId: Types.ObjectId | string): Promise<boolean> => {
    try {
        const opId = typeof openingId === 'string' ? new Types.ObjectId(openingId) : openingId;

        // Fetch unnotified applications for this opening
        const unnotifiedApps = await JobApplication.find({
            jobOpeningId: opId,
            partnerDigestNotified: { $ne: true },
        })
            .populate<{ userId: { fullName?: string; email?: string } }>('userId', 'fullName email')
            .sort({ createdAt: 1 })
            .lean();

        if (unnotifiedApps.length === 0) return false;

        const opening = await JobOpening.findById(opId).select('title partnerOrgId').lean();
        if (!opening) return false;

        const org = await PartnerOrganization.findById(opening.partnerOrgId)
            .select('name contactEmail contactPerson emailNotificationsEnabled')
            .lean();
        const orgName = org?.name || 'Partner Organisation';

        // If the partner has opted out of emails, mark apps as notified (no backlog build-up) and exit
        if ((org as any)?.emailNotificationsEnabled === false) {
            const appIds = unnotifiedApps.map((a) => a._id);
            await JobApplication.updateMany(
                { _id: { $in: appIds } },
                { $set: { partnerDigestNotified: true } }
            );
            console.log(`[JobAppDigest] Email notifications disabled for org ${opening.partnerOrgId}. Marked ${appIds.length} app(s) as notified without emailing.`);
            return false;
        }

        const partnerUsers = await User.find({
            orgId: opening.partnerOrgId,
            role: 'partner',
        })
            .select('_id email fullName')
            .lean();

        // Collect recipient emails (org contact email + all partner team members)
        const partnerEmails = new Set<string>();
        if (org?.contactEmail && org.contactEmail.trim().length > 0) {
            partnerEmails.add(org.contactEmail.toLowerCase().trim());
        }
        for (const pu of partnerUsers) {
            if (pu.email && pu.email.trim().length > 0) {
                partnerEmails.add(pu.email.toLowerCase().trim());
            }
        }

        if (partnerEmails.size === 0) {
            console.warn(`[JobAppDigest] No recipient emails found for partner org ${opening.partnerOrgId}`);
            return false;
        }

        const applicants: ApplicationDigestEntry[] = unnotifiedApps.map((app) => ({
            applicantName: (app.userId as any)?.fullName || (app.userId as any)?.email || 'Applicant',
            submittedAt: app.submittedAt || app.createdAt || new Date(),
        }));

        const contactName = org?.contactPerson || partnerUsers[0]?.fullName || 'Partner';
        const unsubUrl = `${env.CLIENT_URL}/partner-portal/unsubscribe?token=${generatePartnerUnsubscribeToken(String(opening.partnerOrgId))}`;

        // Send digest email to all partner recipients
        for (const pEmail of partnerEmails) {
            try {
                await sendPartnerJobApplicationDigestEmail(
                    pEmail,
                    contactName,
                    opening.title,
                    orgName,
                    applicants,
                    unsubUrl
                );
            } catch (err: any) {
                console.error(`[JobAppDigest] Failed to send digest email to ${pEmail}:`, err.message);
            }
        }

        // Mark applications as notified in DB
        const appIds = unnotifiedApps.map((a) => a._id);
        await JobApplication.updateMany(
            { _id: { $in: appIds } },
            { $set: { partnerDigestNotified: true } }
        );

        console.log(`[JobAppDigest] Dispatched digest with ${applicants.length} applicant(s) for "${opening.title}" to ${orgName} (${Array.from(partnerEmails).join(', ')})`);
        return true;
    } catch (err: any) {
        console.error(`[JobAppDigest] Error processing opening digest for ${openingId}:`, err.message);
        return false;
    }
};

/**
 * Checks if unnotified applications have reached the batch threshold (20).
 * If so, dispatches digest immediately.
 */
export const checkThresholdAndSendDigest = async (openingId: Types.ObjectId | string): Promise<void> => {
    try {
        const opId = typeof openingId === 'string' ? new Types.ObjectId(openingId) : openingId;
        const count = await JobApplication.countDocuments({
            jobOpeningId: opId,
            partnerDigestNotified: { $ne: true },
        });

        if (count >= BATCH_THRESHOLD) {
            console.log(`[JobAppDigest] Opening ${openingId} reached ${count} unnotified applications (threshold: ${BATCH_THRESHOLD}). Triggering digest...`);
            await sendOpeningApplicationDigest(opId);
        }
    } catch (err: any) {
        console.error(`[JobAppDigest] Error checking threshold for opening ${openingId}:`, err.message);
    }
};

/**
 * Flushes pending applications when an opening closes or passes its deadline,
 * ensuring any remaining applicants (< 20) are delivered in one final summary.
 */
export const flushOpeningOnCloseOrDeadline = async (openingId: Types.ObjectId | string): Promise<void> => {
    try {
        await sendOpeningApplicationDigest(openingId);
    } catch (err: any) {
        console.error(`[JobAppDigest] Error flushing opening ${openingId}:`, err.message);
    }
};
