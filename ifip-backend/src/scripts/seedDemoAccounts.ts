/**
 * seedDemoAccounts.ts — IFIP Demo Accounts Seeder
 *
 * Seeds:
 *   • 3 Partner organizations with login-capable user accounts
 *   • 5 Participant (intern) users with full profiles & passwords
 *
 * Run: npx tsx src/scripts/seedDemoAccounts.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { PartnerOrganization } from "../models/PartnerOrganization.js";
import { Application } from "../models/Application.js";
import { AssessmentSubmission } from "../models/AssessmentSubmission.js";
import { env } from "../config/env.js";

const PARTNERS = [
    {
        org: {
            name: "Stecs Financial Advisory",
            logoUrl: "https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png",
            website: "https://stecs.ng/",
            description: "Providing premium accounting, financial consulting, advisory and tax services.",
            sectorTags: ["Financial Services", "Advisory", "Islamic Banking"],
            activeSlots: 5,
            contactPerson: "Amina Al-Mansoor",
            contactPhone: "+2348012345678",
            portalEnabled: true,
            hasOpenings: true,
            openings: [
                { role: "Islamic Finance Analyst", mode: "Hybrid", location: "Victoria Island, Lagos", count: 2 },
                { role: "Sukuk Structuring Intern", mode: "Remote", count: 1 },
            ],
        },
        user: {
            email: "partner.stecs@ifip.com",
            password: "Stecs@Demo2026!",
            fullName: "Amina Al-Mansoor",
            phone: "+2348012345678",
        },
    },
    {
        org: {
            name: "Halvest Ethical Investments",
            logoUrl: "https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png",
            website: "https://halvestco.com/",
            description: "Empowering ethical financial investments and wealth management solutions.",
            sectorTags: ["Ethical Investing", "Wealth Management"],
            activeSlots: 3,
            contactPerson: "Ibrahim Yunus",
            contactPhone: "+2349087654321",
            portalEnabled: true,
            hasOpenings: true,
            openings: [
                { role: "Wealth Management Trainee", mode: "On-site", location: "Abuja", count: 2 },
                { role: "ESG Research Intern", mode: "Remote", count: 1 },
            ],
        },
        user: {
            email: "partner.halvest@ifip.com",
            password: "Halvest@Demo2026!",
            fullName: "Ibrahim Yunus",
            phone: "+2349087654321",
        },
    },
    {
        org: {
            name: "MTech Noble Systems",
            logoUrl: "https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png",
            website: "http://www.mtechnoble.com",
            description: "Innovative developer of technical infrastructure and FinTech systems.",
            sectorTags: ["Technology", "FinTech", "Software Development"],
            activeSlots: 4,
            contactPerson: "Rashida Okonkwo",
            contactPhone: "+2348056789012",
            portalEnabled: true,
            hasOpenings: true,
            openings: [
                { role: "FinTech Developer Intern", mode: "Hybrid", location: "Lagos", count: 2 },
                { role: "Data Analytics Intern", mode: "Remote", count: 2 },
            ],
        },
        user: {
            email: "partner.mtech@ifip.com",
            password: "Mtech@Demo2026!",
            fullName: "Rashida Okonkwo",
            phone: "+2348056789012",
        },
    },
];

const PARTICIPANTS = [
    {
        email: "intern.fatima@ifip.com",
        password: "Fatima@Intern2026!",
        fullName: "Fatima Z. Bello",
        country: "Nigeria",
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        interests: ["Islamic Capital Markets", "Sukuk Structuring"],
        tools: ["Excel Financial Modeling", "Bloomberg Terminal", "Python"],
        languages: ["English", "Arabic"],
        whyApplying: "I want to build a career in structuring Shariah-compliant capital market instruments across West Africa.",
        careerGoals: "To become a certified Shariah Advisory Lead in investment banking.",
        academic: { institution: "University of Lagos", fieldOfStudy: "Economics & Finance", qualification: "B.Sc. First Class", gradYear: 2025 },
        score: 92,
    },
    {
        email: "intern.tariq@ifip.com",
        password: "Tariq@Intern2026!",
        fullName: "Tariq Al-Hassan",
        country: "United Kingdom",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        interests: ["FinTech & Takaful", "Islamic Banking"],
        tools: ["SQL", "Tableau", "PowerBI"],
        languages: ["English"],
        whyApplying: "Eager to apply quantitative analytics to micro-Takaful risk modeling and ethical digital banking products.",
        careerGoals: "Lead product development for an ethical digital bank in Europe/Africa.",
        academic: { institution: "London School of Economics", fieldOfStudy: "Finance & Risk Management", qualification: "M.Sc. Distinction", gradYear: 2024 },
        score: 88,
    },
    {
        email: "intern.zainab@ifip.com",
        password: "Zainab@Intern2026!",
        fullName: "Zainab Ibrahim",
        country: "Malaysia",
        avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        interests: ["Wealth Management", "ESG & Sustainable Finance"],
        tools: ["SPSS", "Financial Analysis", "Pitchbook"],
        languages: ["Malay", "English"],
        whyApplying: "Passionate about integrating ESG sustainability metrics into Islamic wealth management portfolios.",
        careerGoals: "ESG & Shariah Compliance Director at an international fund manager.",
        academic: { institution: "International Islamic University Malaysia", fieldOfStudy: "Islamic Finance", qualification: "B.Sc. High Distinction", gradYear: 2025 },
        score: 95,
    },
    {
        email: "intern.bilal@ifip.com",
        password: "Bilal@Intern2026!",
        fullName: "Bilal Ahmed",
        country: "United Arab Emirates",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        interests: ["Islamic Banking", "Shariah Governance"],
        tools: ["Credit Risk Modeling", "Core Banking Software", "Excel"],
        languages: ["Arabic", "English"],
        whyApplying: "Dedicated to strengthening Islamic retail banking credit risk assessments and Shariah audit frameworks.",
        careerGoals: "Head of Shariah Audit & Governance at a regional commercial bank.",
        academic: { institution: "American University of Sharjah", fieldOfStudy: "Banking & Shariah Law", qualification: "B.Sc. Honors", gradYear: 2025 },
        score: 90,
    },
    {
        email: "intern.amira@ifip.com",
        password: "Amira@Intern2026!",
        fullName: "Amira Nur",
        country: "Indonesia",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        interests: ["ESG & Sustainable Finance", "FinTech & Takaful"],
        tools: ["Python Data Analysis", "Green Bond Structuring", "ESG Analytics"],
        languages: ["Indonesian", "English"],
        whyApplying: "Combining Islamic micro-finance with digital green Sukuk solutions to empower rural communities.",
        careerGoals: "Sustainable Finance Lead at a global development bank.",
        academic: { institution: "Universitas Indonesia", fieldOfStudy: "Development Economics", qualification: "M.Sc. Cum Laude", gradYear: 2025 },
        score: 96,
    },
];

const run = async () => {
    try {
        console.log("\n?? Connecting to MongoDB...");
        await mongoose.connect(env.MONGO_URI);
        console.log("   Connected!\n");

        const seededPartners: { name: string; email: string; password: string }[] = [];
        const seededParticipants: { name: string; email: string; password: string; country: string }[] = [];

        console.log("??  Seeding partner organizations & user accounts...\n");
        for (const p of PARTNERS) {
            let org = await PartnerOrganization.findOne({ name: p.org.name });
            if (!org) {
                org = await PartnerOrganization.create({ ...p.org, contactEmail: p.user.email });
                console.log("   ? Created org: " + p.org.name);
            } else {
                org.contactEmail = p.user.email;
                org.contactPerson = p.org.contactPerson;
                org.portalEnabled = true;
                await org.save();
                console.log("   ??  Updated org: " + p.org.name);
            }

            const passwordHash = await bcrypt.hash(p.user.password, 12);
            let user = await User.findOne({ email: p.user.email });
            if (!user) {
                user = await User.create({
                    email: p.user.email,
                    passwordHash,
                    role: "partner",
                    fullName: p.user.fullName,
                    phone: p.user.phone,
                    orgId: org._id,
                    emailVerified: true,
                });
                console.log("   ? Created partner user: " + p.user.email);
            } else {
                user.passwordHash = passwordHash;
                user.role = "partner";
                (user as any).orgId = org._id;
                user.emailVerified = true;
                await user.save();
                console.log("   ??  Updated partner user: " + p.user.email);
            }

            seededPartners.push({ name: p.org.name, email: p.user.email, password: p.user.password });
        }

        console.log("\n??  Seeding participant (intern) accounts...\n");
        for (const c of PARTICIPANTS) {
            const passwordHash = await bcrypt.hash(c.password, 12);
            let user = await User.findOne({ email: c.email });
            if (!user) {
                user = await User.create({
                    email: c.email,
                    passwordHash,
                    fullName: c.fullName,
                    role: "participant",
                    country: c.country,
                    avatarUrl: c.avatarUrl,
                    phone: "+2347098765432",
                    emailVerified: true,
                });
                console.log("   ? Created participant: " + c.email);
            } else {
                user.passwordHash = passwordHash;
                user.role = "participant";
                user.emailVerified = true;
                await user.save();
                console.log("   ??  Updated participant: " + c.email);
            }

            let app = await Application.findOne({ userId: user._id });
            if (!app) {
                await Application.create({
                    userId: user._id,
                    fullName: c.fullName,
                    country: c.country,
                    status: "placement_ready",
                    submittedAt: new Date(),
                    programInterest: { primary: c.interests },
                    academicInfo: c.academic,
                    skills: { tools: c.tools, programmingLanguages: c.languages },
                    motivation: { whyApplying: c.whyApplying, careerGoals: c.careerGoals },
                    cvUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    linkedinUrl: "https://linkedin.com/in/" + c.fullName.toLowerCase().replace(/[^a-z]/g, ""),
                });
            } else {
                app.status = "placement_ready";
                await app.save();
            }

            const sub = await AssessmentSubmission.findOne({ userId: user._id });
            if (!sub) {
                await AssessmentSubmission.create({
                    userId: user._id,
                    assessmentId: new mongoose.Types.ObjectId(),
                    moduleId: new mongoose.Types.ObjectId(),
                    attemptNumber: 1,
                    answers: [],
                    score: c.score,
                    passed: true,
                    status: "passed",
                    startedAt: new Date(),
                    submittedAt: new Date(),
                });
            }

            seededParticipants.push({ name: c.fullName, email: c.email, password: c.password, country: c.country });
        }

        console.log("\n-----------------------------------------------------------");
        console.log("??  SEED COMPLETE — LOGIN CREDENTIALS");
        console.log("-----------------------------------------------------------");

        console.log("\n??  PARTNER ACCOUNTS (role: partner)");
        console.log("---------------------------------------------------------");
        for (const p of seededPartners) {
            console.log("  Organisation : " + p.name);
            console.log("  Email        : " + p.email);
            console.log("  Password     : " + p.password);
            console.log("");
        }

        console.log("??  PARTICIPANT ACCOUNTS (role: participant)");
        console.log("---------------------------------------------------------");
        for (const p of seededParticipants) {
            console.log("  Name         : " + p.name + " (" + p.country + ")");
            console.log("  Email        : " + p.email);
            console.log("  Password     : " + p.password);
            console.log("");
        }

        console.log("-----------------------------------------------------------\n");

    } catch (err: any) {
        console.error("\n? Seed failed:", err.message ?? err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("?? MongoDB disconnected.");
    }
};

run();
