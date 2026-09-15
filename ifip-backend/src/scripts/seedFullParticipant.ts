import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Cohort } from "../models/Cohort.js";
import { Applicant } from "../models/Applicants.js";
import { Application } from "../models/Application.js";
import { Payment } from "../models/Payments.js";
import { Module } from "../models/Module.js";
import { Progress } from "../models/Progress.js";
import { Assessment } from "../models/Assessment.js";
import { AssessmentSubmission } from "../models/AssessmentSubmission.js";
import { ModuleTaskSubmission } from "../models/ModuleTaskSubmission.js";
import { ModuleTaskReward } from "../models/ModuleTaskReward.js";
import { Notification } from "../models/Notification.js";
import { env } from "../config/env.js";

const PARTICIPANT = {
    email: "participant.full@ifip.com",
    password: "FullParticipant2026!",
    fullName: "Zayd Mansoor",
    phone: "+2348031234567",
    dob: new Date("1998-06-15"),
    gender: "Male",
    country: "Nigeria",
    stateCity: "Victoria Island, Lagos",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    academicInfo: {
        status: "Graduate",
        institution: "University of Lagos",
        fieldOfStudy: "Economics & Islamic Finance",
        qualification: "Bachelor's Degree (First Class Honours)",
        gradYear: 2024,
        gradePointAverage: "4.85 / 5.00",
    },
    programInterest: {
        primary: ["Islamic Banking", "Sukuk Structuring", "ESG & Sustainable Finance"],
        secondary: "FinTech & Takaful",
    },
    skills: {
        relevantSkills: [
            "Sukuk Structuring",
            "Financial Modeling",
            "Credit Risk Analysis",
            "Shariah Governance & Audit",
            "Capital Markets Valuation",
        ],
        tools: ["Excel Financial Modeling", "Bloomberg Terminal", "Power BI", "Python"],
        programmingLanguages: ["Python", "SQL", "R"],
        languages: ["English (Fluent)", "Arabic (Professional Working)"],
        hasPriorInternship: true,
        priorInternshipDesc: "12-month corporate banking and Sukuk advisory internship at Lotus Bank Nigeria.",
        commSkillLevel: "Advanced",
        availability: "Immediately",
    },
    motivation: {
        whyApplying: "I am passionate about Shariah-compliant financial engineering and developing ethical capital market instruments across West Africa. IFIP provides the elite training, practical rigor, and direct partner network I need to scale my career in non-interest finance.",
        careerGoals: "To become a certified Shariah Advisory Lead and senior debt capital markets originator specializing in sovereign and corporate green Sukuk frameworks.",
    },
    cvUrl: "https://res.cloudinary.com/sample/raw/upload/v1/cv-zayd-mansoor.pdf",
    linkedinUrl: "https://linkedin.com/in/zaydmansoor",
    portfolioUrl: "https://github.com/zaydmansoor",
    altInstituteCertUrl: "https://res.cloudinary.com/sample/raw/upload/v1/cert-zayd-mansoor.pdf",
    leadSource: "Alumni Referral",
    declaration: {
        confirmed: true,
        signature: "Zayd Mansoor",
        date: new Date("2026-08-15"),
    },
};

