import { startReminderWorker } from './services/reminderJobs.js';
import { deliverPendingReminderBatch } from './controllers/adminController.js';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { connectRedis } from './services/redisService.js';
import { PartnerOrganization } from './models/PartnerOrganization.js';
import { startInterviewReminderCron } from './services/interviewReminderCron.js';
import { startCohortWaitlistCron } from './services/cohortWaitlist.js';

const PORT = Number(env.PORT);

Promise.all([connectDB(), connectRedis()]).then(async () => {
    // Migration: Set portalEnabled to false for existing partners who have never been invited
    try {
        await PartnerOrganization.updateMany(
            { 
                portalEnabled: { $exists: false },
                $or: [ { inviteSentAt: { $exists: false } }, { inviteSentAt: null } ] 
            },
            { $set: { portalEnabled: false } }
        );
        console.log('Database migration: portalEnabled set to false for uninvited partners');
    } catch (migErr: any) {
        console.error('Database migration error:', migErr.message);
    }

    // Initialize interview reminder cron (runs every 5 minutes, checks only scheduled interviews)
    startInterviewReminderCron();
    startCohortWaitlistCron();
    startReminderWorker(deliverPendingReminderBatch);

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
