import mongoose from "mongoose";
import { Module } from "../models/Module.js";
import { env } from "../config/env.js";

const run = async () => {
    try {
        console.log("\n?? Connecting to MongoDB...");
        await mongoose.connect(env.MONGO_URI);
        console.log("   Connected!\n");

        // -- MODULE 1 OUTLINE --
        const module1 = await Module.findOne({ order: 1 });
        if (module1) {
            module1.outline = {
                purpose: "This module aims to provide participants with a foundational understanding of Islamic finance, its core principles, ecosystem, and major financial products and contracts.",
                learningObjectives: [
                    "Explain the basic principles and objectives of Islamic finance.",
                    "Identify key sectors within the Islamic finance ecosystem.",
                    "Recognise major Islamic finance products and contracts.",
                    "Relate foundational Islamic finance principles to practical financial situations."
                ],
                topics: [
                    {
                        title: "1. Introduction to Islamic Finance",
                        subtopics: [
                            "What is Islamic Finance? Meaning and concept",
                            "Objectives of Islamic finance (Maqasid al-Shariah)",
                            "History and modern evolution of Islamic finance",
                            "Foundational principles and philosophical distinction",
                            "Comparative analysis: Islamic finance vs. conventional finance"
                        ],
                        learningActivity: "Review comparative case study on risk-sharing vs debt-financing paradigms."
                    },
                    {
                        title: "2. Core Principles & Prohibitions",
                        subtopics: [
                            "Riba (Usury/Interest) — types, economic impact, and prohibition rationale",
                            "Gharar (Excessive Uncertainty/Ambiguity) in contractual terms",
                            "Maysir (Gambling/Speculation) and ethical wealth creation",
                            "Risk-sharing and asset-backing imperatives",
                            "Shariah governance frameworks and supervisory boards"
                        ],
                        learningActivity: "Scenario analysis: Identifying and addressing prohibited elements in real-world transactions."
                    },
                    {
                        title: "3. The Islamic Finance Ecosystem",
                        subtopics: [
                            "Islamic Banking: Retail and commercial models",
                            "Takaful (Islamic Cooperative Insurance) vs conventional insurance",
                            "Sukuk and Islamic Capital Markets overview",
                            "Islamic Asset Management, Funds, and Ethical Wealth Planning",
                            "Islamic FinTech, Crowdfunding, and Microfinance platforms",
                            "Supporting standard-setting bodies (AAOIFI, IFSB)"
                        ],
                        learningActivity: "Explore global industry map and structural role of standard-setting institutions."
                    },
                    {
                        title: "4. Major Islamic Finance Contracts & Structures",
                        subtopics: [
                            "Murabahah (Cost-Plus Financing Structure)",
                            "Mudarabah (Trustee Profit-Sharing Financing)",
                            "Musharakah (Joint Venture Equity Partnership)",
                            "Ijarah (Leasing of Assets and Usufruct)",
                            "Salam (Advance Payment for Deferred Commodity Delivery)",
                            "Istisna' (Manufacturing and Project Finance Contracts)",
                            "Sukuk (Asset-Backed Investment Certificates)"
                        ],
                        learningActivity: "Interactive contract identification and cash-flow breakdown."
                    }
                ],
                expectedOutcomes: [
                    "Complete understanding of Shariah-compliant financial mechanisms and contracts.",
                    "Ability to differentiate between interest-based debt and ethical risk-sharing models.",
                    "Mastery of foundational terminology and regulatory frameworks (AAOIFI/IFSB).",
                    "Readiness for Module 1 Knowledge & Assessment Evaluation."
                ]
            };

            module1.moduleTask = {
                title: "Foundations Knowledge & Application Check",
                description: "Review all 4 core topic breakdowns above, study the accompanying reading material, and complete the Module 1 Knowledge Assessment to unlock Module 2.",
                instructions: "Review the topic outlines above, take detailed notes on the fundamental contracts (Murabahah, Mudarabah, Musharakah, Ijarah), and proceed to the Assessment when ready.",
                requiresUpload: false,
                isRequired: true
            };

            await module1.save();
            console.log("   ? Successfully populated full outline and syllabus for Module 1!");
        } else {
            console.log("   ?? Module 1 not found in database.");
        }

        // Print diagnostic of Module 1
        const updated1 = await Module.findOne({ order: 1 }).lean();
        console.log("\n?? Module 1 Status in Database:");
        console.log("  Title:           ", updated1?.title);
        console.log("  Objectives Count:", updated1?.outline?.learningObjectives?.length);
        console.log("  Topics Count:    ", updated1?.outline?.topics?.length);
        console.log("  Outcomes Count:  ", updated1?.outline?.expectedOutcomes?.length);
        console.log("  Has Task:        ", !!updated1?.moduleTask);
        console.log("");

    } catch (err: any) {
        console.error("? Error updating module outlines:", err.message ?? err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("?? MongoDB disconnected.\n");
    }
};

run();
