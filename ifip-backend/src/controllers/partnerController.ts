import { Request, Response } from 'express';
import { PartnerApplication } from '../models/PartnerApplication.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { updateContentVersion } from './contentVersionController.js';

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/partners/apply
 * Public, unauthenticated — submit a new partner inquiry.
 */
export const submitPartnerApplication = async (req: Request, res: Response) => {
    try {
        const {
            companyName,
            contactEmail,
            contactPhone,
            contactPerson,
            website,
            sectorTags,
            description,
            activeSlots,
            logoUrl,
            hasOpenings,
            openings,
        } = req.body;

        if (!companyName || !contactEmail || !contactPhone || !contactPerson) {
            res.status(400).json({
                message: 'companyName, contactEmail, contactPhone, and contactPerson are required.',
            });
            return;
        }

        let processedOpenings = [];
        if (hasOpenings) {
            if (!Array.isArray(openings) || openings.length === 0) {
                res.status(400).json({ message: 'If hasOpenings is true, at least one opening must be provided.' });
                return;
            }
            for (const item of openings) {
                if (!item.role || !item.role.trim()) {
                    res.status(400).json({ message: 'Role title is required for all openings.' });
                    return;
                }
                if (!['Remote', 'Hybrid', 'On-site'].includes(item.mode)) {
                    res.status(400).json({ message: 'Invalid work mode for opening.' });
                    return;
                }
                if (['Hybrid', 'On-site'].includes(item.mode) && (!item.location || !item.location.trim())) {
                    res.status(400).json({ message: `Location is required for ${item.mode} openings.` });
                    return;
                }
                const count = Number(item.count);
                if (isNaN(count) || count < 1) {
                    res.status(400).json({ message: 'Count must be a positive integer.' });
                    return;
                }
                processedOpenings.push({
                    role: item.role.trim(),
                    mode: item.mode,
                    location: ['Hybrid', 'On-site'].includes(item.mode) ? item.location.trim() : undefined,
                    count
                });
            }
        }

        let computedSlots = activeSlots ? Number(activeSlots) : 0;
        if (hasOpenings) {
            computedSlots = processedOpenings.reduce((sum, item) => sum + item.count, 0);
        }

        const application = await PartnerApplication.create({
            companyName,
            contactEmail,
            contactPhone,
            contactPerson,
            website: website || undefined,
            sectorTags: Array.isArray(sectorTags) ? sectorTags : [],
            description: description || undefined,
            activeSlots: computedSlots,
            logoUrl: logoUrl || undefined,
            status: 'pending',
            hasOpenings: !!hasOpenings,
            openings: processedOpenings
        });

        // Send confirmation email (non-blocking — failure must not reject the API response)
        notificationEmitter.emit('partner.applied', {
            email: contactEmail,
            companyName,
            contactPerson,
            hasOpenings: application.hasOpenings,
            openings: application.openings
        });

        res.status(201).json({
            message: 'Partnership application submitted successfully. You will hear from us within 3–5 business days.',
            applicationId: application._id,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Error submitting partner application.', error: err.message });
    }
};

/**
 * GET /api/v1/partners/active
 * Public, unauthenticated — fetch active partner organizations for the landing page.
 */
export const getActivePartners = async (_req: Request, res: Response) => {
    try {
        const partners = await PartnerOrganization.find({ status: { $ne: 'inactive' } })
            .select('name logoUrl sectorTags description activeSlots website')
            .sort({ name: 1 });
        res.json(partners);
    } catch (err: any) {
        res.status(500).json({ message: 'Error retrieving active partners.', error: err.message });
    }
};

// ─── ADMIN (superadmin only — enforced at route level) ────────────────────────

/**
 * GET /api/v1/admin/partners/applications
 * List all partner applications, with optional ?status= filter.
 */
export const getPartnerApplications = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status && ['pending', 'approved', 'declined'].includes(status as string)) {
            filter.status = status;
        }
        const applications = await PartnerApplication.find(filter).sort({ createdAt: -1 });
        res.json(applications);
    } catch (err: any) {
        res.status(500).json({ message: 'Error retrieving partner applications.', error: err.message });
    }
};

/**
 * GET /api/v1/admin/partners/applications/:id
 * Fetch a single partner application by ID.
 */
export const getPartnerApplicationById = async (req: Request, res: Response) => {
    try {
        const application = await PartnerApplication.findById(req.params.id);
        if (!application) {
            res.status(404).json({ message: 'Partner application not found.' });
            return;
        }
        res.json(application);
    } catch (err: any) {
        res.status(500).json({ message: 'Error retrieving partner application.', error: err.message });
    }
};

/**
 * PATCH /api/v1/admin/partners/applications/:id
 * Approve or decline a pending partner application.
 * body: { action: 'approve' | 'decline', adminNotes?: string }
 *
 * On approve:
 *   - Creates a PartnerOrganization from the application fields
 *   - Sets PartnerApplication.status = 'approved'
 *   - Sends approval email
 *
 * On decline:
 *   - Sets PartnerApplication.status = 'declined'
 *   - Sends decline email with optional reason
 */
