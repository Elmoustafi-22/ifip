import { Request, Response } from 'express';
import { ActiveOpening } from '../models/ActiveOpening.js';
import { updateContentVersion } from './contentVersionController.js';

// ─── Public Handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/active-openings
 * Returns all active vacancies, sorted by order weight, then creation date.
 */
export const getPublicOpenings = async (req: Request, res: Response) => {
    try {
        const openings = await ActiveOpening.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 });
        res.json({ openings });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch active openings.' });
    }
};

// ─── Admin Handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/active-openings
 * Returns all vacancies (including hidden ones) for management.
 */
export const adminListOpenings = async (req: Request, res: Response) => {
    try {
        const openings = await ActiveOpening.find()
            .sort({ order: 1, createdAt: -1 });
        res.json({ openings });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch admin openings.' });
    }
};

/**
 * POST /api/v1/admin/active-openings
 * Creates a new vacancy.
 */
export const adminCreateOpening = async (req: Request, res: Response) => {
    try {
        const { title, department, workMode, location, order } = req.body;

        if (!title || !department || !workMode || !location) {
            res.status(400).json({ message: 'Fields title, department, workMode, and location are required.' });
            return;
        }

        const opening = await ActiveOpening.create({
            title: title.trim(),
            department: department.trim(),
            workMode,
            location: location.trim(),
            order: order ?? 0,
            isActive: true
        });

        await updateContentVersion('openings');
        res.status(201).json({ message: 'Vacancy created successfully.', opening });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create vacancy.' });
    }
};

/**
 * PATCH /api/v1/admin/active-openings/:id
 * Updates details of a vacancy.
 */
export const adminUpdateOpening = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, department, workMode, location, order, isActive } = req.body;

        const opening = await ActiveOpening.findById(id);
        if (!opening) {
            res.status(404).json({ message: 'Vacancy not found.' });
            return;
        }

        if (title !== undefined) opening.title = title.trim();
        if (department !== undefined) opening.department = department.trim();
        if (workMode !== undefined) opening.workMode = workMode;
        if (location !== undefined) opening.location = location.trim();
        if (order !== undefined) opening.order = order;
        if (isActive !== undefined) opening.isActive = isActive;

        await opening.save();
        await updateContentVersion('openings');
        res.json({ message: 'Vacancy updated successfully.', opening });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update vacancy.' });
    }
};

/**
 * DELETE /api/v1/admin/active-openings/:id
 * Hard deletes a vacancy record.
 */
export const adminDeleteOpening = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await ActiveOpening.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ message: 'Vacancy not found.' });
            return;
        }
        await updateContentVersion('openings');
        res.json({ message: 'Vacancy deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete vacancy.' });
    }
};

/**
 * POST /api/v1/admin/active-openings/reorder
 * Bulk updates vacancy sorting weights. Body: [{ id: string, order: number }]
 */
export const adminReorderOpenings = async (req: Request, res: Response) => {
    try {
        const updates: { id: string; order: number }[] = req.body;

        if (!Array.isArray(updates)) {
            res.status(400).json({ message: 'Body must be an array of { id, order } objects.' });
            return;
        }

        await Promise.all(
            updates.map(({ id, order }) =>
                ActiveOpening.findByIdAndUpdate(id, { order })
            )
        );

        await updateContentVersion('openings');
        res.json({ message: 'Vacancies reordered successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reorder vacancies.' });
    }
};
