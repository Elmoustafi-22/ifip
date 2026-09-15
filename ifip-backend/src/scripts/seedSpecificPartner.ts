import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { env } from '../config/env.js';

const partnerEmail = 'elmoustafi97@gmail.com';
const partnerPassword = 'PartnerPassword123!';
const partnerName = 'Mustapha Elmoustafi';
const orgName = 'Elmoustafi Capital & Advisory';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // 1. Find or create PartnerOrganization
        let org = await PartnerOrganization.findOne({ contactEmail: partnerEmail });
        if (!org) {
            console.log(`Creating PartnerOrganization for ${orgName}...`);
            org = await PartnerOrganization.create({
                name: orgName,
                logoUrl: 'https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png',
                description: 'Premier Islamic investment, capital markets, and ethical advisory partner.',
                sectorTags: ['Islamic Banking', 'Capital Markets', 'Advisory', 'FinTech'],
                activeSlots: 5,
                contactEmail: partnerEmail,
                contactPerson: partnerName,
                contactPhone: '+2348000000000',
                website: 'https://ifip.org',
                portalEnabled: true,
                hasOpenings: true,
                openings: [
                    { role: 'Islamic Finance Analyst', mode: 'Hybrid', location: 'Lagos, Nigeria', count: 2 },
                    { role: 'Shariah Advisory Intern', mode: 'Remote', count: 1 }
                ]
            });
            console.log(`PartnerOrganization created with ID: ${org._id}`);
        } else {
            org.name = org.name || orgName;
            org.contactPerson = partnerName;
            org.portalEnabled = true;
            if (!org.sectorTags || org.sectorTags.length === 0) {
                org.sectorTags = ['Islamic Banking', 'Capital Markets', 'Advisory', 'FinTech'];
            }
            await org.save();
            console.log(`Updated existing PartnerOrganization ID: ${org._id}`);
        }

        // 2. Find or create User with 'partner' role
        const passwordHash = await bcrypt.hash(partnerPassword, 12);
        let partnerUser = await User.findOne({ email: partnerEmail });

        if (!partnerUser) {
            partnerUser = await User.create({
                email: partnerEmail,
                passwordHash,
                role: 'partner',
                fullName: partnerName,
                phone: '+2348000000000',
                orgId: org._id,
                emailVerified: true
            });
            console.log(`Created new Partner User account for ${partnerEmail}`);
        } else {
            partnerUser.passwordHash = passwordHash;
            partnerUser.role = 'partner';
            partnerUser.fullName = partnerName;
            partnerUser.orgId = org._id as any;
            partnerUser.emailVerified = true;
            await partnerUser.save();
            console.log(`Updated existing User account for ${partnerEmail} to partner role`);
        }

        console.log('\n========================================');
        console.log('✅ PARTNER SEEDED SUCCESSFULLY');
        console.log('========================================');
        console.log(`Portal URL:  http://localhost:3000/login (or your production URL)`);
        console.log(`Email:       ${partnerEmail}`);
        console.log(`Password:    ${partnerPassword}`);
        console.log(`Role:        partner`);
        console.log(`Org Name:    ${org.name}`);
        console.log(`Org ID:      ${org._id}`);
        console.log('========================================\n');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding partner:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
