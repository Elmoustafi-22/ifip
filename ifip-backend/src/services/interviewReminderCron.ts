/**
 * interviewReminderCron.ts
 *
 * Runs on a recurring schedule to send automated interview reminders to both
 * partners and applicants:
 *   - 24-Hour Reminder: Sent when an interview is <= 24 hours away.
 *   - 1-Hour Reminder: Sent when an interview is <= 1 hour away (starting soon).
 *
 * Covers both Job Opening Applicants and Matched Placement candidates.
 * Tracks reminder flags on database records to prevent duplicate deliveries.
 */
import cron from 'node-cron';
import { Types } from 'mongoose';
import { JobApplication } from '../models/JobApplication.js';
import { JobOpening } from '../models/JobOpening.js';
import { Placement } from '../models/Placement.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import {
    sendInterviewReminderToCandidate,
    sendInterviewReminderToPartner,
} from './emailService.js';

interface ReminderTarget {
    type: 'job_application' | 'placement';
    docId: Types.ObjectId;
    candidateUserId: Types.ObjectId;
    candidateEmail?: string;
    candidateName: string;
    partnerOrgId: Types.ObjectId;
    roleTitle: string;
    scheduledAt: Date;
    format: string;
    link?: string;
    location?: string;
    needs24h: boolean;
    needs1h: boolean;
}