export const reviewPartnerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { action, adminNotes } = req.body;

        if (!action || !['approve', 'decline'].includes(action)) {
            res.status(400).json({ message: "action must be 'approve' or 'decline'." });
            return;
        }

        const application = await PartnerApplication.findById(id);
        if (!application) {
            res.status(404).json({ message: 'Partner application not found.' });
            return;
        }

        if (application.status !== 'pending') {
            res.status(409).json({
                message: `Application has already been ${application.status}. No further action required.`,
            });
            return;
        }

        application.reviewedAt = new Date();
        if (adminNotes) application.adminNotes = adminNotes;

        if (action === 'approve') {
            // Create the live PartnerOrganization from the application data
            const newOrg = await PartnerOrganization.create({
                name:          application.companyName,
                contactEmail:  application.contactEmail,
                contactPerson: application.contactPerson,
                contactPhone:  application.contactPhone,
                website:       application.website,
                sectorTags:    application.sectorTags,
                description:   application.description,
                activeSlots:   application.activeSlots || 5,
                logoUrl:       application.logoUrl,
                status:        'active',
                cohorts:       [],
                hasOpenings:   application.hasOpenings || false,
                openings:      application.openings || [],
            });

            application.status = 'approved';
            await application.save();

            notificationEmitter.emit('partner.reviewed', {
                email: application.contactEmail,
                companyName: application.companyName,
                contactPerson: application.contactPerson,
                status: 'approved',
                adminNotes
            });

            await updateContentVersion('partners');
            res.json({
                message: `${application.companyName} has been approved and added as an active partner.`,
                partnerOrganization: newOrg,
            });
        } else {
            // Decline
            application.status = 'declined';
            await application.save();

            notificationEmitter.emit('partner.reviewed', {
                email: application.contactEmail,
                companyName: application.companyName,
                contactPerson: application.contactPerson,
                status: 'declined',
                adminNotes
            });

            res.json({ message: `${application.companyName}'s application has been declined.` });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error reviewing partner application.', error: err.message });
    }
};

// ─── ADMIN: Direct Partner Org CRUD (superadmin only) ────────────────────────

/**
 * GET /api/v1/admin/partners
 * List all partner organizations.
 */
export const getAdminPartners = async (_req: Request, res: Response) => {
    try {
        const partners = await PartnerOrganization.find().sort({ name: 1 });
        res.json(partners);
    } catch (err: any) {
        res.status(500).json({ message: 'Error retrieving partner organizations.', error: err.message });
    }
};

/**
 * POST /api/v1/admin/partners
 * Directly create a new partner organization (superadmin shortcut — bypasses application flow).
 */
export const createPartnerOrg = async (req: Request, res: Response) => {
    try {
        const { name, logoUrl, description, sectorTags, activeSlots, website, cohorts, contactEmail, contactPerson, contactPhone, status, hasOpenings, openings } = req.body;
        if (!name) {
            res.status(400).json({ message: 'name is required.' });
            return;
        }
        const org = await PartnerOrganization.create({
            name,
            logoUrl:       logoUrl || undefined,
            description:   description || undefined,
            sectorTags:    Array.isArray(sectorTags) ? sectorTags : [],
            activeSlots:   activeSlots !== undefined ? Number(activeSlots) : 5,
            website:       website || undefined,
            cohorts:       Array.isArray(cohorts) ? cohorts : [],
            contactEmail:  contactEmail || undefined,
            contactPerson: contactPerson || undefined,
            contactPhone:  contactPhone || undefined,
            status:        status || 'active',
            hasOpenings:   !!hasOpenings,
            openings:      Array.isArray(openings) ? openings : [],
        });
        await updateContentVersion('partners');
        res.status(201).json({ message: 'Partner organization created.', partnerOrganization: org });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating partner organization.', error: err.message });
    }
};

/**
 * PATCH /api/v1/admin/partners/:id
 * Update an existing partner organization.
 */
export const updatePartnerOrg = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, logoUrl, description, sectorTags, activeSlots, website, cohorts, contactEmail, contactPerson, contactPhone, status, hasOpenings, openings } = req.body;

        const org = await PartnerOrganization.findById(id);
        if (!org) {
            res.status(404).json({ message: 'Partner organization not found.' });
            return;
        }

        if (name          !== undefined) org.name          = name;
        if (logoUrl       !== undefined) org.logoUrl       = logoUrl;
        if (description   !== undefined) org.description   = description;
        if (sectorTags    !== undefined) org.sectorTags    = sectorTags;
        if (activeSlots   !== undefined) org.activeSlots   = Number(activeSlots);
        if (website       !== undefined) org.website       = website;
        if (cohorts       !== undefined) org.cohorts       = cohorts;
        if (contactEmail  !== undefined) org.contactEmail  = contactEmail;
        if (contactPerson !== undefined) org.contactPerson = contactPerson;
        if (contactPhone  !== undefined) org.contactPhone  = contactPhone;
        if (status        !== undefined) org.status        = status;
        if (hasOpenings   !== undefined) org.hasOpenings   = !!hasOpenings;
        if (openings      !== undefined) org.openings      = Array.isArray(openings) ? openings : [];

        await org.save();
        await updateContentVersion('partners');
        res.json({ message: 'Partner organization updated.', partnerOrganization: org });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating partner organization.', error: err.message });
    }
};

/**
 * DELETE /api/v1/admin/partners/:id
 * Remove a partner organization.
 */
export const deletePartnerOrg = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await PartnerOrganization.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Partner organization not found.' });
            return;
        }
        await updateContentVersion('partners');
        res.json({ message: 'Partner organization deleted.' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting partner organization.', error: err.message });
    }
};
