import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { PartnerInterest } from '../models/PartnerInterest.js';
import { Placement } from '../models/Placement.js';
import { Notification } from '../models/Notification.js';
import { env } from '../config/env.js';

const email = 'mustophaqadir@gmail.com';
const fullName = 'Mustopha Qadir';
const password = 'ParticipantPass123!';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected.');

        // 1. Create or update User
        const passwordHash = await bcrypt.hash(password, 12);
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                email,
                fullName,
                passwordHash,
                role: 'participant',
                emailVerified: true,
                country: 'Nigeria',
                stateCity: 'Lagos',
                phone: '+2348012345678',
            });
            console.log(`Created new User account for ${email} (ID: ${user._id})`);
        } else {
            user.fullName = fullName;
            user.passwordHash = passwordHash;
            user.role = 'participant';
            user.emailVerified = true;
            user.country = 'Nigeria';
            user.stateCity = 'Lagos';
            user.phone = '+2348012345678';
            await user.save();
            console.log(`Updated existing User account for ${email} (ID: ${user._id})`);
        }

        // 2. Create or update Application in 'placement_ready' status
        let app = await Application.findOne({ userId: user._id });
        const appPayload = {
            userId: user._id,
            paymentId: app?.paymentId || new mongoose.Types.ObjectId(),
            fullName: user.fullName,
            status: 'placement_ready' as const,
            personal: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || '+2348012345678',
                country: 'Nigeria',
                stateCity: 'Lagos',
                linkedInUrl: 'https://linkedin.com/in/mustophaqadir',
            },
            academic: {
                institution: 'University of Lagos',
                fieldOfStudy: 'Banking & Finance',
                qualification: 'B.Sc. Banking & Finance (First Class Honours)',
                gradYear: 2024,
            },
            skills: {
                tools: ['Financial Modeling', 'Excel', 'Bloomberg Terminal', 'PowerBI'],
                programmingLanguages: ['Python', 'SQL'],
            },
            programInterest: {
                primary: ['Sukuk & Capital Markets'],
                secondary: 'Islamic Banking & Finance',
                areasOfInterest: ['Sukuk Structuring', 'Capital Markets', 'Islamic Banking'],
            },
            whyApplying: 'Passionate about advancing Shariah-compliant capital markets and structuring innovative Sukuk instruments across emerging markets.',
            careerGoals: 'To become a certified Islamic Investment Banker and lead ethical capital market issuances.',
            cvUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_cv.pdf',
            submittedAt: new Date(),
        };

        if (!app) {
            app = await Application.create(appPayload as any);
            console.log(`Created placement-ready Application for ${email}`);
        } else {
            Object.assign(app, appPayload);
            await app.save();
            console.log(`Updated Application to placement_ready for ${email}`);
        }

        // 3. Ensure a passed Assessment submission so they display as evaluated
        let sub = await AssessmentSubmission.findOne({ userId: user._id });
        if (!sub) {
            await AssessmentSubmission.create({
                userId: user._id,
                assessmentId: new mongoose.Types.ObjectId(),
                moduleId: new mongoose.Types.ObjectId(),
                attemptNumber: 1,
                answers: [],
                score: 94,
                passed: true,
                status: 'passed',
                startedAt: new Date(),
                submittedAt: new Date(),
            });
            console.log(`Created passed AssessmentSubmission (score: 94%)`);
        } else {
            sub.status = 'passed';
            sub.score = 94;
            sub.passed = true;
            await sub.save();
            console.log(`Updated AssessmentSubmission to passed (score: 94%)`);
        }

        // 4. Clean up any previous PartnerInterests, Placements, or Notifications
        const deletedInterests = await PartnerInterest.deleteMany({ userId: user._id });
        const deletedPlacements = await Placement.deleteMany({ userId: user._id });
        const deletedNotifications = await Notification.deleteMany({ userId: user._id });

        console.log(`Cleared previous partner interests: ${deletedInterests.deletedCount}`);
        console.log(`Cleared previous placements: ${deletedPlacements.deletedCount}`);
        console.log(`Cleared previous notifications for participant: ${deletedNotifications.deletedCount}`);

        console.log('\n======================================================');
        console.log('✅ PARTICIPANT SEEDED (READY FOR PARTNER REQUEST TEST)');
        console.log('======================================================');
        console.log(`Name:              ${fullName}`);
        console.log(`Email:             ${email}`);
        console.log(`Password:          ${password}`);
        console.log(`Role:              participant`);
        console.log(`Application Status: placement_ready`);
        console.log(`Interest:          Sukuk & Capital Markets`);
        console.log(`Partner Request:   CLEAN / UNREQUESTED / UNAPPROVED`);
        console.log('======================================================\n');

        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
        process.exit(0);
    } catch (err: any) {
        console.error('Error seeding unapproved participant:', err.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
