import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Application } from '../models/Application.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';

// ─── GET /api/v1/resources ────────────────────────────────────────────────────
export const getResources = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const { category, cohortId } = req.query;

        const filter: any = {};

        if (category && category !== 'all') {
            filter.category = category;
        }

        // Admin filtering
        if (user.role === 'admin' || user.role === 'superadmin') {
            if (cohortId) {
                filter.$or = [{ cohortId: new Types.ObjectId(cohortId as string) }, { cohortId: { $exists: false } }, { cohortId: null }];
            }
        } else {
            // Participant: get their assigned cohort
            const app = await Application.findOne({ userId: new Types.ObjectId(user.id) });
            const userCohortId = app?.cohortId;

            if (userCohortId) {
                filter.$or = [
                    { cohortId: userCohortId },
                    { cohortId: { $exists: false } },
                    { cohortId: null }
                ];
            } else {
                filter.$or = [
                    { cohortId: { $exists: false } },
                    { cohortId: null }
                ];
            }
        }

        const resources = await Resource.find(filter)
            .populate('uploadedBy', 'fullName title email')
            .populate('cohortId', 'name year')
            .sort({ createdAt: -1 });

        res.json(resources);
    } catch (e: any) {
        res.status(500).json({ message: 'Error fetching resources.', error: e.message });
    }
};

const parseCohortId = (cohortId: any): Types.ObjectId | undefined => {
    if (!cohortId || cohortId === 'all' || cohortId === 'null') return undefined;
    const raw = typeof cohortId === 'object' && cohortId._id ? cohortId._id : cohortId;
    if (typeof raw === 'string' && Types.ObjectId.isValid(raw)) {
        return new Types.ObjectId(raw);
    }
    return undefined;
};

// ─── POST /api/v1/resources ───────────────────────────────────────────────────
export const createResource = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { title, description, category, fileUrl, fileType, fileSize, cohortId } = req.body;

        if (!title || !description) {
            res.status(400).json({ message: 'Title and description are required.' });
            return;
        }

        const validFileTypes = ['pdf', 'pptx', 'docx', 'xlsx', 'link', 'video', 'other'];
        const normalizedFileType = fileType && validFileTypes.includes(String(fileType).toLowerCase())
            ? (String(fileType).toLowerCase() as any)
            : (fileType ? 'other' : 'link');

        const newResource = new Resource({
            title: String(title).trim(),
            description: String(description).trim(),
            category: category ? String(category).trim().toLowerCase() : 'general',
            fileUrl: fileUrl ? String(fileUrl).trim() : '',
            fileType: normalizedFileType,
            fileSize: fileSize || '',
            cohortId: parseCohortId(cohortId),
            uploadedBy: new Types.ObjectId(userId)
        });

        await newResource.save();

        // Emit notification event to send in-app and email alerts to paid participants
        notificationEmitter.emit('resource.published', {
            resourceTitle: newResource.title,
            category: newResource.category,
            fileType: newResource.fileType,
            description: newResource.description,
            cohortId: newResource.cohortId
        });

        res.status(201).json({ message: 'Resource published successfully.', resource: newResource });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating resource.', error: e.message });
    }
};

// ─── PUT /api/v1/resources/:id ────────────────────────────────────────────────
export const updateResource = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const resourceId = Array.isArray(id) ? id[0] : id;
        const { title, description, category, fileUrl, fileType, fileSize, cohortId } = req.body;

        if (!resourceId || !Types.ObjectId.isValid(resourceId)) {
            res.status(400).json({ message: 'Invalid resource ID.' });
            return;
        }

        const resource = await Resource.findById(resourceId);
        if (!resource) {
            res.status(404).json({ message: 'Resource not found.' });
            return;
        }

        const validFileTypes = ['pdf', 'pptx', 'docx', 'xlsx', 'link', 'video', 'other'];

        if (title !== undefined) resource.title = String(title).trim();
        if (description !== undefined) resource.description = String(description).trim();
        if (category !== undefined) resource.category = String(category).trim().toLowerCase() || 'general';
        if (fileUrl !== undefined) resource.fileUrl = String(fileUrl).trim();
        if (fileType !== undefined) {
            resource.fileType = validFileTypes.includes(String(fileType).toLowerCase())
                ? (String(fileType).toLowerCase() as any)
                : 'other';
        }
        if (fileSize !== undefined) resource.fileSize = String(fileSize);
        if (cohortId !== undefined) {
            resource.cohortId = parseCohortId(cohortId);
        }

        await resource.save();
        await resource.populate('uploadedBy', 'fullName title email');
        await resource.populate('cohortId', 'name year');

        // Note: Edits MUST NOT trigger emails or broadcast notifications.
        res.json({ message: 'Resource updated successfully.', resource });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating resource.', error: e.message });
    }
};

// ─── DELETE /api/v1/resources/:id ─────────────────────────────────────────────
export const deleteResource = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await Resource.findByIdAndDelete(id);

        if (!result) {
            res.status(404).json({ message: 'Resource not found.' });
            return;
        }

        res.json({ message: 'Resource deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting resource.', error: e.message });
    }
};
