import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { env } from '../config/env.js';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Real partner list with website links and logo file names
const partnersData = [
    {
        name: 'Stecs',
        logoFile: 'stecs.png',
        website: 'https://stecs.ng/',
        description: 'Providing premium accounting, financial consulting, advisory and tax services.',
        sectorTags: ['Financial Services', 'Advisory'],
        activeSlots: 5
    },
    {
        name: 'Halvest',
        logoFile: 'halal-invest.png',
        website: 'https://halvestco.com/',
        description: 'Empowering ethical financial investments and wealth management.',
        sectorTags: ['Ethical Investing', 'Wealth Management'],
        activeSlots: 5
    },
    {
        name: 'Ethica Capita',
        logoFile: 'ethica-capital.jpg',
        website: 'https://ethicacapitalltd.com/',
        description: 'Leading provider of capital and corporate Shariah-compliant financial advisory.',
        sectorTags: ['Advisory', 'Capital Markets'],
        activeSlots: 5
    },
    {
        name: 'EthicalVest',
        logoFile: 'ethikavest.jpeg',
        website: 'https://www.ethivestglobal.com/',
        description: 'Global micro-investments and ethical crowdfunding platform.',
        sectorTags: ['Crowdfunding', 'Ethical Investing'],
        activeSlots: 5
    },
    {
        name: 'IFING Media',
        logoFile: 'ifing-media.png',
        website: 'https://www.ifingmedia.com/',
        description: 'Pioneering news, insights, and media coverage on the Islamic Finance ecosystem.',
        sectorTags: ['Media', 'Publishing'],
        activeSlots: 5
    },
    {
        name: 'MTech',
        logoFile: 'mtech.jpg',
        website: 'http://www.mtechnoble.com',
        description: 'Innovative developer of technical infrastructure and systems.',
        sectorTags: ['Technology', 'Software Development'],
        activeSlots: 5
    },
    {
        name: 'Infaq',
        logoFile: 'infaq-ng.png',
        website: 'https://www.infaq.ng/',
        description: 'Shariah-compliant charity, donation, and interest-free social financial platform.',
        sectorTags: ['Social Finance', 'Charity'],
        activeSlots: 5
    },
    {
        name: 'One17 Capital',
        logoFile: 'one17-capital.jpg',
        website: 'https://one17capital.com/',
        description: 'Specialist ethical finance managers, investing in high-impact opportunities.',
        sectorTags: ['Fund Management', 'Ethical Investing'],
        activeSlots: 5
    },
    {
        name: 'Bas Financial Services',
        logoFile: 'bas-financial-services.png',
        website: 'https://basgroup.ng/subsidiaries/bas-financials',
        description: 'Offering diversified financial planning and support services.',
        sectorTags: ['Financial Planning', 'Advisory'],
        activeSlots: 5
    },
    {
        name: 'The Metropolitan Law Firm',
        logoFile: 'the-metropolitan-law-firm.png',
        website: 'https://metlawfirm.com/',
        description: 'A premium, full-service commercial law firm with specialized corporate practice.',
        sectorTags: ['Legal', 'Advisory'],
        activeSlots: 5
    }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(env.MONGO_URI);
        console.log('Connected.');

        console.log('Clearing existing partners...');
        await PartnerOrganization.deleteMany({});
        console.log('Cleared.');

        const logoDirectory = path.join(__dirname, '../../../ifip-frontend/public/images/partners');
        console.log('Checking logo files in:', logoDirectory);

        const seededPartners = [];

        for (const partner of partnersData) {
            const localPath = path.join(logoDirectory, partner.logoFile);
            if (!fs.existsSync(localPath)) {
                console.warn(`Warning: Local logo file not found for ${partner.name} at ${localPath}`);
                continue;
            }

            console.log(`Uploading ${partner.logoFile} for ${partner.name} to Cloudinary...`);
            const uploadResult = await cloudinary.uploader.upload(localPath, {
                folder: 'ifipp/partners',
                resource_type: 'image'
            });

            console.log(`Uploaded. URL: ${uploadResult.secure_url}`);

            seededPartners.push({
                name: partner.name,
                logoUrl: uploadResult.secure_url,
                website: partner.website,
                description: partner.description,
                sectorTags: partner.sectorTags,
                activeSlots: partner.activeSlots
            });
        }

        if (seededPartners.length > 0) {
            console.log('Inserting default partner organizations...');
            await PartnerOrganization.insertMany(seededPartners);
            console.log('Partners seeded successfully!');
        } else {
            console.log('No partners seeded (no logos found).');
        }

    } catch (err: any) {
        console.error('Seeding failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

seed();
