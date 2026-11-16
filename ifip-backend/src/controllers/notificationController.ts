import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { unread } = req.query;
        
        const filter: any = {
            userId,
            // Exclude notifications that have passed their expiry date
            $or: [
                { expiresAt: null },
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        };
        if (unread === 'true') {
            filter.read = false;
        }
        
        const notifications = await Notification.find(filter)
            .select('+cvRequestOrgId').sort({ createdAt: -1 }).limit(50).lean();
        res.json(notifications.map(({ cvRequestOrgId, ...notification }) => ({
            ...notification,
            link: cvRequestOrgId ? `/dashboard/cv-requests/${notification._id}` : notification.link,
        })));
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving notifications.', error: e.message });
    }
};

export const getCvRequestDetails = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!Types.ObjectId.isValid(id)) {
            res.status(404).json({ message: 'CV request not found.' });
            return;
        }
        const request = await Notification.findOne({
            _id: id,
            userId: req.user!.id,
            cvRequestOrgId: { $exists: true },
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).select('+cvRequestOrgId').lean();
        if (!request) {
            res.status(404).json({ message: 'CV request not found.' });
            return;
        }

        const company = await PartnerOrganization.findById(request.cvRequestOrgId)
            .select('name description sectorTags website -_id').lean();
        res.set('Cache-Control', 'no-store');
        res.json({ company });
    } catch {
        res.status(500).json({ message: 'Could not load the CV request. Please try again.' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { read: true },
            { new: true }
        );
        
        if (!notification) {
            res.status(404).json({ message: 'Notification not found.' });
            return;
        }
        
        res.json({ message: 'Notification marked as read.', notification });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating notification.', error: e.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        await Notification.updateMany({ userId, read: false }, { read: true });
        res.json({ message: 'All notifications marked as read.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating notifications.', error: e.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        
        const notification = await Notification.findOneAndDelete({ _id: id, userId });
        if (!notification) {
            res.status(404).json({ message: 'Notification not found.' });
            return;
        }
        
        res.json({ message: 'Notification deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting notification.', error: e.message });
    }
};
