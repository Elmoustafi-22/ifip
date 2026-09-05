import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getResources,
    createResource,
    updateResource,
    deleteResource,
} from '../controllers/resourceController.js';

const router = Router();

router.use(authenticate);

// Public to all authenticated users (participants & admins)
router.get('/', getResources);

// Admin-only management endpoints
router.post('/', authorize('admin', 'superadmin'), createResource);
router.put('/:id', authorize('admin', 'superadmin'), updateResource);
router.delete('/:id', authorize('admin', 'superadmin'), deleteResource);

export default router;
