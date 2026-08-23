import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { schedulePurgeJob } from './jobs/purgeOphanedCvs.js';
import { connectRedis } from './services/redisService.js';
import { PartnerOrganization } from './models/PartnerOrganization.js';

const PORT = Number(env.PORT);

Promise.all([connectDB(), connectRedis()]).then(async () => {
    // Migration: Set portalEnabled to false for existing partners who have never been invited
    try {
        await PartnerOrganization.updateMany(
            { $or: [ { inviteSentAt: { $exists: false } }, { inviteSentAt: null } ] },
            { $set: { portalEnabled: false } }
        );
        console.log('Database migration: portalEnabled set to false for uninvited partners');
    } catch (migErr: any) {
        console.error('Database migration error:', migErr.message);
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    schedulePurgeJob();
});