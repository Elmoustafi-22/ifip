import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Module } from '../models/Module.js';
import { Assessment, IQuestion } from '../models/Assessment.js';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ifip_lms';

async function seedKnowledgeCheck() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Find or create admin user for attribution
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            admin = await User.findOne({});
        }
        const adminId = admin ? admin._id : new Types.ObjectId();

        // 1. Find or verify Module 1
        let module1 = await Module.findOne({ order: 1 });
        if (!module1) {
            console.log('Creating Module 1: Foundations of Islamic Economics & Finance...');
            module1 = await Module.create({
                title: 'Foundations of Islamic Economics and Finance',
                description: 'Explore the philosophical foundations, core Shariah principles, prohibitions (Riba, Gharar, Maysir), commercial contracts, and the global Islamic finance ecosystem.',
                order: 1,
                weekNumber: 1,
                contentType: 'text',
                estimatedDuration: 0,
                body: `# MODULE 1: FOUNDATIONS OF ISLAMIC ECONOMICS AND FINANCE

## Overview
Islamic economics is a branch of knowledge that helps realize human well-being through an allocation and distribution of scarce resources that is in conformity with Islamic teachings without unduly curbing individual freedom or creating continued macroeconomic and ecological imbalances.

### Core Distinctions
1. **Moral and Ethical Framework:** Economic activity is guided by moral responsibility (Amanah).
2. **Prohibition of Exploitation:** Prohibits Riba (interest/usury), Gharar (excessive ambiguity/deception), and Maysir (gambling/unearned speculative gain).
3. **Asset-Backed & Risk-Sharing:** Transactions must be linked to real economic activities, assets, or services, sharing genuine risk and return.

---

## 1. Key Prohibitions
- **Riba (Usury/Interest):** Any predetermined, guaranteed excess on a loan with no counter-value or risk.
- **Gharar (Excessive Uncertainty):** Lack of clarity or transparency in contract terms, subject matter, pricing, or deliverability.
- **Maysir (Gambling):** Gaining wealth purely based on chance, lottery, or speculative zero-sum bets at another's expense.

---

## 2. Fundamental Contracts
- **Murabaha:** Cost-plus markup sale. The financier purchases an asset and sells it to the client with an agreed markup and deferred payment schedule.
- **Ijarah:** Leasing contract where the owner transfers the usufruct (use) of an asset for an agreed rent and duration.
- **Mudarabah:** Trustee partnership where one party (Rab-ul-Mal) provides 100% of the capital, and the other (Mudarib) manages the business. Profits are shared per agreed ratio; financial losses are borne solely by capital provider.
- **Musharakah:** Joint venture partnership where all partners contribute capital and share profits according to agreement, and losses strictly pro-rata to capital contribution.
- **Sukuk:** Islamic investment certificates representing undivided ownership shares in tangible assets, usufruct, or services.
`,
                createdBy: adminId
            });
        } else {
            module1.weekNumber = 1;
            module1.estimatedDuration = 0;
            await module1.save();
        }

        console.log(`Module 1 ID: ${module1._id}`);

        // 2. Build Questions aligned with PROPOSED IFIPP CURRICULUM.md (L557-L682)
        const opt = (text: string) => ({ _id: new Types.ObjectId(), text });

        const q1Opts = [opt('Shariah'), opt('Conventional'), opt('Secular'), opt('Capitalist')];
        const q3Opts = [opt('A. Riba'), opt('B. Gharar'), opt('C. Maysir'), opt('D. Ijarah')];
        const q4Opts = [opt('A. Ijarah'), opt('B. Murabaha'), opt('C. Mudarabah'), opt('D. Salam')];
        const q5Opts = [
            opt('A. Capital; Labor and Management'),
            opt('B. Equipment; Debt financing'),
            opt('C. Collateral; Guaranteed interest'),
            opt('D. Land; Agricultural tools')
        ];
        const q6Opts = [
            opt('A. Islamic finance does not allow people to earn profits.'),
            opt('B. Islamic finance prohibits all forms of risk.'),
            opt('C. Islamic finance structures financial activities according to Shariah requirements.'),
            opt('D. Conventional finance cannot finance businesses.')
        ];
        const q7Opts = [
            opt('A. Sukuk (Islamic Investment Certificates)'),
            opt('B. Conventional Treasury Bills'),
            opt('C. High-Yield Interest Bonds'),
            opt('D. Speculative Currency Swaps')
        ];
        const q8Opts = [
            opt('Islamic Banking'),
            opt('Takaful (Islamic Insurance)'),
            opt('Islamic Investments & Asset Management'),
            opt('Sukuk & Capital Markets'),
            opt('Islamic Fintech & Digital Solutions'),
            opt('Shariah Advisory & Supervisory Boards'),
            opt('Compliance & Governance'),
            opt('Marketing & Communications')
        ];
        const q10Opts = [opt('A. Murabaha (Cost-Plus Sale)'), opt('B. Ijarah (Lease)'), opt('C. Salam (Forward Sale)'), opt('D. Istisna')];
        const q11Opts = [opt('A. Sukuk & Capital Markets'), opt('B. Microfinance Lending'), opt('C. Interbank Overdraft'), opt('D. Margin Trading')];

        const questions: IQuestion[] = [
            {
                _id: new Types.ObjectId(),
                text: 'Complete the thought: Islamic finance is financial activity guided by __________ principles.',
                type: 'mcq',
                options: q1Opts,
                correctOptionIds: [q1Opts[0]._id],
                acceptedKeywords: ['shariah', "shari'ah", 'sharia'],
                explanation: 'Islamic finance is fundamentally underpinned by Shariah (Islamic law) principles derived from the Quran and Sunnah.',
                partialCredit: false,
                points: 1,
                order: 1
            },
            {
                _id: new Types.ObjectId(),
                text: 'Match each Islamic economic concept to its corresponding meaning:',
                type: 'matching',
                options: [],
                correctOptionIds: [],
                matchingPairs: [
                    { left: 'Riba', right: 'Prohibited increase / interest on loans' },
                    { left: 'Gharar', right: 'Excessive uncertainty and ambiguity in transactions' },
                    { left: 'Maysir', right: 'Gambling or chance-based speculative gain' }
                ],
                explanation: 'Riba is unjustifiable increase/interest, Gharar is excessive uncertainty or lack of full disclosure, and Maysir is gambling.',
                partialCredit: true,
                points: 3,
                order: 2
            },
            {
                _id: new Types.ObjectId(),
                text: 'A customer enters a financial agreement but important terms of the transaction are unclear, creating significant uncertainty between the parties. Which principle does this raise?',
                type: 'mcq',
                options: q3Opts,
                correctOptionIds: [q3Opts[1]._id], // B. Gharar
                explanation: 'Gharar refers to ambiguity, hazard, or uncertainty regarding the contract subject matter, price, or delivery.',
                partialCredit: false,
                points: 1,
                order: 3
            },
            {
                _id: new Types.ObjectId(),
                text: 'A business needs equipment and wants to acquire it through a cost-plus sale. Which contract immediately comes to mind?',
                type: 'mcq',
                options: q4Opts,
                correctOptionIds: [q4Opts[1]._id], // B. Murabaha
                explanation: 'Murabaha is a cost-plus financing contract where the seller explicitly discloses the purchase price and profit markup to the buyer.',
                partialCredit: false,
                points: 1,
                order: 4
            },
            {
                _id: new Types.ObjectId(),
                text: 'Complete the contract: In a Mudarabah arrangement, how are contributions structured?',
                type: 'mcq',
                options: q5Opts,
                correctOptionIds: [q5Opts[0]._id], // A
                explanation: 'In Mudarabah, the financier (Rab-ul-Mal) provides 100% of the capital, while the entrepreneur (Mudarib) contributes labor, expertise, and management.',
                partialCredit: false,
                points: 1,
                order: 5
            },
            {
                _id: new Types.ObjectId(),
                text: 'Which statement best describes a key difference between Islamic and conventional finance?',
                type: 'mcq',
                options: q6Opts,
                correctOptionIds: [q6Opts[2]._id], // C
                explanation: 'Islamic finance is value-oriented and requires all financial transactions to comply with Shariah requirements, linking finance to real tangible assets.',
                partialCredit: false,
                points: 1,
                order: 6
            },
            {
                _id: new Types.ObjectId(),
                text: 'A government wants to raise funds for an infrastructure project through an Islamic capital-market instrument. What comes to mind?',
                type: 'mcq',
                options: q7Opts,
                correctOptionIds: [q7Opts[0]._id], // A. Sukuk
                explanation: 'Sukuk are Islamic asset-backed or asset-based trust certificates frequently used by sovereigns and corporations for major infrastructure projects.',
                partialCredit: false,
                points: 1,
                order: 7
            },
            {
                _id: new Types.ObjectId(),
                text: 'Ecosystem Challenge: Which of the following components can be part of the Islamic finance ecosystem? (Select all that apply)',
                type: 'multi_select',
                options: q8Opts,
                correctOptionIds: q8Opts.map(o => o._id), // All are correct!
                explanation: 'All of these sectors form part of the modern, comprehensive Islamic financial ecosystem.',
                partialCredit: true,
                points: 2,
                order: 8
            },
            {
                _id: new Types.ObjectId(),
                text: 'Scenario Analysis 1 — Riba: A business takes a conventional loan of ₦5 million. The agreement requires the business to repay ₦5.8 million after one year regardless of business performance. Which principle is violated and why?',
                type: 'short_answer',
                options: [],
                correctOptionIds: [],
                acceptedKeywords: ['riba', 'interest', 'usury', 'fixed increase', 'guaranteed return'],
                explanation: 'This violates the prohibition of Riba (Riba al-Qard) because it guarantees an excess return on money loaned without bearing business risk.',
                partialCredit: false,
                points: 1,
                order: 9
            },
            {
                _id: new Types.ObjectId(),
                text: 'Scenario Analysis 2 — Choosing a Contract: An Islamic bank purchases equipment requested by a client and resells it to the client at an agreed cost plus profit margin with deferred installments. Which contract is being used?',
                type: 'mcq',
                options: q10Opts,
                correctOptionIds: [q10Opts[0]._id], // A. Murabaha
                explanation: 'This is a classic Murabaha to the Purchase Orderer (MPO) transaction.',
                partialCredit: false,
                points: 1,
                order: 10
            },
            {
                _id: new Types.ObjectId(),
                text: 'Scenario Analysis 3 — Ecosystem: A sovereign government needs financing for high-speed rail development and invites international investors to participate in a Shariah-compliant asset structure. Which area and instrument is used?',
                type: 'mcq',
                options: q11Opts,
                correctOptionIds: [q11Opts[0]._id], // A. Sukuk
                explanation: 'Islamic Capital Markets through Sukuk (such as Sukuk Ijarah or Sukuk Istisna-Ijarah) are designed specifically for infrastructure funding.',
                partialCredit: false,
                points: 1,
                order: 11
            }
        ];

        // 3. Create or update assessment for Module 1
        let assessment = await Assessment.findOne({ moduleId: module1._id });
        if (assessment) {
            assessment.title = 'Week 1 Knowledge Check: Foundations of Islamic Finance';
            assessment.instructions = `### Instructions for Week 1 Knowledge Check
- **Time Limit:** 20 Minutes
- **Pass Mark:** 70%
- **Questions:** 11 Total (MCQs, Concept Matching, Multi-Select & Scenarios)
- **Integrity Notice:** Anti-cheat tab monitoring is active. Do not switch tabs or navigate away during the assessment.
- **Offline Resilient:** Your answers are auto-saved locally in real-time.`;
            assessment.status = 'published';
            assessment.passMark = 70;
            assessment.maxAttempts = 3;
            assessment.timeLimitMinutes = 20;
            assessment.questions = questions;
            await assessment.save();
            console.log('Updated existing assessment for Module 1.');
        } else {
            assessment = await Assessment.create({
                moduleId: module1._id,
                title: 'Week 1 Knowledge Check: Foundations of Islamic Finance',
                instructions: `### Instructions for Week 1 Knowledge Check
- **Time Limit:** 20 Minutes
- **Pass Mark:** 70%
- **Questions:** 11 Total (MCQs, Concept Matching, Multi-Select & Scenarios)
- **Integrity Notice:** Anti-cheat tab monitoring is active. Do not switch tabs or navigate away during the assessment.
- **Offline Resilient:** Your answers are auto-saved locally in real-time.`,
                status: 'published',
                passMark: 70,
                maxAttempts: 3,
                timeLimitMinutes: 20,
                questions,
                createdBy: adminId
            });
            console.log('Created new assessment for Module 1.');
        }

        // 4. Attach assessmentId to Module 1
        module1.assessmentId = assessment._id as Types.ObjectId;
        await module1.save();

        console.log('✅ Knowledge Check successfully seeded and linked to Week 1 / Module 1.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedKnowledgeCheck();
