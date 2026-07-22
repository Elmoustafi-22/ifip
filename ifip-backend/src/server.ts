import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { schedulePurgeJob } from './jobs/purgeOphanedCvs.js';
import { connectRedis } from './services/redisService.js';

const PORT = Number(env.PORT);

Promise.all([connectDB(), connectRedis()]).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    schedulePurgeJob();
});