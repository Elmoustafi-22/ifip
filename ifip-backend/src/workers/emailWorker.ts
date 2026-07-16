import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redisConnection.js';
import {
    sendOtpEmail,
    sendResumeLinkEmail,
    sendPaymentSuccessEmail,
    sendSetPasswordEmail,
    sendWaitlistEmail,
    sendCohortWelcomeEmail,
    sendAssessmentGradedEmail,
    sendPlacementMatchedEmail,
    sendPasswordChangedAlert,
    sendAdminEnrollmentDigest,
    sendCustomBroadcastEmail,
    sendPartnerApplicationReceived,
    sendPartnerApplicationApproved,
    sendPartnerApplicationDeclined
} from '../services/emailService.js';

export const emailWorker = new Worker(
    'emailQueue',
    async (job: Job) => {
        const { type, data } = job.data;
        console.log(`[Queue Worker] Processing background job: "${type}" for ${data.to || data.email}`);

        switch (type) {
            case 'otp':
                await sendOtpEmail(data.email, data.otp);
                break;
            case 'resume_link':
                await sendResumeLinkEmail(data.email, data.token, data.isPaid);
                break;
            case 'payment_success':
                await sendPaymentSuccessEmail(data.email, data.resumeToken, data.country);
                break;
            case 'set_password':
                await sendSetPasswordEmail(data.email, data.setPasswordToken, data.country);
                break;
            case 'waitlist':
                await sendWaitlistEmail(data.to, data.cohortName);
                break;
            case 'welcome':
                await sendCohortWelcomeEmail(data.to, data.fullName, data.cohortName, data.kickoffDate);
                break;
            case 'graded':
                await sendAssessmentGradedEmail(data.to, data.fullName, data.assessmentTitle, data.score, data.passed, data.attemptsRemaining);
                break;
            case 'match':
                await sendPlacementMatchedEmail(data.to, data.fullName, data.partnerName, data.area, data.onboardingNotes);
                break;
            case 'password_changed':
                await sendPasswordChangedAlert(data.to, data.email);
                break;
            case 'admin_digest':
                await sendAdminEnrollmentDigest(data.to, data.newStudentCount);
                break;
            case 'custom_broadcast':
                await sendCustomBroadcastEmail(data.to, data.title, data.message);
                break;
            case 'partner_applied':
                await sendPartnerApplicationReceived(data.email, data.companyName, data.contactPerson);
                break;
            case 'partner_reviewed_approved':
                await sendPartnerApplicationApproved(data.email, data.companyName, data.contactPerson);
                break;
            case 'partner_reviewed_declined':
                await sendPartnerApplicationDeclined(data.email, data.companyName, data.contactPerson, data.adminNotes);
                break;
            default:
                console.warn(`[Queue Worker] Received unsupported task type: ${type}`);
        }
    },
    {
        connection: redisConnection,
        concurrency: 5 // Process up to 5 email jobs concurrently
    }
);

emailWorker.on('completed', (job) => {
    console.log(`[Queue Worker] Job completed successfully: ID ${job.id}, Type "${job.name}"`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`[Queue Worker] Job failed: ID ${job?.id}, Type "${job?.name}". Error: ${err.message}`);
});
