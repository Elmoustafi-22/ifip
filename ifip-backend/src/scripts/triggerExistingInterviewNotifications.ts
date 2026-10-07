/**
 * triggerExistingInterviewNotifications.ts
 *
 * Scans for existing Job Applications (and matched Placements) with scheduled interviews
 * that may have missed admin email alerts, applicant email notifications, or in-app alerts.
 * Dispatches the emails and creates the in-app notifications.
 *
 * Run:
 *   npx tsx src/scripts/triggerExistingInterviewNotifications.ts
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { JobApplication } from '../models/JobApplication.js';
import { JobOpening } from '../models/JobOpening.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';
import { Placement } from '../models/Placement.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

const run = async () => {
    console.log('\n======================================================');
    console.log('🔄 Triggering Notifications for Existing Scheduled Interviews');
    console.log('======================================================\n');

    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await mongoose.connect(env.MONGO_URI, {
                serverSelectionTimeoutMS: 15000,
            });
            connected = true;
            console.log('✔ Connected to MongoDB successfully.\n');
            break;
        } catch (connErr: any) {
            console.warn(`⚠️ Connection attempt ${attempt} failed: ${connErr.message}. Retrying in 2s...`);
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    if (!connected) {
        throw new Error('Could not connect to MongoDB after 3 attempts.');
    }

    // ─── 1. JOB OPENING APPLICATIONS ─────────────────────────────────────────────
    const scheduledJobApps = await JobApplication.find({
        status: 'interview_scheduled',
        interviewScheduledAt: { $exists: true, $ne: null },
    }).lean();

    console.log(`📋 Found ${scheduledJobApps.length} scheduled Job Opening Application(s)...\n`);

    for (const app of scheduledJobApps) {
        try {
            const [opening, user] = await Promise.all([
                JobOpening.findById(app.jobOpeningId).lean(),
                User.findById(app.userId).select('fullName email').lean(),
            ]);

            if (!opening) {
                console.warn(`   ⚠️ Opening not found for application ${app._id}`);
                continue;
            }

            const org = await PartnerOrganization.findById(opening.partnerOrgId).select('name').lean();
            const orgName = org?.name || 'Partner Organisation';
            const candidateName = user?.fullName || 'Applicant';
            const candidateEmail = user?.email;

            const formattedDate = new Date(app.interviewScheduledAt!).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            console.log(`▶ Processing Job Application: "${opening.title}" for ${candidateName} (${candidateEmail || 'No email'})`);
            console.log(`   Host: ${orgName} | Date: ${formattedDate} | Format: ${app.interviewFormat || 'Video'}`);

            // Trigger the notification event which dispatches applicant in-app + email,
            // and admin in-app + email to all superadmins and ops.
            notificationEmitter.emit('jobApplication.interview_scheduled', {
                opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
                userId: app.userId.toString(),
                userEmail: candidateEmail,
                userName: candidateName,
                jobTitle: opening.title,
                partnerOrgName: orgName,
                interviewDate: formattedDate,
                format: app.interviewFormat || 'Video',
                interviewLink: app.interviewLink,
                interviewLocation: app.interviewLocation,
            });

            // Small pause to allow async sending & avoid rate-limit bursts
            await new Promise((r) => setTimeout(r, 600));
            console.log(`   ✔ Dispatched notifications for application ${app._id}\n`);
        } catch (err: any) {
            console.error(`   ❌ Error processing application ${app._id}:`, err.message);
        }
    }

    // ─── 2. PLACEMENT MATCHES ───────────────────────────────────────────────────
    const scheduledPlacements = await Placement.find({
        status: 'interviewing',
        interviewScheduledAt: { $exists: true, $ne: null },
    }).lean();

    console.log(`\n📋 Found ${scheduledPlacements.length} scheduled Placement Candidate(s)...\n`);

    for (const p of scheduledPlacements) {
        try {
            const [org, user] = await Promise.all([
                PartnerOrganization.findById(p.partnerOrgId).select('name').lean(),
                User.findById(p.userId).select('fullName email').lean(),
            ]);

            const orgName = org?.name || 'Partner Organisation';
            const candidateName = user?.fullName || 'Intern';
            const candidateEmail = user?.email;

            const formattedDate = new Date(p.interviewScheduledAt!).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            console.log(`▶ Processing Placement: ${candidateName} with ${orgName}`);
            console.log(`   Date: ${formattedDate} | Format: ${p.interviewFormat || 'Video'}`);

            notificationEmitter.emit('partner.interview_logged', {
                opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
                orgName,
                internUserId: p.userId,
                internEmail: candidateEmail,
                internName: candidateName,
                interviewDate: formattedDate,
                format: p.interviewFormat || 'Video',
                interviewLink: p.interviewLink,
                interviewLocation: p.interviewLocation,
            });

            await new Promise((r) => setTimeout(r, 600));
            console.log(`   ✔ Dispatched notifications for placement ${p._id}\n`);
        } catch (err: any) {
            console.error(`   ❌ Error processing placement ${p._id}:`, err.message);
        }
    }

    console.log('\n======================================================');
    console.log('✅ Finished processing all scheduled interviews.');
    console.log('======================================================\n');

    // Wait a couple of seconds for background email promises to complete before disconnecting
    await new Promise((r) => setTimeout(r, 3000));
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Fatal script error:', err);
    await mongoose.disconnect();
    process.exit(1);
});
