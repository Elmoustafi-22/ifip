import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/abdul/Desktop/IFIP-Folder/IFIP/ifip-backend/.env' });

async function fixAssessmentData() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not found");
    return;
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const assessments = await mongoose.connection.collection('assessments').find({}).toArray();

  for (const ass of assessments) {
    let modified = false;
    const questions = ass.questions || [];

    for (const q of questions) {
      // Fix matching pairs for Riba, Gharar, Maysir
      if (q.type === 'matching' && q.matchingPairs) {
        const hasRiba = q.matchingPairs.some((p: any) => p.left.toLowerCase().includes('riba'));
        const hasGharar = q.matchingPairs.some((p: any) => p.left.toLowerCase().includes('gharar'));
        const hasMaysir = q.matchingPairs.some((p: any) => p.left.toLowerCase().includes('maysir'));

        if (hasRiba && hasGharar && hasMaysir) {
          console.log(`Fixing matching pairs for assessment "${ass.title}", question: "${q.text?.substring(0, 30)}..."`);
          q.matchingPairs = [
            { left: 'Riba', right: 'Prohibited increase/interest' },
            { left: 'Gharar', right: 'Excessive uncertainty' },
            { left: 'Maysir', right: 'Gambling or chance-based gain' }
          ];
          modified = true;
        }
      }

      // Populate accepted keywords for short answer questions based on explanation / modelAnswer
      if (q.type === 'short_answer') {
        const keywords = new Set<string>(q.acceptedKeywords || []);
        
        if (q.explanation) {
          // If explanation is a short phrase like "Sukuk", "Shariah", "Murabaha"
          const cleanExpl = q.explanation.replace(/[*_`#]/g, '').trim();
          if (cleanExpl.length < 50) {
            keywords.add(cleanExpl.toLowerCase());
          }
          // Extract terms in bold e.g. **Sukuk**, **Riba**, **Murabaha**
          const boldMatches = q.explanation.match(/\*\*([^*]+)\*\*/g) || [];
          for (const bm of boldMatches) {
            const term = bm.replace(/\*\*/g, '').trim().toLowerCase();
            if (term.length > 2) keywords.add(term);
          }
        }

        // Specific question keyword additions
        if (q.text?.toLowerCase().includes('shariah principles') || q.text?.toLowerCase().includes('principles.')) {
          keywords.add('shariah');
          keywords.add("shari'ah");
          keywords.add('sharia');
        }
        if (q.text?.toLowerCase().includes('mudarabah') && q.text?.toLowerCase().includes('one party provides')) {
          keywords.add('capital');
          keywords.add('management');
          keywords.add('expertise');
          keywords.add('labor');
        }
        if (q.text?.toLowerCase().includes('infrastructure project') || q.text?.toLowerCase().includes('capital-market')) {
          keywords.add('sukuk');
          keywords.add('islamic bonds');
        }
        if (q.text?.toLowerCase().includes('scenario 1 — riba') || q.text?.toLowerCase().includes('conventional loan of')) {
          keywords.add('riba');
          keywords.add('interest');
        }
        if (q.text?.toLowerCase().includes('scenario 2') || q.text?.toLowerCase().includes('bank purchases it and resells')) {
          keywords.add('murabaha');
          keywords.add('cost-plus');
        }
        if (q.text?.toLowerCase().includes('scenario 3') || q.text?.toLowerCase().includes('raise funds for a major infrastructure')) {
          keywords.add('sukuk');
          keywords.add('islamic capital market');
        }

        q.acceptedKeywords = Array.from(keywords);
        modified = true;
      }
    }

    if (modified) {
      await mongoose.connection.collection('assessments').updateOne(
        { _id: ass._id },
        { $set: { questions } }
      );
      console.log(`Updated assessment: ${ass._id} ("${ass.title}")`);
    }
  }

  console.log("Assessment data repair complete.");
  await mongoose.disconnect();
}

fixAssessmentData().catch(console.error);
