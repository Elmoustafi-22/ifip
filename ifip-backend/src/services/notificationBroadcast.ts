import { EventEmitter } from 'events';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Applicant } from '../models/Applicants.js';
import {
    sendOtpEmail,
    sendResumeLinkEmail,
    sendPaymentSuccessEmail,
    sendSetPasswordEmail,
    sendPasswordChangedAlert,
    sendAdminEnrollmentDigest,
    sendCohortWelcomeEmail,
    sendAssessmentGradedEmail,
    sendPlacementMatchedEmail,
    sendPartnerApplicationReceived,
    sendAdminPartnerApplicationReceived,
    sendPartnerApplicationApproved,
    sendPartnerApplicationDeclined,
    sendCustomBroadcastEmail,
    sendInterestExpressedAlert,
    sendInterestApprovedToPartner,
    sendPlacementMatchedToIntern,
    sendInterestDeclinedToPartner,
    sendInterviewLoggedAlert,
    sendInterviewScheduledToIntern,
    sendOutcomeLoggedAlert,
    sendOfferExtendedToIntern,
    sendAccountActivatedWelcomeEmail,
    sendPartnerActivatedWelcomeEmail,
} from './emailService.js';

export const notificationEmitter = new EventEmitter();

// Define listener contracts

notificationEmitter.on('otp.requested', async ({ email, otp }) => {
    try {
        await sendOtpEmail(email, otp);
    } catch (err) {
        console.error('[Event:otp.requested] Error:', err);
    }
});

notificationEmitter.on('applicant.resume', async ({ email, token, isPaid }) => {
    try {
        await sendResumeLinkEmail(email, token, isPaid);
    } catch (err) {
        console.error('[Event:applicant.resume] Error:', err);
    }
});

notificationEmitter.on('payment.success', async ({ email, resumeToken, country }) => {
    try {
        await sendPaymentSuccessEmail(email, resumeToken, country);
    } catch (err) {
        console.error('[Event:payment.success] Error:', err);
    }
});

notificationEmitter.on('application.submitted', async ({ email, setPasswordToken, country }) => {
    try {
        await sendSetPasswordEmail(email, setPasswordToken, country);
    } catch (err) {
        console.error('[Event:application.submitted] Error:', err);
    }
});

