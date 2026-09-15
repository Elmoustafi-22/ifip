import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Application } from "../models/Application.js";
import { AssessmentSubmission } from "../models/AssessmentSubmission.js";
import { env } from "../config/env.js";

const PENDING_CANDIDATES = [
    {
        email: "intern.hamza@ifip.com",
        password: "Hamza@Intern2026!",
        fullName: "Hamza Malik",
        country: "Pakistan",
        avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        interests: ["Sukuk Structuring", "Islamic Capital Markets"],
        tools: ["VBA", "Financial Valuation", "Capital Markets"],
        languages: ["Urdu", "English"],
        whyApplying: "Focusing on sovereign and corporate Sukuk issuance models for emerging markets infrastructure.",
        careerGoals: "Senior Capital Markets Associate specializing in Islamic debt capital instruments.",
        academic: { institution: "Lahore University of Management Sciences", fieldOfStudy: "Accounting & Finance", qualification: "B.Sc. Distinction", gradYear: 2024 },
    },
    {
        email: "intern.khadija@ifip.com",
        password: "Khadija@Intern2026!",
        fullName: "Khadija Mahmoud",
        country: "Jordan",
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        interests: ["Wealth Management", "Islamic Banking"],
        tools: ["Portfolio Optimization", "Asset Allocation", "Wealth Planning"],
        languages: ["Arabic", "English", "French"],
        whyApplying: "Helping high-net-worth individuals structure ethical, Shariah-compliant asset portfolios.",
        careerGoals: "Private Wealth Manager at an Islamic Investment Firm.",
        academic: { institution: "University of Jordan", fieldOfStudy: "Finance & Banking", qualification: "B.Sc. First Class", gradYear: 2025 },
    },
    {
        email: "intern.omar@ifip.com",
        password: "Omar@Intern2026!",
        fullName: "Omar Farooq",
        country: "Saudi Arabia",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
        interests: ["Shariah Governance", "Islamic Banking"],
        tools: ["AAOIFI Standards", "Regulatory Compliance", "Legal Drafting"],
        languages: ["Arabic", "English"],
        whyApplying: "Committed to advancing AAOIFI Shariah standards implementation in commercial banking operations.",
        careerGoals: "Shariah Advisory Board Member and Compliance Officer.",
        academic: { institution: "King Fahd University of Petroleum & Minerals", fieldOfStudy: "Islamic Jurisprudence & Finance", qualification: "B.Sc. Magna Cum Laude", gradYear: 2024 },
    },
    {
        email: "intern.aisha@ifip.com",
        password: "Aisha@Intern2026!",
        fullName: "Aisha Suleiman",
        country: "Nigeria",
        avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
        interests: ["Islamic Banking", "Wealth Management"],
        tools: ["Financial Analysis", "Risk Advisory", "Customer Analytics"],
        languages: ["English", "Hausa"],
        whyApplying: "Expanding non-interest banking literacy and asset management services in West African retail markets.",
        careerGoals: "Head of Retail Products at a Non-Interest Bank.",
        academic: { institution: "Ahmadu Bello University", fieldOfStudy: "Accounting", qualification: "B.Sc. First Class", gradYear: 2024 },
    },
];

const run = async () => {
    try {
        console.log("\n?? Connecting to MongoDB...");
        await mongoose.connect(env.MONGO_URI);
        console.log("   Connected!\n");

        // Clean up orphaned applications (apps with no valid user)
        const apps = await Application.find({}).lean();
        for (const app of apps) {
            const user = await User.findById(app.userId);
            if (!user) {
                await Application.deleteOne({ _id: app._id });
                console.log("   ?? Removed orphaned application:", app.fullName);
            }
        }

        console.log("\n?? Seeding candidates with PENDING EVALUATION status...\n");
        const seeded: any[] = [];

        for (const c of PENDING_CANDIDATES) {
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
                    phone: "+23480" + Math.floor(10000000 + Math.random() * 90000000),
                    emailVerified: true,
                });
                console.log("   ? Created user:", c.email);
            } else {
                user.passwordHash = passwordHash;
                user.role = "participant";
                user.emailVerified = true;
                await user.save();
                console.log("   ?? Updated user:", c.email);
            }

            let app = await Application.findOne({ userId: user._id });
            if (!app) {
                app = await Application.create({
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
                app.programInterest = { primary: c.interests };
                app.academicInfo = c.academic;
                app.skills = { tools: c.tools, programmingLanguages: c.languages };
                await app.save();
            }

            // Upsert AssessmentSubmission as pending_review with score null and passed null
            let sub = await AssessmentSubmission.findOne({ userId: user._id });
            if (!sub) {
                await AssessmentSubmission.create({
                    userId: user._id,
                    assessmentId: new mongoose.Types.ObjectId(),
                    moduleId: new mongoose.Types.ObjectId(),
                    attemptNumber: 1,
                    answers: [],
                    score: 0,
                    passed: null,
                    status: "pending_review",
                    startedAt: new Date(Date.now() - 3600000),
                    submittedAt: new Date(),
                });
            } else {
                sub.passed = null;
                sub.status = "pending_review";
                await sub.save();
            }

            seeded.push({ name: c.fullName, email: c.email, password: c.password, country: c.country, interests: c.interests });
        }

        console.log("\n=======================================================");
        console.log("?? PENDING EVALUATION CANDIDATES SEEDED SUCCESSFULLY");
        console.log("=======================================================");
        for (const s of seeded) {
            console.log(`  Name:     ${s.name} (${s.country})`);
            console.log(`  Email:    ${s.email}`);
            console.log(`  Password: ${s.password}`);
            console.log(`  Domains:  ${s.interests.join(", ")}`);
            console.log("  Status:   Pending Evaluation");
            console.log("");
        }
        console.log("=======================================================\n");

    } catch (err: any) {
        console.error("? Seeding failed:", err.message ?? err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("?? MongoDB disconnected.");
    }
};

run();
