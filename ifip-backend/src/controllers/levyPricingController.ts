import type { Request, Response } from 'express';
import { z } from 'zod';
import { getLevyAmounts, setLevyAmounts } from '../models/LevyPricing.js';
import { logAction } from '../utils/auditLogger.js';

const minorAmount = z.number().int().positive();
const levyAmountsSchema = z.strictObject({ NGN: minorAmount, USD: minorAmount });

export async function getLevyPricing(_req: Request, res: Response) {
    res.set('Cache-Control', 'no-store').json(await getLevyAmounts());
}

export async function updateLevyPricing(req: Request, res: Response) {
    const result = levyAmountsSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ message: 'Enter a positive levy amount for both NGN and USD.' });
        return;
    }
    const amounts = await setLevyAmounts(result.data);
    await logAction(req, 'LEVY_PRICE_UPDATED', `Set commitment levy to NGN ${(amounts.NGN / 100).toFixed(2)} and USD ${(amounts.USD / 100).toFixed(2)}`);
    res.set('Cache-Control', 'no-store').json(amounts);
}
