import { sendTestEmail } from '../services/emailService.js';

const recipient = process.argv[2] || 'mustophaqadir@gmail.com';

try {
    await sendTestEmail(recipient);
    console.log(`OutboxStack accepted the test email for ${recipient}. This confirms queueing, not inbox delivery.`);
} catch (error) {
    console.error(`OutboxStack could not queue the test email for ${recipient}:`, error);
    process.exitCode = 1;
}
