import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getNotifications,
    getCvRequestDetails,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/:id/cv-request', authorize('participant'), getCvRequestDetails);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
