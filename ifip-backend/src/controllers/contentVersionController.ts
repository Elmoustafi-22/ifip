import { Request, Response } from 'express';
import { ContentVersion } from '../models/ContentVersion.js';

/**
 * GET /api/v1/content-versions
 * Returns a key-value mapping of content keys to their lastUpdated timestamps.
 */
export const getContentVersions = async (req: Request, res: Response): Promise<void> => {
    try {
        const versions = await ContentVersion.find({});
        const mapping: Record<string, Date> = {};
        for (const v of versions) {
            mapping[v.key] = v.lastUpdated;
        }
        res.json(mapping);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch content versions.' });
    }
};

/**
 * Helper to update lastUpdated timestamp for a content key.
 * Can be called by other controllers upon data modification.
 */
export const updateContentVersion = async (key: string): Promise<void> => {
    try {
        await ContentVersion.findOneAndUpdate(
            { key },
            { lastUpdated: new Date() },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error(`Failed to update content version for key "${key}":`, err);
    }
};
