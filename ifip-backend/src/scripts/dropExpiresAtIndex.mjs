/**
 * One-time migration: Remove TTL index & clear expiresAt from all applicants.
 *
 * Run from the ifip-backend directory:
 *   node src/scripts/dropExpiresAtIndex.mjs
 *
 * The script is idempotent — safe to run multiple times.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('ERROR: MONGO_URI is not set in .env');
    process.exit(1);
}

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const col = mongoose.connection.collection('applicants');

    // 1. Drop the TTL index (if it still exists).
    try {
        await col.dropIndex('expiresAt_1');
        console.log('Dropped TTL index "expiresAt_1".');
    } catch (err) {
        if (err?.codeName === 'IndexNotFound' || err?.code === 27) {
            console.log('TTL index "expiresAt_1" not found — already dropped or never existed.');
        } else {
            throw err;
        }
    }

    // 2. Unset expiresAt on all existing applicant documents.
    const result = await col.updateMany(
        { expiresAt: { $exists: true } },
        { $unset: { expiresAt: '' } }
    );
    console.log(`Cleared expiresAt from ${result.modifiedCount} applicant document(s).`);

    await mongoose.disconnect();
    console.log('Done. Disconnected from MongoDB.');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
