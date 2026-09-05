import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/abdul/Desktop/IFIP-Folder/IFIP/ifip-backend/.env' });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not found in env");
    return;
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const assessments = await mongoose.connection.collection('assessments').find({}).toArray();
  console.log(`Found ${assessments.length} assessment(s)`);

  for (const ass of assessments) {
    console.log(`\n========================================`);
    console.log(`Assessment ID: ${ass._id}, Title: "${ass.title}", Status: ${ass.status}`);
    for (const [idx, q] of (ass.questions || []).entries()) {
      console.log(`  Q${idx + 1} (${q.type}): "${q.text?.substring(0, 60)}..."`);
      if (q.type === 'matching') {
        console.log(`    matchingPairs:`, JSON.stringify(q.matchingPairs, null, 2));
      }
      if (q.type === 'short_answer') {
        console.log(`    acceptedKeywords:`, q.acceptedKeywords);
        console.log(`    explanation/modelAnswer:`, q.explanation);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
