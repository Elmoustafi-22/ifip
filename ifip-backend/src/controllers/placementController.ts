import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Placement } from '../models/Placement.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

// --- Student Endpoints ---
export const getMyPlacement = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const placement = await Placement.findOne({ userId: new Types.ObjectId(userId) })
            .populate('partnerOrgId');
        
        if (!placement) {
            res.status(404).json({ message: 'No placement match found yet.' });
            return;
        }
        
        res.json(placement);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving placement.', error: e.message });
    }
};

// --- Admin Endpoints ---
export const getAdminPlacements = async (req: Request, res: Response) => {
    try {
        const placements = await Placement.find()
            .populate('userId', 'email fullName')
            .populate('partnerOrgId');
        res.json(placements);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving placements.', error: e.message });
    }
};

export const createMatch = async (req: Request, res: Response) => {
    try {
        const { userId, partnerOrgId, areaOfInterest, notes } = req.body;
        
        if (!userId || !partnerOrgId) {
            res.status(400).json({ message: 'userId and partnerOrgId are required.' });
            return;
        }
        
        const partner = await PartnerOrganization.findById(partnerOrgId);
        if (!partner) {
            res.status(404).json({ message: 'Partner organization not found.' });
            return;
        }
        
        if (partner.activeSlots <= 0) {
            res.status(400).json({ message: 'No active slots remaining in this organization.' });
            return;
        }

        // Check if user already has a match
        let placement = await Placement.findOne({ userId: new Types.ObjectId(userId) });
        if (placement) {
            // Restore previous slot of old partner
            await PartnerOrganization.findByIdAndUpdate(placement.partnerOrgId, { $inc: { activeSlots: 1 } });
            
            placement.partnerOrgId = new Types.ObjectId(partnerOrgId) as any;
            placement.areaOfInterest = areaOfInterest;
            placement.notes = notes;
            placement.status = 'matched';
            await placement.save();
        } else {
            placement = new Placement({
                userId: new Types.ObjectId(userId),
                partnerOrgId: new Types.ObjectId(partnerOrgId),
                areaOfInterest,
                notes,
                status: 'matched'
            });
            await placement.save();
        }

        // Decrement slots
        partner.activeSlots -= 1;
        await partner.save();

        // Notify student via event emitter
        const studentUser = await User.findById(userId);
        if (studentUser) {
            notificationEmitter.emit('placement.matched', {
                userId,
                userEmail: studentUser.email,
                userFullName: studentUser.fullName,
                partner,
                area: areaOfInterest,
                notes
            });
        }

        res.json({ message: 'Placement match registered successfully.', placement });
    } catch (e: any) {
        res.status(500).json({ message: 'Error registering match.', error: e.message });
    }
};

export const updateMatchStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const placement = await Placement.findById(id).populate('partnerOrgId');
        if (!placement) {
            res.status(404).json({ message: 'Placement not found.' });
            return;
        }
        
        const oldStatus = placement.status;
        placement.status = status;
        if (notes !== undefined) placement.notes = notes;
        await placement.save();

        const partnerName = (placement.partnerOrgId as any)?.name || 'Partner Org';

        // Adjust slots dynamically if matching status changes
        if (status === 'declined' && oldStatus !== 'declined') {
            await PartnerOrganization.findByIdAndUpdate(placement.partnerOrgId, { $inc: { activeSlots: 1 } });
        } else if (oldStatus === 'declined' && status !== 'declined') {
            await PartnerOrganization.findByIdAndUpdate(placement.partnerOrgId, { $inc: { activeSlots: -1 } });
        }

        // Send update notification via event emitter
        const studentUser = await User.findById(placement.userId);
        if (studentUser) {
            notificationEmitter.emit('placement.status_updated', {
                userId: placement.userId,
                userEmail: studentUser.email,
                userFullName: studentUser.fullName,
                partnerName,
                status
            });
        }

        res.json({ message: 'Placement status updated successfully.', placement });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating status.', error: e.message });
    }
};

// --- Partner Management Endpoints ---
export const getPartners = async (req: Request, res: Response) => {
    try {
        const partners = await PartnerOrganization.find().sort({ name: 1 });
        res.json(partners);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving partners.', error: e.message });
    }
};

export const createPartner = async (req: Request, res: Response) => {
    try {
        const { name, logoUrl, description, sectorTags, activeSlots, website, cohorts } = req.body;
        if (!name) {
            res.status(400).json({ message: 'Partner name is required.' });
            return;
        }
        
        const partner = new PartnerOrganization({
            name,
            logoUrl,
            description,
            sectorTags: sectorTags || [],
            activeSlots: activeSlots !== undefined ? activeSlots : 5,
            website,
            cohorts: cohorts || []
        });
        await partner.save();
        res.json(partner);
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating partner.', error: e.message });
    }
};

export const updatePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, logoUrl, description, sectorTags, activeSlots, website, cohorts } = req.body;
        
        const partner = await PartnerOrganization.findById(id);
        if (!partner) {
            res.status(404).json({ message: 'Partner organization not found.' });
            return;
        }
        
        if (name !== undefined) partner.name = name;
        if (logoUrl !== undefined) partner.logoUrl = logoUrl;
        if (description !== undefined) partner.description = description;
        if (sectorTags !== undefined) partner.sectorTags = sectorTags;
        if (activeSlots !== undefined) partner.activeSlots = activeSlots;
        if (website !== undefined) partner.website = website;
        if (cohorts !== undefined) partner.cohorts = cohorts;
        
        await partner.save();
        res.json(partner);
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating partner.', error: e.message });
    }
};

export const deletePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const partner = await PartnerOrganization.findByIdAndDelete(id);
        if (!partner) {
            res.status(404).json({ message: 'Partner organization not found.' });
            return;
        }
        res.json({ message: 'Partner organization deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting partner.', error: e.message });
    }
};