const run = async () => {
    try {
        console.log("\n?? Connecting to MongoDB...");
        await mongoose.connect(env.MONGO_URI);
        console.log("   Connected!\n");

        // 1. Get or seed active Cohort
        let cohort = await Cohort.findOne({ status: "upcoming" });
        if (!cohort) {
            cohort = await Cohort.findOne({});
        }
        if (!cohort) {
            cohort = await Cohort.create({
                name: "IFIP Cohort 1 — 2026",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2026-12-01"),
                registrationStartDate: new Date("2026-07-01"),
                registrationEndDate: new Date("2026-12-31"),
                status: "upcoming",
                cohortCap: 100,
            });
            console.log("   ? Created Cohort:", cohort.name);
        } else {
            console.log("   ?? Using Cohort:", cohort.name);
        }

        // 2. Create or Update User
        const passwordHash = await bcrypt.hash(PARTICIPANT.password, 12);
        let user = await User.findOne({ email: PARTICIPANT.email });
        if (!user) {
            user = await User.create({
                email: PARTICIPANT.email,
                passwordHash,
                fullName: PARTICIPANT.fullName,
                phone: PARTICIPANT.phone,
                dob: PARTICIPANT.dob,
                gender: PARTICIPANT.gender,
                country: PARTICIPANT.country,
                stateCity: PARTICIPANT.stateCity,
                avatarUrl: PARTICIPANT.avatarUrl,
                role: "participant",
                emailVerified: true,
                mfaEnabled: false,
                lastLoginAt: new Date(),
            });
            console.log("   ? User created:", user.email);
        } else {
            user.passwordHash = passwordHash;
            user.fullName = PARTICIPANT.fullName;
            user.phone = PARTICIPANT.phone;
            user.dob = PARTICIPANT.dob;
            user.gender = PARTICIPANT.gender;
            user.country = PARTICIPANT.country;
            user.stateCity = PARTICIPANT.stateCity;
            user.avatarUrl = PARTICIPANT.avatarUrl;
            user.role = "participant";
            user.emailVerified = true;
            user.lastLoginAt = new Date();
            await user.save();
            console.log("   ?? User updated:", user.email);
        }

        // 3. Upsert Applicant document (Registration Flow record)
        let applicant = await Applicant.findOne({ email: PARTICIPANT.email });
        if (!applicant) {
            applicant = await Applicant.create({
                cohortId: cohort._id,
                email: PARTICIPANT.email,
                fullName: PARTICIPANT.fullName,
                phone: PARTICIPANT.phone,
                country: PARTICIPANT.country,
                stateCity: PARTICIPANT.stateCity,
                gender: PARTICIPANT.gender,
                dob: PARTICIPANT.dob,
                currentStep: 6,
                isPaid: true,
                levyAcknowledged: true,
                academicInfo: PARTICIPANT.academicInfo,
                programInterest: PARTICIPANT.programInterest,
                skills: PARTICIPANT.skills,
                motivation: PARTICIPANT.motivation,
                cvUrl: PARTICIPANT.cvUrl,
                leadSource: PARTICIPANT.leadSource,
                declaration: PARTICIPANT.declaration,
            });
            console.log("   ? Applicant record created.");
        } else {
            applicant.currentStep = 6;
            applicant.isPaid = true;
            applicant.levyAcknowledged = true;
            applicant.declaration = PARTICIPANT.declaration;
            await applicant.save();
            console.log("   ?? Applicant record updated.");
        }

        // 4. Upsert Payment document
        let payment = await Payment.findOne({ applicantId: applicant._id });
        if (!payment) {
            payment = await Payment.create({
                applicantId: applicant._id,
                provider: "flutterwave",
                providerRef: "FLW-FULL-PARTICIPANT-" + Date.now(),
                amount: 20000,
                currency: "NGN",
                status: "success",
                type: "commitment_levy",
                webhookVerified: true,
                receiptUrl: "https://res.cloudinary.com/sample/raw/upload/v1/receipt-zayd.pdf",
                paymentMethod: "card",
            });
            console.log("   ? Payment record created.");
        } else {
            payment.status = "success";
            payment.webhookVerified = true;
            await payment.save();
            console.log("   ?? Payment record updated.");
        }

        // 5. Upsert Application document (LMS & Placement-Ready record)
        let application = await Application.findOne({ userId: user._id });
        if (!application) {
            application = await Application.create({
                userId: user._id,
                cohortId: cohort._id,
                paymentId: payment._id,
                fullName: PARTICIPANT.fullName,
                phone: PARTICIPANT.phone,
                dob: PARTICIPANT.dob,
                gender: PARTICIPANT.gender,
                country: PARTICIPANT.country,
                stateCity: PARTICIPANT.stateCity,
                avatarUrl: PARTICIPANT.avatarUrl,
                academicInfo: PARTICIPANT.academicInfo,
                programInterest: PARTICIPANT.programInterest,
                skills: PARTICIPANT.skills,
                motivation: PARTICIPANT.motivation,
                cvUrl: PARTICIPANT.cvUrl,
                linkedinUrl: PARTICIPANT.linkedinUrl,
                portfolioUrl: PARTICIPANT.portfolioUrl,
                altInstituteCertUrl: PARTICIPANT.altInstituteCertUrl,
                leadSource: PARTICIPANT.leadSource,
                levyAcknowledged: true,
                declaration: PARTICIPANT.declaration,
                status: "placement_ready",
                submittedAt: new Date("2026-08-15"),
            });
            console.log("   ? Application record created with status: placement_ready.");
        } else {
            application.status = "placement_ready";
            application.cohortId = cohort._id;
            application.paymentId = payment._id;
            application.academicInfo = PARTICIPANT.academicInfo;
            application.programInterest = PARTICIPANT.programInterest;
            application.skills = PARTICIPANT.skills;
            application.motivation = PARTICIPANT.motivation;
            application.cvUrl = PARTICIPANT.cvUrl;
            application.linkedinUrl = PARTICIPANT.linkedinUrl;
            application.portfolioUrl = PARTICIPANT.portfolioUrl;
            application.altInstituteCertUrl = PARTICIPANT.altInstituteCertUrl;
            await application.save();
            console.log("   ?? Application record updated to placement_ready.");
        }

        // Link payment to application
        payment.applicationId = application._id as any;
        await payment.save();

        // 6. Populate LMS Progress & Assessment Submissions
        const modules = await Module.find({ status: "published" }).sort({ order: 1 });
        console.log(`   ?? Found ${modules.length} published LMS modules.`);

        for (const mod of modules) {
            // Find or link assessment
            let assessment = null;
            if (mod.assessmentId) {
                assessment = await Assessment.findById(mod.assessmentId);
            }
            if (!assessment) {
                assessment = await Assessment.findOne({ moduleId: mod._id });
            }

            // Create passed assessment submission
            let sub = await AssessmentSubmission.findOne({ userId: user._id, moduleId: mod._id });
            if (!sub) {
                sub = await AssessmentSubmission.create({
                    userId: user._id,
                    moduleId: mod._id,
                    assessmentId: assessment ? assessment._id : new mongoose.Types.ObjectId(),
                    attemptNumber: 1,
                    answers: [],
                    score: 94,
                    passed: true,
                    status: "passed",
                    startedAt: new Date(Date.now() - 3600000 * 2),
                    submittedAt: new Date(Date.now() - 3600000),
                });
            } else {
                sub.score = 94;
                sub.passed = true;
                sub.status = "passed";
                await sub.save();
            }

            // Create approved module task submission
            let taskSub = await ModuleTaskSubmission.findOne({ userId: user._id, moduleId: mod._id });
            if (!taskSub) {
                taskSub = await ModuleTaskSubmission.create({
                    userId: user._id,
                    moduleId: mod._id,
                    moduleTitle: mod.title,
                    fileUrl: "https://res.cloudinary.com/sample/raw/upload/v1/capstone-submission.pdf",
                    fileName: "Sukuk_Structuring_Capstone_Zayd_Mansoor.pdf",
                    note: "Comprehensive Sukuk structuring model and Shariah governance compliance note.",
                    status: "approved",
                    attemptNumber: 1,
                    pointsAwarded: 50,
                    adminFeedback: "Outstanding structural modeling and thorough documentation of Shariah covenants. Full marks.",
                    reviewedAt: new Date(),
                    submittedAt: new Date(Date.now() - 86400000),
                    windowOpen: true,
                });
            }

            // Create task reward
            let reward = await ModuleTaskReward.findOne({ submissionId: taskSub._id });
            if (!reward) {
                await ModuleTaskReward.create({
                    userId: user._id,
                    moduleId: mod._id,
                    submissionId: taskSub._id,
                    taskTitle: mod.moduleTask?.title || mod.title + " Practical Task",
                    pointsAwarded: 50,
                    status: "awarded",
                    awardedAt: new Date(),
                    reason: "Excellent capstone performance and rigorous financial analysis",
                });
            }

            // Create completed Progress record
            let progress = await Progress.findOne({ userId: user._id, moduleId: mod._id });
            if (!progress) {
                await Progress.create({
                    userId: user._id,
                    moduleId: mod._id,
                    status: "completed",
                    completedAt: new Date(),
                    assessmentStatus: "passed",
                    assessmentSubmissionId: sub._id,
                    moduleTaskStatus: "passed",
                    moduleTaskSubmissionId: taskSub._id,
                    taskPointsAwarded: 50,
                });
            } else {
                progress.status = "completed";
                progress.assessmentStatus = "passed";
                progress.moduleTaskStatus = "passed";
                progress.assessmentSubmissionId = sub._id as any;
                progress.moduleTaskSubmissionId = taskSub._id as any;
                progress.taskPointsAwarded = 50;
                progress.completedAt = new Date();
                await progress.save();
            }
        }

        // 7. Seed In-App Notifications
        const notificationsData = [
            {
                title: "Welcome to IFIP Cohort 1!",
                message: "Congratulations on completing registration! Your program dashboard and orientation are now live.",
                type: "success" as const,
                link: "/dashboard",
            },
            {
                title: "Assessment Milestone Passed",
                message: "You scored 94% on the Islamic Banking & Capital Markets assessment. Superb result!",
                type: "success" as const,
                link: "/dashboard/modules",
            },
            {
                title: "Capstone Task Approved: +50 Points",
                message: "Your submission for Sukuk Structuring Capstone was reviewed and awarded 50 points.",
                type: "info" as const,
                link: "/dashboard/rewards",
            },
            {
                title: "Talent Pool Active: Placement Ready",
                message: "You have been promoted to Placement Ready. Partner institutions can now review your portfolio.",
                type: "alert" as const,
                link: "/dashboard",
            },
        ];

        for (const n of notificationsData) {
            const exists = await Notification.findOne({ userId: user._id, title: n.title });
            if (!exists) {
                await Notification.create({
                    userId: user._id,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    read: false,
                    link: n.link,
                });
            }
        }

        console.log("\n==================================================================");
        console.log("?? FULL PARTICIPANT SEED COMPLETED SUCCESSFULLY!");
        console.log("==================================================================");
        console.log("?? Full Name:      ", PARTICIPANT.fullName);
        console.log("?? Email:          ", PARTICIPANT.email);
        console.log("?? Password:       ", PARTICIPANT.password);
        console.log("?? Phone:          ", PARTICIPANT.phone);
        console.log("?? Location:       ", PARTICIPANT.stateCity + ", " + PARTICIPANT.country);
        console.log("?? Degree:         ", PARTICIPANT.academicInfo.qualification + " - " + PARTICIPANT.academicInfo.institution);
        console.log("?? Interests:      ", PARTICIPANT.programInterest.primary.join(", "));
        console.log("??? Tools & Skills:  ", PARTICIPANT.skills.tools.join(", "));
        console.log("?? Payment Status:  SUCCESS (Flutterwave verified)");
        console.log("?? App Status:      PLACEMENT READY");
        console.log("?? LMS Progress:    All published modules 100% completed");
        console.log("?? Assessment:      Passed (94% Score)");
        console.log("?? Task Reward:     +50 Points Awarded");
        console.log("==================================================================\n");

    } catch (err: any) {
        console.error("? Seeding full participant failed:", err.message ?? err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("?? MongoDB disconnected.");
    }
};

run();
