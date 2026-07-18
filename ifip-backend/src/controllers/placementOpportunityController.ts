import { Request, Response } from 'express';
import { PlacementOpportunity } from '../models/PlacementOpportunity.js';
import { updateContentVersion } from './contentVersionController.js';

// ─── Public Handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/placement-opportunities
 * Returns all active placement opportunity categories, sorted by order weight.
 */
export const getPublicOpportunities = async (req: Request, res: Response) => {
    try {
        const opportunities = await PlacementOpportunity.find({ isActive: true })
            .sort({ order: 1, createdAt: 1 });
        res.json({ opportunities });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch opportunities.' });
    }
};

// ─── Admin Handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/placement-opportunities
 * Returns all categories (including hidden ones) for administration.
 */
export const adminListOpportunities = async (req: Request, res: Response) => {
    try {
        const opportunities = await PlacementOpportunity.find()
            .sort({ order: 1, createdAt: 1 });
        res.json({ opportunities });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch admin opportunities.' });
    }
};

/**
 * POST /api/v1/admin/placement-opportunities
 * Creates a new opportunity category.
 */
export const adminCreateOpportunity = async (req: Request, res: Response) => {
    try {
        const { category, roles, icon, order } = req.body;

        if (!category || !roles || !Array.isArray(roles) || roles.length === 0) {
            res.status(400).json({ message: 'Fields category and roles (non-empty array) are required.' });
            return;
        }

        const opportunity = await PlacementOpportunity.create({
            category: category.trim(),
            roles: roles.map(r => r.trim()),
            icon: icon?.trim() || 'TbBriefcase',
            order: order ?? 0,
            isActive: true
        });

        await updateContentVersion('opportunities');
        res.status(201).json({ message: 'Category created successfully.', opportunity });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create category.' });
    }
};

/**
 * PATCH /api/v1/admin/placement-opportunities/:id
 * Updates details of a placement opportunity category.
 */
export const adminUpdateOpportunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { category, roles, icon, order, isActive } = req.body;

        const opportunity = await PlacementOpportunity.findById(id);
        if (!opportunity) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }

        if (category !== undefined) opportunity.category = category.trim();
        if (roles !== undefined && Array.isArray(roles)) {
            opportunity.roles = roles.map(r => r.trim());
        }
        if (icon !== undefined) opportunity.icon = icon.trim() || 'TbBriefcase';
        if (order !== undefined) opportunity.order = order;
        if (isActive !== undefined) opportunity.isActive = isActive;

        await opportunity.save();
        await updateContentVersion('opportunities');
        res.json({ message: 'Category updated successfully.', opportunity });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update category.' });
    }
};

/**
 * DELETE /api/v1/admin/placement-opportunities/:id
 * Hard deletes an opportunity category.
 */
export const adminDeleteOpportunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await PlacementOpportunity.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        await updateContentVersion('opportunities');
        res.json({ message: 'Category deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete category.' });
    }
};

/**
 * POST /api/v1/admin/placement-opportunities/reorder
 * Bulk updates display order values. Body: [{ id: string, order: number }]
 */
export const adminReorderOpportunities = async (req: Request, res: Response) => {
    try {
        const updates: { id: string; order: number }[] = req.body;

        if (!Array.isArray(updates)) {
            res.status(400).json({ message: 'Body must be an array of { id, order } objects.' });
            return;
        }

        await Promise.all(
            updates.map(({ id, order }) =>
                PlacementOpportunity.findByIdAndUpdate(id, { order })
            )
        );

        await updateContentVersion('opportunities');
        res.json({ message: 'Categories reordered successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to reorder categories.' });
    }
};