notificationEmitter.on('application.enrolled', async ({ user, application }) => {
    try {
        // 1. In-app alerts for all admins and superadmins
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const notifications = admins.map(admin => ({
            userId: admin._id,
            title: 'New Student Enrollment',
            message: `Candidate "${user.fullName || user.email}" has successfully paid the commitment levy and submitted their application.`,
            type: 'info',
            link: `/admin/applications`
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // 2. Email alert digest for superadmins / admins
        for (const admin of admins) {
            try {
                await sendAdminEnrollmentDigest(admin.email, 1);
            } catch (err) {
                console.error('[Event:application.enrolled] Admin email fail:', err);
            }
        }
    } catch (err) {
        console.error('[Event:application.enrolled] Error:', err);
    }
});

notificationEmitter.on('auth.password_set', async ({ user }) => {
    try {
        if (user.role === 'partner') {
            // In-app Welcome Notification
            await Notification.create({
                userId: user._id,
                title: 'Welcome to the IFIP Partner Portal!',
                message: `Welcome, ${user.fullName || 'Partner'}! Your account has been activated and your password is set. You now have full access to your partner portal.`,
                type: 'success',
                link: '/partner-portal',
            });
            // Welcome Email
            if (user.email) {
                await sendPartnerActivatedWelcomeEmail(user.email, user.fullName || '');
            }
        } else {
            // In-app Welcome Notification
            await Notification.create({
                userId: user._id,
                title: 'Welcome to IFIP!',
                message: `Welcome, ${user.fullName || 'Candidate'}! Your account has been activated and your password is set. You now have full access to your participant dashboard.`,
                type: 'success',
                link: '/dashboard',
            });
            // Welcome Email
            if (user.email) {
                await sendAccountActivatedWelcomeEmail(user.email, user.fullName || '');
            }
        }
    } catch (err) {
        console.error('[Event:auth.password_set] Error:', err);
    }
});

notificationEmitter.on('auth.password_changed', async ({ user }) => {
    try {
        // In-app
        await Notification.create({
            userId: user._id,
            title: 'Password Updated',
            message: 'Your account security credentials have been updated successfully.',
            type: 'warning',
            link: '/dashboard/settings'
        });
        // Email
        await sendPasswordChangedAlert(user.email, user.email);
    } catch (err) {
        console.error('[Event:auth.password_changed] Error:', err);
    }
});

notificationEmitter.on('cohort.assigned', async ({ user, cohort }) => {
    try {
        // In-app
        await Notification.create({
            userId: user._id,
            title: 'Cohort Intake Assigned',
            message: `Congratulations! You have been assigned to cohort "${cohort.name}". The learning platform is now active.`,
            type: 'success',
            link: '/dashboard/modules'
        });
        // Email
        await sendCohortWelcomeEmail(
            user.email,
            user.fullName || 'Participant',
            cohort.name,
            cohort.startDate
        );
    } catch (err) {
        console.error('[Event:cohort.assigned] Error:', err);
    }
});

notificationEmitter.on('cohort.override_changed', async ({ override }) => {
    try {
        // Alert active participants
        const activeApplications = await Application.find({ status: 'active' });
        const userIds = activeApplications.map(app => app.userId);
        const notifications = userIds.map(uid => ({
            userId: uid,
            title: 'Platform Access Updated',
            message: `An administrator has updated the platform launch configuration bounds. Mode: ${override}.`,
            type: 'info',
            link: '/dashboard'
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('[Event:cohort.override_changed] Error:', err);
    }
});

notificationEmitter.on('assessment.submitted', async ({ submission, assessment, moduleName, user }) => {
    try {
        let message = `Assessment submitted successfully. Score: ${submission.score}%. Status: ${submission.status}.`;
        if (submission.status === 'failed') {
            const attemptsRemaining = Math.max(0, assessment.maxAttempts - submission.attemptNumber);
            message = `You scored ${submission.score}% on "${assessment.title}". A minimum of ${assessment.passMark}% is required to pass. You have ${attemptsRemaining} attempt(s) remaining.`;
        } else if (submission.status === 'pending_review') {
            message = `Your submission for "${assessment.title}" has been received and is awaiting coordinator review for open-ended answers.`;
        } else if (submission.status === 'passed') {
            message = `Congratulations! You scored ${submission.score}% and passed the assessment for "${assessment.title}".`;
        }

        await Notification.create({
            userId: user._id,
            title: 'Assessment Attempt Completed',
            message,
            type: submission.status === 'passed' ? 'success' : submission.status === 'pending_review' ? 'info' : 'warning',
            link: `/dashboard/modules/${submission.moduleId}`
        });

        // In-app for admins if needs manual review
        if (submission.status === 'pending_review') {
            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            const adminAlerts = admins.map(admin => ({
                userId: admin._id,
                title: 'Manual Grading Required',
                message: `Student "${user.fullName || user.email}" submitted answers requiring manual review for module "${moduleName}".`,
                type: 'alert',
                link: `/admin/assessments/${assessment._id}`
            }));
            if (adminAlerts.length > 0) {
                await Notification.insertMany(adminAlerts);
            }
        }
    } catch (err) {
        console.error('[Event:assessment.submitted] Error:', err);
    }
});

notificationEmitter.on('assessment.graded', async ({ submission, assessment, user, attemptsRemaining }) => {
    try {
        // In-app
        await Notification.create({
            userId: user._id,
            title: 'Assessment Result Graded',
            message: `Your assessment attempt for "${assessment.title}" has been graded. Result: ${submission.status} with ${submission.score}%.`,
            type: submission.status === 'passed' ? 'success' : 'warning',
            link: `/dashboard/modules/${submission.moduleId}`
        });
        // Email
        await sendAssessmentGradedEmail(
            user.email,
            user.fullName || 'Participant',
            assessment.title,
            submission.score,
            submission.passed,
            attemptsRemaining
        );
    } catch (err) {
        console.error('[Event:assessment.graded] Error:', err);
    }
});

notificationEmitter.on('placement.matched', async ({ userId, userEmail, userFullName, partner, area, notes }) => {
    try {
        // In-app
        await Notification.create({
            userId: new Types.ObjectId(userId as string),
            title: 'Internship Placement Matched',
            message: `Congratulations! You have been matched with "${partner.name}" for your internship placement. Check your placement workspace for onboarding steps.`,
            type: 'success',
            link: '/dashboard/placement'
        });
        // Email
        await sendPlacementMatchedEmail(
            userEmail,
            userFullName || 'Participant',
            partner.name,
            area,
            notes
        );
    } catch (err) {
        console.error('[Event:placement.matched] Error:', err);
    }
});

notificationEmitter.on('placement.status_updated', async ({ userId, userEmail, userFullName, partnerName, status }) => {
    try {
        // In-app
        await Notification.create({
            userId: new Types.ObjectId(userId as string),
            title: 'Placement Status Updated',
            message: `Your internship placement status with "${partnerName}" has been updated to "${status}".`,
            type: 'info',
            link: '/dashboard/placement'
        });
    } catch (err) {
        console.error('[Event:placement.status_updated] Error:', err);
    }
});

notificationEmitter.on('partner.applied', async ({ email, companyName, contactPerson, hasOpenings, openings }) => {
    try {
        // 1. Send confirmation email to the applicant (partner)
        await sendPartnerApplicationReceived(email, companyName, contactPerson, hasOpenings, openings);

        // 2. Fetch all administrators from DB
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });

        // 3. Create in-app notifications and send alert emails for admins
        for (const admin of admins) {
            try {
                // Create in-app notification
                await Notification.create({
                    userId: admin._id,
                    title: 'New Partner Application',
                    message: `A new partnership application has been submitted by "${companyName}" (${contactPerson}).`,
                    type: 'info',
                    link: '/admin/partners/applications'
                });

                // Send notification email to the admin
                await sendAdminPartnerApplicationReceived(
                    admin.email,
                    companyName,
                    contactPerson,
                    email,
                    hasOpenings,
                    openings
                );
            } catch (adminErr) {
                console.error(`[Event:partner.applied] Error alerting admin ${admin.email}:`, adminErr);
            }
        }
    } catch (err) {
        console.error('[Event:partner.applied] Error:', err);
    }
});

notificationEmitter.on('partner.reviewed', async ({ email, companyName, contactPerson, status, adminNotes }) => {
    try {
        if (status === 'approved') {
            await sendPartnerApplicationApproved(email, companyName, contactPerson);
        } else {
            await sendPartnerApplicationDeclined(email, companyName, contactPerson, adminNotes);
        }
    } catch (err) {
        console.error('[Event:partner.reviewed] Error:', err);
    }
});

notificationEmitter.on('admin.broadcast', async ({ targetType, targetCohortId, targetEmail, title, message, notificationType, link }) => {
    try {
        if (targetType === 'individual') {
            if (!targetEmail) return;
            const emailLower = targetEmail.trim().toLowerCase();

            // Look up User
            const user = await User.findOne({ email: emailLower });
            if (user) {
                // Paid user / Admin / Participant
                await Notification.create({
                    userId: user._id,
                    title,
                    message,
                    type: notificationType || 'info',
                    link: link || '/dashboard'
                });
                await sendCustomBroadcastEmail(user.email, title, message);
            } else {
                // Not a user, check if Applicant
                const applicant = await Applicant.findOne({ email: emailLower });
                if (applicant) {
                    await sendCustomBroadcastEmail(applicant.email, title, message);
                } else {
                    // Send directly to the email
                    await sendCustomBroadcastEmail(emailLower, title, message);
                }
            }
        } else {
            // Target is cohort-based.
            let cohortFilter: any = {};
            if (targetCohortId && Types.ObjectId.isValid(targetCohortId as string)) {
                cohortFilter = { cohortId: new Types.ObjectId(targetCohortId as string) };
            }

            let recipientUserIds: Types.ObjectId[] = [];
            let recipientEmails: string[] = [];

            if (targetType === 'paid') {
                const apps = await Application.find({
                    ...cohortFilter,
                    status: { $in: ['payment_confirmed', 'active', 'completed'] }
                });
                recipientUserIds = apps.map((app: any) => app.userId);
            } else if (targetType === 'pending') {
                const applicants = await Applicant.find({
                    ...cohortFilter,
                    isPaid: { $ne: true }
                });
                recipientEmails = applicants.map((app: any) => app.email);
            } else if (targetType === 'all_applicants') {
                const apps = await Application.find({
                    ...cohortFilter,
                    status: { $in: ['payment_confirmed', 'active', 'completed'] }
                });
                recipientUserIds = apps.map((app: any) => app.userId);

                const applicants = await Applicant.find({
                    ...cohortFilter,
                    isPaid: { $ne: true }
                });
                recipientEmails = applicants.map((app: any) => app.email);
            }

            // A. Send to Paid Applicants (In-app + Email)
            if (recipientUserIds.length > 0) {
                const notifications = recipientUserIds.map(userId => ({
                    userId,
                    title,
                    message,
                    type: notificationType || 'info',
                    link: link || '/dashboard'
                }));
                await Notification.insertMany(notifications);

                const users = await User.find({ _id: { $in: recipientUserIds } });
                for (const user of users) {
                    recipientEmails.push(user.email);
                }
            }

            // B. Send Email to everyone in the final recipient list
            // De-duplicate emails
            const uniqueEmails = Array.from(new Set(recipientEmails.map(e => e.toLowerCase())));
            for (const email of uniqueEmails) {
                try {
                    await sendCustomBroadcastEmail(email, title, message);
                } catch (err) {
                    console.error('[Event:admin.broadcast] Email send fail to', email, err);
                }
            }
        }
    } catch (err) {
        console.error('[Event:admin.broadcast] Error:', err);
    }
});

notificationEmitter.on('module.published', async ({ moduleTitle }) => {
    try {
        const activeApps = await Application.find({ status: 'active' });
        const notifications = activeApps.map(app => ({
            userId: app.userId,
            title: 'New Coursework Published',
            message: `A new learning module "${moduleTitle}" has been published and is available in your outline.`,
            type: 'info',
            link: '/dashboard/modules'
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('[Event:module.published] Error:', err);
    }
});

notificationEmitter.on('assessment.published', async ({ assessmentTitle, moduleId }) => {
    try {
        const activeApps = await Application.find({ status: 'active' });
        const notifications = activeApps.map(app => ({
            userId: app.userId,
            title: 'New Module Assessment Unlocked',
            message: `An evaluation assessment for "${assessmentTitle}" has been published. Clear it to progress in the curriculum.`,
            type: 'info',
            link: `/dashboard/modules/${moduleId}`
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('[Event:assessment.published] Error:', err);
    }
});

notificationEmitter.on('module.completed', async ({ userId, moduleOrder, moduleTitle }) => {
    try {
        await Notification.create({
            userId: new Types.ObjectId(userId as string),
            title: 'Module Coursework Completed',
            message: `Well done! You have completed Module ${moduleOrder}: "${moduleTitle}". Keep up the great work!`,
            type: 'success',
            link: '/dashboard/modules',
        });
    } catch (err) {
        console.error('[Event:module.completed] Error:', err);
    }
});

notificationEmitter.on('assessment.attempts_reset', async ({ userId, assessment }) => {
    try {
        await Notification.create({
            userId: new Types.ObjectId(userId as string),
            title: 'Assessment Attempts Reset',
            message: `An administrator has reset your attempts for the assessment on module "${assessment.title}". You can now try again.`,
            type: 'info',
            link: `/dashboard/modules/${assessment.moduleId}`,
        });
    } catch (err) {
        console.error('[Event:assessment.attempts_reset] Error:', err);
    }
});

// ─── Partner Portal Events ────────────────────────────────────────────────────

/**
 * partner.interest_expressed
 * Fired when a partner submits an interest request.
 * Notifies all admins/superadmins in-app and sends an ops email alert.
 */
notificationEmitter.on('partner.interest_expressed', async ({ opsEmail, orgName, internName, note }) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const notifications = admins.map(admin => ({
            userId: admin._id,
            title: 'New Partner Interest Request',
            message: `${orgName} has expressed interest in intern ${internName}.`,
            type: 'info' as const,
            link: '/admin/partner-interests',
        }));
        if (notifications.length > 0) await Notification.insertMany(notifications);
        if (opsEmail) await sendInterestExpressedAlert(opsEmail, orgName, internName, note);
    } catch (err) {
        console.error('[Event:partner.interest_expressed] Error:', err);
    }
});

/**
 * partner.interest_approved
 * Fired when admin approves a partner interest request.
 * Notifies the partner user in-app + email, and the intern in-app + email.
 */
notificationEmitter.on('partner.interest_approved', async ({
    partnerUserId, partnerEmail, contactPerson, orgName,
    internUserId, internEmail, internName,
}) => {
    try {
        const notifications = [];
        if (partnerUserId) {
            notifications.push({
                userId: new Types.ObjectId(partnerUserId as string),
                title: 'Placement Request Approved',
                message: `Your interest request for ${internName} has been approved. Contact details are now visible in your placements.`,
                type: 'success' as const,
                link: '/partner-portal/placements',
            });
        }
        if (internUserId) {
            notifications.push({
                userId: new Types.ObjectId(internUserId as string),
                title: 'Internship Match',
                message: `You have been matched with ${orgName} for your internship placement.`,
                type: 'success' as const,
                link: '/dashboard',
            });
        }
        if (notifications.length > 0) await Notification.insertMany(notifications);
        if (partnerEmail) await sendInterestApprovedToPartner(partnerEmail, contactPerson, orgName, internName);
        if (internEmail) await sendPlacementMatchedToIntern(internEmail, internName, orgName);
    } catch (err) {
        console.error('[Event:partner.interest_approved] Error:', err);
    }
});

/**
 * partner.interest_declined
 * Fired when admin declines a partner interest request.
 * Notifies the partner user in-app + email.
 */
notificationEmitter.on('partner.interest_declined', async ({
    partnerUserId, partnerEmail, contactPerson, internName, adminReason,
}) => {
    try {
        if (partnerUserId) {
            await Notification.create({
                userId: new Types.ObjectId(partnerUserId as string),
                title: 'Interest Request Not Approved',
                message: `Your request for ${internName} was not approved.${adminReason ? ` Reason: ${adminReason}` : ''}`,
                type: 'warning' as const,
                link: '/partner-portal/requests',
            });
        }
        if (partnerEmail) await sendInterestDeclinedToPartner(partnerEmail, contactPerson, internName, adminReason);
    } catch (err) {
        console.error('[Event:partner.interest_declined] Error:', err);
    }
});

/**
 * partner.interview_logged
 * Fired when a partner logs interview details.
 * Notifies all admins in-app + email, and the intern in-app + email.
 */
notificationEmitter.on('partner.interview_logged', async ({
    opsEmail, orgName, internUserId, internEmail, internName, interviewDate, format
}) => {
    try {
        // 1. Send email to admin
        if (opsEmail) {
            await sendInterviewLoggedAlert(opsEmail, orgName, internName, interviewDate, format);
        }

        // 2. Notify all admins in-app
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const adminNotifications = admins.map(admin => ({
            userId: admin._id,
            title: 'Interview Scheduled by Partner',
            message: `${orgName} has scheduled an interview with intern ${internName} for ${interviewDate}.`,
            type: 'info' as const,
            link: '/admin/partner-interests',
        }));
        if (adminNotifications.length > 0) {
            await Notification.insertMany(adminNotifications);
        }

        // 3. Notify the intern in-app
        if (internUserId) {
            await Notification.create({
                userId: new Types.ObjectId(internUserId as string),
                title: 'Interview Scheduled',
                message: `An interview has been scheduled with ${orgName} on ${interviewDate} via ${format}. Check your email for more details.`,
                type: 'info' as const,
                link: '/dashboard/placement',
            });
        }

        // 4. Send email to the intern
        if (internEmail) {
            await sendInterviewScheduledToIntern(internEmail, internName, orgName, interviewDate, format);
        }
    } catch (err) {
        console.error('[Event:partner.interview_logged] Error:', err);
    }
});

/**
 * partner.outcome_logged
 * Fired when a partner logs an interview outcome.
 * If offer extended: notifies intern in-app + email. Always alerts ops.
 */
notificationEmitter.on('partner.outcome_logged', async ({
    opsEmail, orgName, internUserId, internEmail, internName, outcome,
}) => {
    try {
        if (opsEmail) await sendOutcomeLoggedAlert(opsEmail, orgName, internName, outcome);
        if (outcome === 'offer_extended' && internUserId) {
            await Notification.create({
                userId: new Types.ObjectId(internUserId as string),
                title: 'Placement Offer Extended',
                message: `${orgName} has extended a placement offer to you. Please respond to them directly.`,
                type: 'success' as const,
                link: '/dashboard',
            });
            if (internEmail) await sendOfferExtendedToIntern(internEmail, internName, orgName);
        }
    } catch (err) {
        console.error('[Event:partner.outcome_logged] Error:', err);
    }
});

/**
 * participant.placement_ready
 * Fired automatically when a candidate passes the final module assessment,
 * OR manually when an admin promotes a candidate via the admin dashboard.
 *
 * - Sends the candidate an in-app congratulatory notification.
 * - Notifies all admins/superadmins that a new candidate is placement-ready.
 */
notificationEmitter.on('participant.placement_ready', async ({ userId }) => {
    try {
        const userObjId = new Types.ObjectId(userId as string);

        // Resolve user details
        const user = await User.findById(userObjId);
        if (!user) return;

        // 1. In-app notification to the candidate
        await Notification.create({
            userId: userObjId,
            title: 'You Are Now Placement-Ready!',
            message:
                'Congratulations! You have successfully completed the IFIP curriculum and are now placement-ready. Partner organisations can now view your profile and may reach out with placement opportunities.',
            type: 'success',
            link: '/dashboard',
        });

        // 2. In-app alert to all admins
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const adminNotifications = admins.map((admin) => ({
            userId: admin._id,
            title: 'Candidate Now Placement-Ready',
            message: `${user.fullName || user.email} has completed the full IFIP curriculum and is now placement-ready. You can assign them on the Matching Desk.`,
            type: 'info' as const,
            link: '/admin/placements',
        }));
        if (adminNotifications.length > 0) {
            await Notification.insertMany(adminNotifications);
        }
    } catch (err) {
        console.error('[Event:participant.placement_ready] Error:', err);
    }
});
