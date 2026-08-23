import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Application } from '../models/Application.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { env } from '../config/env.js';

const partnerEmail = 'partner@ifip.com';
const partnerPassword = 'PartnerPassword123!';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected.');

        // 1. Ensure PartnerOrganization exists
        let org = await PartnerOrganization.findOne({ contactEmail: partnerEmail });
        if (!org) {
            org = await PartnerOrganization.findOne({});
        }

        if (!org) {
            console.log('Creating demo PartnerOrganization...');
            org = await PartnerOrganization.create({
                name: 'Stecs Financial Advisory',
                logoUrl: 'https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png',
                description: 'Providing premium accounting, financial consulting, advisory and tax services.',
                sectorTags: ['Financial Services', 'Advisory', 'Islamic Banking'],
                activeSlots: 5,
                contactEmail: partnerEmail,
                contactPerson: 'Amina Al-Mansoor',
                contactPhone: '+2348012345678',
                website: 'https://stecs.ng/',
                portalEnabled: true,
                hasOpenings: true,
                openings: [
                    { role: 'Islamic Finance Analyst', mode: 'Hybrid', location: 'Victoria Island, Lagos', count: 2 },
                    { role: 'Sukuk Structuring Intern', mode: 'Remote', count: 1 }
                ]
            });
        } else {
            org.contactEmail = partnerEmail;
            org.contactPerson = 'Amina Al-Mansoor';
            org.portalEnabled = true;
            await org.save();
        }

        // 2. Create or Update Partner User
        const passwordHash = await bcrypt.hash(partnerPassword, 12);
        let partnerUser = await User.findOne({ email: partnerEmail });
        if (!partnerUser) {
            partnerUser = await User.create({
                email: partnerEmail,
                passwordHash,
                role: 'partner',
                fullName: 'Amina Al-Mansoor',
                phone: '+2348012345678',
                orgId: org._id,
                emailVerified: true
            });
            console.log('Created new partner user account.');
        } else {
            partnerUser.passwordHash = passwordHash;
            partnerUser.role = 'partner';
            partnerUser.orgId = org._id as any;
            partnerUser.emailVerified = true;
            await partnerUser.save();
            console.log('Updated existing user account to partner role.');
        }

        // 3. Seed 12 Placement-Ready Intern Candidates covering all interest domains
        const candidates = [
            {
                email: 'candidate.fatima@example.com',
                fullName: 'Fatima Z. Bello',
                country: 'Nigeria',
                avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                interests: ['Islamic Capital Markets', 'Sukuk Structuring'],
                tools: ['Excel Financial Modeling', 'Bloomberg Terminal', 'Python'],
                languages: ['English', 'Arabic'],
                whyApplying: 'I want to build a career in structuring Shariah-compliant capital market instruments across West Africa.',
                careerGoals: 'To become a certified Shariah Advisory Lead in investment banking.',
                academic: { institution: 'University of Lagos', fieldOfStudy: 'Economics & Finance', qualification: 'B.Sc. First Class', gradYear: 2025 },
                score: 92
            },
            {
                email: 'candidate.tariq@example.com',
                fullName: 'Tariq Al-Hassan',
                country: 'United Kingdom',
                avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                interests: ['FinTech & Takaful', 'Islamic Banking'],
                tools: ['SQL', 'Tableau', 'PowerBI'],
                languages: ['English'],
                whyApplying: 'Eager to apply quantitative analytics to micro-Takaful risk modeling and ethical digital banking products.',
                careerGoals: 'Lead product development for an ethical digital bank in Europe/Africa.',
                academic: { institution: 'London School of Economics', fieldOfStudy: 'Finance & Risk Management', qualification: 'M.Sc. Distinction', gradYear: 2024 },
                score: 88
            },
            {
                email: 'candidate.zainab@example.com',
                fullName: 'Zainab Ibrahim',
                country: 'Malaysia',
                avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
                interests: ['Wealth Management', 'ESG & Sustainable Finance'],
                tools: ['SPSS', 'Financial Analysis', 'Pitchbook'],
                languages: ['Malay', 'English'],
                whyApplying: 'Passionate about integrating ESG sustainability metrics into Islamic wealth management portfolios.',
                careerGoals: 'ESG & Shariah Compliance Director at an international fund manager.',
                academic: { institution: 'International Islamic University Malaysia', fieldOfStudy: 'Islamic Finance', qualification: 'B.Sc. High Distinction', gradYear: 2025 },
                score: 95
            },
            {
                email: 'candidate.bilal@example.com',
                fullName: 'Bilal Ahmed',
                country: 'United Arab Emirates',
                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                interests: ['Islamic Banking', 'Shariah Governance'],
                tools: ['Credit Risk Modeling', 'Core Banking Software', 'Excel'],
                languages: ['Arabic', 'English'],
                whyApplying: 'Dedicated to strengthening Islamic retail banking credit risk assessments and Shariah audit frameworks.',
                careerGoals: 'Head of Shariah Audit & Governance at a regional commercial bank.',
                academic: { institution: 'American University of Sharjah', fieldOfStudy: 'Banking & Shariah Law', qualification: 'B.Sc. Honors', gradYear: 2025 },
                score: 90
            },
            {
                email: 'candidate.hamza@example.com',
                fullName: 'Hamza Malik',
                country: 'Pakistan',
                avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
                interests: ['Sukuk Structuring', 'Islamic Capital Markets'],
                tools: ['VBA', 'Financial Valuation', 'Capital Markets'],
                languages: ['Urdu', 'English'],
                whyApplying: 'Focusing on sovereign and corporate Sukuk issuance models for emerging markets infrastructure.',
                careerGoals: 'Senior Capital Markets Associate specializing in Islamic debt capital instruments.',
                academic: { institution: 'Lahore University of Management Sciences', fieldOfStudy: 'Accounting & Finance', qualification: 'B.Sc. Distinction', gradYear: 2024 },
                score: 94
            },
            {
                email: 'candidate.amira@example.com',
                fullName: 'Amira Nur',
                country: 'Indonesia',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                interests: ['ESG & Sustainable Finance', 'FinTech & Takaful'],
                tools: ['Python Data Analysis', 'Green Bond Structuring', 'ESG Analytics'],
                languages: ['Indonesian', 'English'],
                whyApplying: 'Combining Islamic micro-finance with digital green Sukuk solutions to empower rural communities.',
                careerGoals: 'Sustainable Finance Lead at a global development bank.',
                academic: { institution: 'Universitas Indonesia', fieldOfStudy: 'Development Economics', qualification: 'M.Sc. Cum Laude', gradYear: 2025 },
                score: 96
            },
            {
                email: 'candidate.omar@example.com',
                fullName: 'Omar Farooq',
                country: 'Saudi Arabia',
                avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
                interests: ['Shariah Governance', 'Islamic Banking'],
                tools: ['AAOIFI Standards', 'Regulatory Compliance', 'Legal Drafting'],
                languages: ['Arabic', 'English'],
                whyApplying: 'Committed to advancing AAOIFI Shariah standards implementation in commercial banking operations.',
                careerGoals: 'Shariah Advisory Board Member and Compliance Officer.',
                academic: { institution: 'King Fahd University of Petroleum & Minerals', fieldOfStudy: 'Islamic Jurisprudence & Finance', qualification: 'B.Sc. Magna Cum Laude', gradYear: 2024 },
                score: 91
            },
            {
                email: 'candidate.khadija@example.com',
                fullName: 'Khadija Mahmoud',
                country: 'Jordan',
                avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
                interests: ['Wealth Management', 'Islamic Banking'],
                tools: ['Portfolio Optimization', 'Asset Allocation', 'Wealth Planning'],
                languages: ['Arabic', 'English', 'French'],
                whyApplying: 'Helping high-net-worth individuals structure ethical, Shariah-compliant asset portfolios.',
                careerGoals: 'Private Wealth Manager at an Islamic Investment Firm.',
                academic: { institution: 'University of Jordan', fieldOfStudy: 'Finance & Banking', qualification: 'B.Sc. First Class', gradYear: 2025 },
                score: 89
            },
            {
                email: 'candidate.rashid@example.com',
                fullName: 'Rashid Al-Maktoum',
                country: 'Qatar',
                avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
                interests: ['FinTech & Takaful', 'Islamic Capital Markets'],
                tools: ['Smart Contracts', 'Solidity', 'Blockchain Finance'],
                languages: ['Arabic', 'English'],
                whyApplying: 'Building decentralized Shariah-compliant P2P micro-takaful insurance protocols.',
                careerGoals: 'CTO / Founder of a global Shariah-compliant Web3 FinTech startup.',
                academic: { institution: 'Qatar University', fieldOfStudy: 'Computer Science & Finance', qualification: 'B.Sc. Distinction', gradYear: 2025 },
                score: 93
            },
            {
                email: 'candidate.aisha@example.com',
                fullName: 'Aisha Suleiman',
                country: 'Nigeria',
                avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
                interests: ['Islamic Banking', 'Wealth Management'],
                tools: ['Financial Analysis', 'Risk Advisory', 'Customer Analytics'],
                languages: ['English', 'Hausa'],
                whyApplying: 'Expanding non-interest banking literacy and asset management services in West African retail markets.',
                careerGoals: 'Head of Retail Products at a Non-Interest Bank.',
                academic: { institution: 'Ahmadu Bello University', fieldOfStudy: 'Accounting', qualification: 'B.Sc. First Class', gradYear: 2024 },
                score: 87
            },
            {
                email: 'candidate.youssef@example.com',
                fullName: 'Youssef Mansoor',
                country: 'Egypt',
                avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
                interests: ['Sukuk Structuring', 'ESG & Sustainable Finance'],
                tools: ['Impact Assessment', 'Financial Modeling', 'Syndicated Loans'],
                languages: ['Arabic', 'English'],
                whyApplying: 'Focusing on green Sukuk structuring for solar energy and clean infrastructure projects.',
                careerGoals: 'Sustainable Infrastructure Principal at an Islamic Investment Bank.',
                academic: { institution: 'Cairo University', fieldOfStudy: 'Investment & Finance', qualification: 'M.Sc. Honors', gradYear: 2025 },
                score: 94
            },
            {
                email: 'candidate.nafisa@example.com',
                fullName: 'Nafisa Dahiru',
                country: 'Kenya',
                avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
                interests: ['Shariah Governance', 'FinTech & Takaful'],
                tools: ['Shariah Risk Audit', 'Regulatory Tech', 'Python'],
                languages: ['Swahili', 'English'],
                whyApplying: 'Integrating automated Shariah compliance audit trails into digital Islamic banking apps.',
                careerGoals: 'Chief Risk & Shariah Compliance Officer in East Africa.',
                academic: { institution: 'Strathmore University', fieldOfStudy: 'Financial Economics', qualification: 'B.Sc. High Distinction', gradYear: 2025 },
                score: 90
            }
        ];

        for (const c of candidates) {
            let candidateUser = await User.findOne({ email: c.email });
            if (!candidateUser) {
                candidateUser = await User.create({
                    email: c.email,
                    fullName: c.fullName,
                    role: 'participant',
                    country: c.country,
                    avatarUrl: c.avatarUrl,
                    phone: '+2347098765432',
                    emailVerified: true
                });
            }

            let app = await Application.findOne({ userId: candidateUser._id });
            if (!app) {
                app = await Application.create({
                    userId: candidateUser._id,
                    fullName: c.fullName,
                    country: c.country,
                    status: 'placement_ready',
                    submittedAt: new Date(),
                    programInterest: { primary: c.interests },
                    academicInfo: c.academic,
                    skills: { tools: c.tools, programmingLanguages: c.languages },
                    motivation: { whyApplying: c.whyApplying, careerGoals: c.careerGoals },
                    cvUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    linkedinUrl: `https://linkedin.com/in/${c.fullName.toLowerCase().replace(/[^a-z]/g, '')}`,
                });
            } else {
                app.status = 'placement_ready';
                await app.save();
            }

            // Create assessment pass submission
            let sub = await AssessmentSubmission.findOne({ userId: candidateUser._id });
            if (!sub) {
                await AssessmentSubmission.create({
                    userId: candidateUser._id,
                    assessmentId: new mongoose.Types.ObjectId(),
                    moduleId: new mongoose.Types.ObjectId(),
                    attemptNumber: 1,
                    answers: [],
                    score: c.score,
                    passed: true,
                    status: 'passed',
                    startedAt: new Date(),
                    submittedAt: new Date()
                });
            }
        }

        console.log('====================================================');
        console.log('PARTNER SEED SUCCESSFUL!');
        console.log('====================================================');
        console.log('Partner Email:   ', partnerEmail);
        console.log('Partner Password:', partnerPassword);
        console.log('Linked Org:      ', org.name);
        console.log('Placement-Ready Interns Seeded: 3 Candidates');
        console.log('====================================================');
    } catch (err: any) {
        console.error('Seeding partner failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

run();
