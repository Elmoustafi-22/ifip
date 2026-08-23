/**
 * seedAll.ts — IFIP Complete Database Seeder (New Database Bootstrap)
 *
 * Seeds everything needed for a fresh database:
 *   1. Superadmin user
 *   2. Cohort (with correct 'upcoming' status for registration window)
 *   3. Form Options (academic_status, placement_interests, sector_tags)
 *   4. Active Openings (vacancy listings)
 *   5. Partners
 *   6. Opportunities
 *   7. Applicant test accounts + payment records
 *
 * Safe to re-run — all operations are upserts/findOneAndUpdate.
 *
 * Run: npx tsx src/scripts/seedAll.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Cohort } from '../models/Cohort.js';
import { Applicant } from '../models/Applicants.js';
import { Payment } from '../models/Payments.js';
import { FormOption } from '../models/FormOption.js';
import { ActiveOpening } from '../models/ActiveOpening.js';

// ─────────────────────────────────────────────────────────────────────────────
// SEED CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const SUPERADMIN = {
    email: 'admin@ifip.com',
    password: 'Admin@1234!',
    fullName: 'IFIP Superadmin',
    title: 'Program Director',
};

const COHORT = {
    name: 'IFIP Cohort 1 — 2026',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-12-01T00:00:00.000Z'),
    registrationStartDate: new Date('2026-07-01T00:00:00.000Z'),
    registrationEndDate: new Date('2026-12-31T23:59:59.000Z'),
    // IMPORTANT: must be 'upcoming' — getActiveRegistrationCohort() queries status='upcoming'
    status: 'upcoming' as const,
    cohortCap: 100,
};

// ── Form Options ──────────────────────────────────────────────────────────────

const ACADEMIC_STATUS = [
    'University Student',
    'Penultimate Year Student',
    'Final Year Student',
    'Recent Graduate',
    'NYSC Participant',
    'Early-Career Professional',
];

const PLACEMENT_INTERESTS = [
    'Islamic Banking Operations',
    'Islamic Finance Advisory',
    'Shariah Advisory Support',
    'Investment & Wealth Management',
    'Risk Management (Takaful)',
    'Compliance & Governance',
    'Capital Markets (Sukuk & Structured Finance)',
    'Financial Analysis',
    'Research & Policy Development',
    'Fintech / Islamic Fintech Operations',
    'Venture Building / Startups',
    'Business Development',
    'Product Development',
    'Customer Experience & Relations',
    'Marketing & Growth Strategy',
    'Digital Marketing',
    'Content Creation & Media',
    'Graphic Design',
    'UI/UX Design',
    'Video Editing & Creative Production',
    'Technical Writing & Documentation',
    'Data Analysis',
    'Project Management',
    'Community & Program Management',
    'Administrative & Operations Support',
    'Other (Specify)',
];

const SECTOR_TAGS = [
    'Islamic Banking',
    'Takaful (Islamic Insurance)',
    'Sukuk & Capital Markets',
    'Islamic Asset Management',
    'Waqf & Endowments',
    'Zakat & Philanthropy',
    'Islamic FinTech',
    'Shariah Advisory & Consulting',
    'Halal Finance',
    'Accounting & Audit',
    'Law & Compliance',
    'Other',
];

// ── Active Openings ───────────────────────────────────────────────────────────

const OPENINGS = [
    { department: 'Marketing & Communications', title: 'Digital Marketing Intern',         workMode: 'Hybrid',  location: 'Hybrid' },
    { department: 'Marketing & Communications', title: 'Social Media Manager Intern',       workMode: 'Hybrid',  location: 'Kano' },
    { department: 'Marketing & Communications', title: 'Community Manager (Full-time)',     workMode: 'Remote',  location: 'Lagos' },
    { department: 'Marketing & Communications', title: 'Brand Communications Intern',       workMode: 'Remote',  location: 'Remote' },
    { department: 'Creative Design',            title: 'Graphic Design Intern',             workMode: 'Hybrid',  location: 'Kano' },
    { department: 'Creative Design',            title: 'UI/UX Design Support Intern',       workMode: 'Remote',  location: 'Remote' },
    { department: 'Creative Design',            title: 'Visual Content Creator Intern',     workMode: 'Hybrid',  location: 'Hybrid' },
    { department: 'Creative Design',            title: 'Product Design Intern',             workMode: 'Remote',  location: 'Remote' },
    { department: 'Fund Management',            title: 'Investment Research Intern',        workMode: 'Remote',  location: 'Lagos' },
    { department: 'Legal & Shariah',            title: 'Legal and Compliance Intern',       workMode: 'On-site', location: 'Lagos & Abuja' },
];

// ── Applicants ────────────────────────────────────────────────────────────────

const APPLICANTS = [
    {
        email: 'amina.bello@example.com',
        fullName: 'Amina Bello',
        phone: '+2348031234567',
        country: 'Nigeria',
        stateCity: 'Lagos',
        gender: 'Female',
        dob: new Date('1999-04-15'),
        currentStep: 6,
        isPaid: true,
        levyAcknowledged: true,
        academicInfo: { status: 'Recent Graduate', institution: 'University of Lagos', fieldOfStudy: 'Economics', qualification: "Bachelor's Degree", gradYear: 2022 },
        programInterest: { primary: ['Islamic Banking Operations', 'Risk Management (Takaful)'] },
        skills: { relevantSkills: ['Financial Analysis', 'Excel', 'Risk Assessment'], tools: ['Microsoft Excel', 'Power BI'], hasPriorInternship: true, priorInternshipDesc: 'Six-month internship at Sterling Bank.', commSkillLevel: 'Advanced', availability: 'Immediately' },
        motivation: { whyApplying: 'Passionate about ethical finance and Islamic economic principles.', careerGoals: 'Lead an ESG investment team within 5 years.' },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-amina-bello.pdf',
        leadSource: 'Social Media',
        declaration: { confirmed: true, signature: 'Amina Bello', date: new Date('2026-08-10') },
        payment: { provider: 'flutterwave' as const, amount: 20000, currency: 'NGN', status: 'success' as const },
    },
    {
        email: 'ibrahim.hassan@example.com',
        fullName: 'Ibrahim Hassan',
        phone: '+12025550143',
        country: 'United States',
        stateCity: 'New York',
        gender: 'Male',
        dob: new Date('1997-09-22'),
        currentStep: 6,
        isPaid: true,
        levyAcknowledged: true,
        academicInfo: { status: 'Early-Career Professional', institution: 'New York University', fieldOfStudy: 'Finance', qualification: "Master's Degree", gradYear: 2023 },
        programInterest: { primary: ['Capital Markets (Sukuk & Structured Finance)', 'Investment & Wealth Management'] },
        skills: { relevantSkills: ['Sukuk Structuring', 'Valuation', 'Portfolio Management'], tools: ['Bloomberg Terminal', 'Python', 'Excel'], hasPriorInternship: true, priorInternshipDesc: 'Summer analyst at Goldman Sachs Islamic Finance desk.', commSkillLevel: 'Native', availability: 'Within 1 week' },
        motivation: { whyApplying: 'Bridge Western capital markets expertise with Islamic finance ethics.', careerGoals: 'Launch a halal investment fund for diaspora Muslims in North America.' },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-ibrahim-hassan.pdf',
        leadSource: 'University Career Fair',
        declaration: { confirmed: true, signature: 'Ibrahim Hassan', date: new Date('2026-08-12') },
        payment: { provider: 'flutterwave' as const, amount: 3000, currency: 'USD', status: 'success' as const },
    },
    {
        email: 'fatima.yusuf@example.com',
        fullName: 'Fatima Yusuf',
        phone: '+2347062345678',
        country: 'Nigeria',
        stateCity: 'Kano',
        gender: 'Female',
        dob: new Date('2001-01-30'),
        currentStep: 5,
        isPaid: false,
        levyAcknowledged: false,
        academicInfo: { status: 'Final Year Student', institution: 'Bayero University Kano', fieldOfStudy: 'Accounting', qualification: "Bachelor's Degree", gradYear: 2026 },
        programInterest: { primary: ['Compliance & Governance', 'Research & Policy Development'] },
        skills: { relevantSkills: ['Accounting', 'Auditing', 'Islamic Jurisprudence'], tools: ['QuickBooks', 'Microsoft Excel'], hasPriorInternship: false, commSkillLevel: 'Intermediate', availability: 'Within 2 weeks' },
        motivation: { whyApplying: 'IFIP bridges my Islamic values and career ambitions.', careerGoals: 'Develop Waqf-based social finance solutions for underserved communities.' },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-fatima-yusuf.pdf',
        leadSource: 'Friend/Colleague Referral',
        declaration: null,
        payment: null,
    },
    {
        email: 'chukwuemeka.okafor@example.com',
        fullName: 'Chukwuemeka Okafor',
        phone: '+2348123456789',
        country: 'Nigeria',
        stateCity: 'Enugu',
        gender: 'Male',
        dob: new Date('2000-07-04'),
        currentStep: 3,
        isPaid: false,
        levyAcknowledged: false,
        academicInfo: { status: 'Recent Graduate', institution: 'University of Nigeria, Nsukka', fieldOfStudy: 'Business Administration', qualification: "Bachelor's Degree", gradYear: 2023 },
        programInterest: { primary: ['Islamic Banking Operations'] },
        skills: null,
        motivation: null,
        cvUrl: null,
        leadSource: 'Google Search',
        declaration: null,
        payment: null,
    },
    {
        email: 'abena.mensah@example.com',
        fullName: 'Abena Mensah',
        phone: '+233244567890',
        country: 'Ghana',
        stateCity: 'Accra',
        gender: 'Female',
        dob: new Date('1998-11-18'),
        currentStep: 2,
        isPaid: false,
        levyAcknowledged: false,
        academicInfo: null,
        programInterest: null,
        skills: null,
        motivation: null,
        cvUrl: null,
        leadSource: 'Instagram',
        declaration: null,
        payment: null,
    },
    {
        email: 'umar.suleiman@example.com',
        fullName: 'Umar Suleiman',
        phone: '+2348054321098',
        country: 'Nigeria',
        stateCity: 'Abuja',
        gender: 'Male',
        dob: new Date('1996-03-11'),
        currentStep: 6,
        isPaid: false,
        levyAcknowledged: true,
        academicInfo: { status: 'Early-Career Professional', institution: 'University of Abuja', fieldOfStudy: 'Law', qualification: "Bachelor's Degree", gradYear: 2021 },
        programInterest: { primary: ['Compliance & Governance', 'Shariah Advisory Support'] },
        skills: { relevantSkills: ['Legal Research', 'Contract Drafting', 'Sharia Compliance'], tools: ['Microsoft Word', 'LexisNexis'], hasPriorInternship: true, priorInternshipDesc: 'Legal intern at CBN Islamic Banking Division.', commSkillLevel: 'Advanced', availability: 'Immediately' },
        motivation: { whyApplying: 'Legal background in financial regulation prepares me to be a Sharia compliance officer.', careerGoals: 'Head the Sharia supervisory board at a Tier-1 Nigerian commercial bank.' },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-umar-suleiman.pdf',
        leadSource: 'LinkedIn',
        declaration: { confirmed: true, signature: 'Umar Suleiman', date: new Date('2026-08-18') },
        payment: null,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const toValue = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

const section = (title: string) => {
    console.log(`\n${'─'.repeat(54)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(54)}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────────────────

const run = async () => {
    try {
        console.log('\n🔗  Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('    Connected!\n');

        // ── 1. SUPERADMIN ─────────────────────────────────────────────────────
        section('1 of 6 — Superadmin');
        const existingAdmin = await User.findOne({ email: SUPERADMIN.email });
        if (existingAdmin) {
            existingAdmin.passwordHash = await bcrypt.hash(SUPERADMIN.password, 12);
            existingAdmin.role = 'superadmin';
            existingAdmin.fullName = SUPERADMIN.fullName;
            existingAdmin.title = SUPERADMIN.title;
            existingAdmin.emailVerified = true;
            await existingAdmin.save();
            console.log('  ✅  Superadmin updated.');
        } else {
            await User.create({
                email: SUPERADMIN.email,
                passwordHash: await bcrypt.hash(SUPERADMIN.password, 12),
                role: 'superadmin',
                fullName: SUPERADMIN.fullName,
                title: SUPERADMIN.title,
                emailVerified: true,
            });
            console.log('  ✅  Superadmin created.');
        }
        console.log(`  📧  ${SUPERADMIN.email}  |  🔑  ${SUPERADMIN.password}`);

        // ── 2. COHORT ─────────────────────────────────────────────────────────
        section('2 of 6 — Cohort');
        await Cohort.findOneAndUpdate(
            { name: COHORT.name },
            { $set: COHORT },
            { upsert: true, returnDocument: 'after' }
        );
        console.log(`  ✅  "${COHORT.name}"`);
        console.log(`  📅  Registration open: ${COHORT.registrationStartDate.toDateString()} → ${COHORT.registrationEndDate.toDateString()}`);
        console.log(`  🎯  Status: ${COHORT.status}  |  Cap: ${COHORT.cohortCap}`);

        // ── 3. FORM OPTIONS ───────────────────────────────────────────────────
        section('3 of 6 — Form Options');
        const formGroups = [
            { group: 'academic_status',     labels: ACADEMIC_STATUS },
            { group: 'placement_interests', labels: PLACEMENT_INTERESTS },
            { group: 'sector_tags',         labels: SECTOR_TAGS },
        ] as const;

        for (const { group, labels } of formGroups) {
            let count = 0;
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                const value = toValue(label);
                await FormOption.findOneAndUpdate(
                    { group, value },
                    { $set: { group, label, value, order: i, isActive: true } },
                    { upsert: true, returnDocument: 'after' }
                );
                count++;
            }
            console.log(`  ✅  ${group} — ${count} options`);
        }

        // ── 4. ACTIVE OPENINGS ────────────────────────────────────────────────
        section('4 of 6 — Active Openings');
        for (let i = 0; i < OPENINGS.length; i++) {
            const item = OPENINGS[i];
            await (ActiveOpening as any).findOneAndUpdate(
                { title: item.title, department: item.department },
                { $set: { ...item, order: i, isActive: true } },
                { upsert: true, returnDocument: 'after' }
            );
            console.log(`  ✅  [${String(i + 1).padStart(2, '0')}] ${item.title}`);
        }

        // ── 5. APPLICANTS ─────────────────────────────────────────────────────
        section('5 of 6 — Applicant Test Accounts');
        const cohort = await Cohort.findOne({ name: COHORT.name });

        for (const data of APPLICANTS) {
            const { payment, declaration, ...fields } = data;

            const doc = await Applicant.findOneAndUpdate(
                { email: fields.email },
                {
                    $set: {
                        ...fields,
                        cohortId: cohort!._id,
                        ...(declaration ? { declaration } : {}),
                    },
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (payment && doc) {
                const exists = await Payment.findOne({ applicantId: doc._id });
                if (!exists) {
                    const providerRef = `SEED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    await Payment.create({
                        applicantId: doc._id,
                        provider: payment.provider,
                        providerRef,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: payment.status,
                        type: 'commitment_levy',
                        webhookVerified: true,
                    });
                }
            }

            const payBadge = payment ? (payment.status === 'success' ? '💳 Paid' : '⏳ Pending') : '🔓 Unpaid';
            console.log(`  ✅  [Step ${fields.currentStep}] ${fields.fullName.padEnd(26)} (${fields.country}) ${payBadge}`);
        }

        // ── 6. SUMMARY ────────────────────────────────────────────────────────
        section('🎉  SEED COMPLETE — SUMMARY');
        console.log(`
  🔐  Admin Login
      Email:    ${SUPERADMIN.email}
      Password: ${SUPERADMIN.password}

  👤  Applicant Test Accounts (no password — use email OTP to login):
      amina.bello@example.com        → Step 6, Paid ₦20,000
      ibrahim.hassan@example.com     → Step 6, Paid $30 (USD)
      umar.suleiman@example.com      → Step 6, Declaration done, unpaid
      fatima.yusuf@example.com       → Step 5, In progress
      chukwuemeka.okafor@example.com → Step 3, Early stage
      abena.mensah@example.com       → Step 2, Just started

  📋  Form Options: academic_status, placement_interests, sector_tags
  🏢  Active Openings: ${OPENINGS.length} vacancy listings seeded
  📅  Cohort: "${COHORT.name}" open for registrations
`);

    } catch (err: any) {
        console.error('\n❌  Seed failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌  MongoDB disconnected.\n');
    }
};

run();
