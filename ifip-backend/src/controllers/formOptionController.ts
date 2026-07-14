import { Request, Response } from 'express';
import { FormOption, FormOptionGroup } from '../models/FormOption.js';

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/form-options?group=<key>
 * Returns all active options for a group, sorted by order.
 * No authentication required.
 */
export const getPublicOptions = async (req: Request, res: Response) => {
    try {
        const { group } = req.query;

        if (!group || typeof group !== 'string') {
            res.status(400).json({ message: 'Query param "group" is required.' });
            return;
        }

        const options = await FormOption.find({ group: group as FormOptionGroup, isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .select('label value -_id');

        res.json({ group, options });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch form options.' });
    }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/form-options?group=<key>
 * Returns ALL options (including inactive) for admin management.
 */
export const adminListOptions = async (req: Request, res: Response) => {
    try {
        const { group } = req.query;

        if (!group || typeof group !== 'string') {
            res.status(400).json({ message: 'Query param "group" is required.' });
            return;
        }

        const options = await FormOption.find({ group: group as FormOptionGroup })
            .sort({ order: 1, createdAt: 1 });

        res.json({ group, options });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch form options.' });
    }
};

/**
 * POST /api/v1/admin/form-options
 * Create a new option. Value defaults to label if not provided.
 */
export const adminCreateOption = async (req: Request, res: Response) => {
    try {
        const { group, label, value, order } = req.body;

        if (!group || !label) {
            res.status(400).json({ message: 'Fields "group" and "label" are required.' });
            return;
        }

        const derivedValue = value?.trim() || label.trim().toLowerCase().replace(/\s+/g, '_');

        const existing = await FormOption.findOne({ group: group as FormOptionGroup, value: derivedValue });
        if (existing) {
            res.status(409).json({ message: 'An option with this value already exists in the group.' });
            return;
        }

        const option = await FormOption.create({
            group: group as FormOptionGroup,
            label: label.trim(),
            value: derivedValue,
            order: order ?? 0,
            isActive: true,
        });

        res.status(201).json({ message: 'Option created.', option });
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(409).json({ message: 'Duplicate option value in this group.' });
            return;
        }
        res.status(500).json({ message: 'Failed to create option.' });
    }
};

/**
 * PATCH /api/v1/admin/form-options/:id
 * Update label, value, order, or isActive of an option.
 */
export const adminUpdateOption = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, value, order, isActive } = req.body;

        const option = await FormOption.findById(id);
        if (!option) {
            res.status(404).json({ message: 'Option not found.' });
            return;
        }

        if (label !== undefined) option.label = label.trim();
        if (value !== undefined) option.value = value.trim();
        if (order !== undefined) option.order = order;
        if (isActive !== undefined) option.isActive = isActive;

        await option.save();
        res.json({ message: 'Option updated.', option });
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(409).json({ message: 'Duplicate option value in this group.' });
            return;
        }
        res.status(500).json({ message: 'Failed to update option.' });
    }
};

/**
 * DELETE /api/v1/admin/form-options/:id
 * Hard-deletes an option.
 */
export const adminDeleteOption = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await FormOption.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ message: 'Option not found.' });
            return;
        }
        res.json({ message: 'Option deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete option.' });
    }
};

/**
 * POST /api/v1/admin/form-options/reorder
 * Bulk-update the `order` field. Body: [{ id: string, order: number }]
 */
export const adminReorderOptions = async (req: Request, res: Response) => {
    try {
        const updates: { id: string; order: number }[] = req.body;

        if (!Array.isArray(updates)) {
            res.status(400).json({ message: 'Body must be an array of { id, order } objects.' });
            return;
        }

        await Promise.all(
            updates.map(({ id, order }) =>
                FormOption.findByIdAndUpdate(id, { order })
            )
        );

        res.json({ message: 'Options reordered.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reorder options.' });
    }
};