export const processInterviewReminders = async (): Promise<void> => {
    try {
        const now = new Date();
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // ─── 1. FETCH SCHEDULED JOB OPENING APPLICATIONS ──────────────────────
        const jobApps = await JobApplication.find({
            status: 'interview_scheduled',
            interviewScheduledAt: { $exists: true, $gt: now, $lte: in24Hours },
            $or: [{ reminder24hSent: { $ne: true } }, { reminder1hSent: { $ne: true } }],
        }).lean();

        // ─── 2. FETCH SCHEDULED PLACEMENTS ───────────────────────────────────
        const placements = await Placement.find({
            status: 'interviewing',
            partnerOutcome: { $exists: false },
            interviewScheduledAt: { $exists: true, $gt: now, $lte: in24Hours },
            $or: [{ reminder24hSent: { $ne: true } }, { reminder1hSent: { $ne: true } }],
        }).lean();

        if (jobApps.length === 0 && placements.length === 0) {
            return;
        }

        const targets: ReminderTarget[] = [];

        // Build Job Application targets
        for (const app of jobApps) {
            const scheduled = new Date(app.interviewScheduledAt!);
            const is1h = scheduled <= in1Hour;
            const needs1h = is1h && !app.reminder1hSent;
            const needs24h = !is1h && !app.reminder24hSent;

            if (!needs1h && !needs24h) continue;

            const [user, opening] = await Promise.all([
                User.findById(app.userId).select('fullName email').lean(),
                JobOpening.findById(app.jobOpeningId).select('title partnerOrgId').lean(),
            ]);

            if (!opening) continue;

            targets.push({
                type: 'job_application',
                docId: app._id,
                candidateUserId: app.userId,
                candidateEmail: user?.email,
                candidateName: user?.fullName || 'Candidate',
                partnerOrgId: opening.partnerOrgId,
                roleTitle: opening.title,
                scheduledAt: scheduled,
                format: app.interviewFormat || 'Video',
                link: app.interviewLink,
                location: app.interviewLocation,
                needs24h,
                needs1h,
            });
        }

        // Build Placement targets
        for (const p of placements) {
            const scheduled = new Date(p.interviewScheduledAt!);
            const is1h = scheduled <= in1Hour;
            const needs1h = is1h && !p.reminder1hSent;
            const needs24h = !is1h && !p.reminder24hSent;

            if (!needs1h && !needs24h) continue;

            const user = await User.findById(p.userId).select('fullName email').lean();

            targets.push({
                type: 'placement',
                docId: p._id,
                candidateUserId: p.userId,
                candidateEmail: user?.email,
                candidateName: user?.fullName || 'Intern',
                partnerOrgId: p.partnerOrgId,
                roleTitle: p.role || 'Placement Candidate',
                scheduledAt: scheduled,
                format: p.interviewFormat || 'Video',
                link: p.interviewLink,
                location: p.interviewLocation,
                needs24h,
                needs1h,
            });
        }

        if (targets.length === 0) return;

        console.log(`[InterviewReminderCron] Processing ${targets.length} interview reminder(s)...`);

        for (const target of targets) {
            const is1hReminder = target.needs1h;
            const timeframeLabel = is1hReminder ? 'in 1 hour (starting soon)' : 'tomorrow';
            const formattedDate = target.scheduledAt.toLocaleString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            // Fetch partner org details
            const org = await PartnerOrganization.findById(target.partnerOrgId).select('name contactEmail contactPerson').lean();
            const orgName = org?.name || 'Partner Organisation';

            // Mark flag in DB immediately to prevent duplicate sends
            const updateField = is1hReminder ? { reminder1hSent: true } : { reminder24hSent: true };
            if (target.type === 'job_application') {
                await JobApplication.updateOne({ _id: target.docId }, { $set: updateField });
            } else {
                await Placement.updateOne({ _id: target.docId }, { $set: updateField });
            }

            // ── A. CANDIDATE REMINDERS ──────────────────────────────────────
            // 1. In-app notification
            await Notification.create({
                userId: target.candidateUserId,
                title: is1hReminder ? 'Interview Starting Soon' : 'Upcoming Interview Reminder',
                message: `Your interview with ${orgName} for "${target.roleTitle}" is scheduled ${timeframeLabel} (${formattedDate}).`,
                type: is1hReminder ? 'warning' : 'info',
                link: target.type === 'job_application' ? '/dashboard/job-openings' : '/dashboard/placement',
            });

            // 2. Email
            if (target.candidateEmail) {
                try {
                    await sendInterviewReminderToCandidate(
                        target.candidateEmail,
                        target.candidateName,
                        orgName,
                        target.roleTitle,
                        formattedDate,
                        target.format,
                        timeframeLabel,
                        target.link,
                        target.location
                    );
                } catch (err: any) {
                    console.error(`[InterviewReminderCron] Candidate reminder failed (${target.candidateEmail}):`, err.message);
                }
            }

            // ── B. PARTNER REMINDERS ────────────────────────────────────────
            // Find partner users for in-app alert + direct emails
            const partnerUsers = await User.find({
                orgId: target.partnerOrgId,
                role: 'partner',
            }).select('_id email fullName').lean();

            const partnerNotifications = partnerUsers.map((pu) => ({
                userId: pu._id,
                title: is1hReminder ? 'Interview Starting Soon' : 'Upcoming Interview Reminder',
                message: `Interview with ${target.candidateName} for "${target.roleTitle}" is scheduled ${timeframeLabel} (${formattedDate}).`,
                type: is1hReminder ? 'warning' as const : 'info' as const,
                link: '/partner-portal',
            }));
            if (partnerNotifications.length > 0) {
                await Notification.insertMany(partnerNotifications);
            }

            // Collect partner recipient emails (org contact email + all partner team members)
            const partnerEmails = new Set<string>();
            if (org?.contactEmail && org.contactEmail.trim().length > 0) {
                partnerEmails.add(org.contactEmail.toLowerCase().trim());
            }
            for (const pu of partnerUsers) {
                if (pu.email && pu.email.trim().length > 0) {
                    partnerEmails.add(pu.email.toLowerCase().trim());
                }
            }

            const contactName = org?.contactPerson || partnerUsers[0]?.fullName || 'Partner';
            for (const pEmail of partnerEmails) {
                try {
                    await sendInterviewReminderToPartner(
                        pEmail,
                        contactName,
                        target.candidateName,
                        target.roleTitle,
                        formattedDate,
                        target.format,
                        timeframeLabel,
                        target.link,
                        target.location
                    );
                } catch (err: any) {
                    console.error(`[InterviewReminderCron] Partner reminder failed (${pEmail}):`, err.message);
                }
            }

            console.log(`[InterviewReminderCron] Sent ${is1hReminder ? '1h' : '24h'} reminder for "${target.roleTitle}" (${target.candidateName} & ${orgName})`);
        }
    } catch (err: any) {
        console.error('[InterviewReminderCron] Error during reminder run:', err.message);
    }
};

/**
 * Initializes the recurring cron job.
 * Runs on a 5-minute schedule.
 */
export const startInterviewReminderCron = (): void => {
    // Run an initial check 10 seconds after server boot
    setTimeout(() => {
        processInterviewReminders().catch((err) =>
            console.error('[InterviewReminderCron] Initial boot check failed:', err.message)
        );
    }, 10000);

    // Schedule regular 5-minute interval check
    cron.schedule('*/5 * * * *', async () => {
        await processInterviewReminders();
    });

    console.log('⏰ Interview Reminder Cron initialized (runs every 5 minutes).');
};
