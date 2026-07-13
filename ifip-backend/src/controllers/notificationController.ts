import type { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { unread } = req.query;
        
        const filter: any = { userId };
        if (unread === 'true') {
            filter.read = false;
        }
        
        const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving notifications.', error: e.message });
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
