/**
 * seed.ts — IFIP Development Database Seeder
 *
 * Seeds:
 *   • 1 Superadmin user account
 *   • 1 Active Cohort
 *   • 6 Applicants across various stages (steps 1–6, Nigerian & international, paid & unpaid)
 *
 * Run: npx tsx src/scripts/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Applicant } from '../models/Applicants.js';
import { Cohort } from '../models/Cohort.js';
import { Payment } from '../models/Payments.js';
import { env } from '../config/env.js';

// ─────────────────────────────────────────────
// SEED DATA CONFIG — EDIT THESE AS NEEDED
// ─────────────────────────────────────────────

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
    registrationEndDate: new Date('2026-12-31T23:59:59.000Z'), // open until end of year
    status: 'upcoming' as const,  // must be 'upcoming' for getActiveRegistrationCohort() query
    cohortCap: 100,
};

const APPLICANTS = [
    {
        // Fully completed & paid — Nigerian
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
        academicInfo: {
            status: 'Graduate',
            institution: 'University of Lagos',
            fieldOfStudy: 'Economics',
            qualification: "Bachelor's Degree",
            gradYear: 2022,
        },
        programInterest: { primary: ['Islamic Banking', 'Takaful (Islamic Insurance)'] },
        skills: {
            relevantSkills: ['Financial Analysis', 'Excel', 'Risk Assessment'],
            tools: ['Microsoft Excel', 'Power BI'],
            hasPriorInternship: true,
            priorInternshipDesc: 'Six-month internship at Sterling Bank, Lagos.',
            commSkillLevel: 'Advanced',
            availability: 'Immediately',
        },
        motivation: {
            whyApplying: 'I am passionate about ethical finance and wish to build a career grounded in Islamic economic principles.',
            careerGoals: 'Become a certified Islamic finance professional and lead an ESG investment team within 5 years.',
        },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-amina-bello.pdf',
        leadSource: 'Social Media',
        declaration: { confirmed: true, signature: 'Amina Bello', date: new Date('2026-08-10') },
        payment: {
            provider: 'flutterwave' as const,
            amount: 20000,
            currency: 'NGN',
            status: 'success' as const,
        },
    },
    {
        // Fully completed & paid — International (USD)
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
        academicInfo: {
            status: 'Graduate',
            institution: 'New York University',
            fieldOfStudy: 'Finance',
            qualification: "Master's Degree",
            gradYear: 2023,
        },
        programInterest: { primary: ['Sukuk & Islamic Capital Markets', 'Islamic Private Equity'] },
        skills: {
            relevantSkills: ['Sukuk Structuring', 'Valuation', 'Portfolio Management'],
            tools: ['Bloomberg Terminal', 'Python', 'Excel'],
            hasPriorInternship: true,
            priorInternshipDesc: 'Summer analyst at Goldman Sachs, Islamic Finance desk.',
            commSkillLevel: 'Native',
            availability: 'Within 1 week',
        },
        motivation: {
            whyApplying: 'I want to bridge Western capital markets expertise with Islamic finance ethics.',
            careerGoals: 'Launch a halal investment fund for diaspora Muslims in North America.',
        },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-ibrahim-hassan.pdf',
        leadSource: 'University Career Fair',
        declaration: { confirmed: true, signature: 'Ibrahim Hassan', date: new Date('2026-08-12') },
        payment: {
            provider: 'flutterwave' as const,
            amount: 3000,  // $30 × 100 = 3000 cents
            currency: 'USD',
            status: 'success' as const,
        },
    },
    {
        // Step 5 (CV uploaded, not yet on payment page) — Nigerian
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
        academicInfo: {
            status: 'Undergraduate (Final Year)',
            institution: 'Bayero University Kano',
            fieldOfStudy: 'Accounting',
            qualification: "Bachelor's Degree",
            gradYear: 2026,
        },
        programInterest: { primary: ['Islamic Microfinance', 'Zakat & Waqf Management'] },
        skills: {
            relevantSkills: ['Accounting', 'Auditing', 'Islamic Jurisprudence'],
            tools: ['QuickBooks', 'Microsoft Excel'],
            hasPriorInternship: false,
            commSkillLevel: 'Intermediate',
            availability: 'Within 2 weeks',
        },
        motivation: {
            whyApplying: 'As a Muslim woman in Northern Nigeria, I see IFIP as the ideal bridge between my Islamic values and career ambitions.',
            careerGoals: 'Develop Waqf-based social finance solutions for underserved communities in Northern Nigeria.',
        },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-fatima-yusuf.pdf',
        leadSource: 'Friend/Colleague Referral',
        declaration: null,
        payment: null,
    },
    {
        // Step 3 (Academic info filled, skills not yet) — Nigerian
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
        academicInfo: {
            status: 'Graduate',
            institution: 'University of Nigeria, Nsukka',
            fieldOfStudy: 'Business Administration',
            qualification: "Bachelor's Degree",
            gradYear: 2023,
        },
        programInterest: { primary: ['Islamic Banking'] },
        skills: null,
        motivation: null,
        cvUrl: null,
        leadSource: 'Google Search',
        declaration: null,
        payment: null,
    },
    {
        // Step 2 (Personal info saved, not beyond) — International (Ghana)
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
        // Step 6 — On payment page but NOT paid (declaration done, awaiting payment) — Nigerian
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
        academicInfo: {
            status: 'Graduate',
            institution: 'University of Abuja',
            fieldOfStudy: 'Law',
            qualification: "Bachelor's Degree",
            gradYear: 2021,
        },
        programInterest: { primary: ['Islamic Banking', 'Sharia Advisory & Compliance'] },
        skills: {
            relevantSkills: ['Legal Research', 'Contract Drafting', 'Sharia Compliance'],
            tools: ['Microsoft Word', 'LexisNexis'],
            hasPriorInternship: true,
            priorInternshipDesc: 'Legal intern at Central Bank of Nigeria (Islamic Banking Division).',
            commSkillLevel: 'Advanced',
            availability: 'Immediately',
        },
        motivation: {
            whyApplying: 'My legal background in financial regulation positions me well to become a Sharia compliance officer.',
            careerGoals: 'Head the Sharia supervisory board at a Tier-1 Nigerian commercial bank.',
        },
        cvUrl: 'https://res.cloudinary.com/sample/raw/upload/v1/cv-umar-suleiman.pdf',
        leadSource: 'LinkedIn',
        declaration: { confirmed: true, signature: 'Umar Suleiman', date: new Date('2026-08-18') },
        payment: null,
    },
];

// ─────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────

const run = async () => {
    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('   Connected!\n');

        // ── 1. Superadmin ──────────────────────────────────────────────────
        console.log('👤 Seeding superadmin user...');
        const existingAdmin = await User.findOne({ email: SUPERADMIN.email });
        if (existingAdmin) {
            existingAdmin.passwordHash = await bcrypt.hash(SUPERADMIN.password, 12);
            existingAdmin.role = 'superadmin';
            existingAdmin.fullName = SUPERADMIN.fullName;
            existingAdmin.title = SUPERADMIN.title;
            existingAdmin.emailVerified = true;
            await existingAdmin.save();
            console.log('   ✅ Superadmin updated.');
        } else {
            await User.create({
                email: SUPERADMIN.email,
                passwordHash: await bcrypt.hash(SUPERADMIN.password, 12),
                role: 'superadmin',
                fullName: SUPERADMIN.fullName,
                title: SUPERADMIN.title,
                emailVerified: true,
            });
            console.log('   ✅ Superadmin created.');
        }

        // ── 2. Cohort ──────────────────────────────────────────────────────
        console.log('\n📅 Seeding active cohort...');
        let cohort = await Cohort.findOne({ name: COHORT.name });
        if (!cohort) {
            cohort = await Cohort.create(COHORT);
            console.log(`   ✅ Cohort created: "${cohort.name}"`);
        } else {
            console.log(`   ℹ️  Cohort already exists: "${cohort.name}"`);
        }

        // ── 3. Applicants ──────────────────────────────────────────────────
        console.log('\n📋 Seeding applicants...\n');
        for (const data of APPLICANTS) {
            const { payment, declaration, ...applicantFields } = data;

            // Upsert applicant record
            const applicantDoc = await Applicant.findOneAndUpdate(
                { email: applicantFields.email },
                {
                    $set: {
                        ...applicantFields,
                        cohortId: cohort._id,
                        ...(declaration ? { declaration } : {}),
                    },
                },
                { upsert: true, returnDocument: 'after' }
            );

            // Seed payment record if paid
            if (payment && applicantDoc) {
                const existingPayment = await Payment.findOne({ applicantId: applicantDoc._id });
                if (!existingPayment) {
                    const providerRef = `SEED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    await Payment.create({
                        applicantId: applicantDoc._id,
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

            const payStatus = payment ? (payment.status === 'success' ? '💳 Paid' : '⏳ Payment pending') : '🔓 Not paid';
            console.log(`   ✅ [Step ${applicantFields.currentStep}] ${applicantFields.fullName} (${applicantFields.country}) ${payStatus}`);
        }

        // ── Summary ────────────────────────────────────────────────────────
        console.log('\n─────────────────────────────────────────');
        console.log('🎉  SEED COMPLETE');
        console.log('─────────────────────────────────────────');
        console.log('\n📌 Admin Login:');
        console.log(`   Email:    ${SUPERADMIN.email}`);
        console.log(`   Password: ${SUPERADMIN.password}`);
        console.log('\n📌 Applicant Test Accounts (no password set — login via applicant portal):');
        APPLICANTS.forEach(a => {
            console.log(`   ${a.fullName.padEnd(26)} ${a.email}`);
        });
        console.log('─────────────────────────────────────────\n');

    } catch (err: any) {
        console.error('\n❌ Seed failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 MongoDB connection closed.');
    }
};

run();
