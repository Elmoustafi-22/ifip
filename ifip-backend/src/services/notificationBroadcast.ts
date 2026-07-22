import { EventEmitter } from 'events';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
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

notificationEmitter.on('admin.broadcast', async ({ targetType, targetUserId, title, message, notificationType, link }) => {
    try {
        // 1. In-app
        if (targetType === 'individual' && targetUserId) {
            await Notification.create({
                userId: new Types.ObjectId(targetUserId as string),
                title,
                message,
                type: notificationType || 'info',
                link: link || '/dashboard'
            });
            const user = await User.findById(targetUserId);
            if (user) {
                await sendCustomBroadcastEmail(user.email, title, message);
            }
        } else {
            // Broadcast to all active participants
            const activeApps = await Application.find({ status: 'active' });
            const notifications = activeApps.map(app => ({
                userId: app.userId,
                title,
                message,
                type: notificationType || 'info',
                link: link || '/dashboard'
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }

            // Email to all active participants
            const users = await User.find({ _id: { $in: activeApps.map(app => app.userId) } });
            for (const user of users) {
                try {
                    await sendCustomBroadcastEmail(user.email, title, message);
                } catch (err) {
                    console.error('[Event:admin.broadcast] Email send fail to', user.email, err);
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
