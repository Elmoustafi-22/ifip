import type { Request, Response } from 'express';
import { Waitlist } from '../models/Waitlist.js';
import { z } from 'zod';

const waitlistSchema = z.object({
    email: z.string().email('Please enter a valid academic or professional email address.'),
});

export const joinWaitlist = async (req: Request, res: Response) => {
    const parsed = waitlistSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.issues[0].message });
        return;
    }

    const rawEmail = parsed.data.email || '';
    const email = rawEmail.trim().toLowerCase();

    try {
        const existing = await Waitlist.findOne({ email });
        if (existing) {
            res.status(409).json({ message: 'You have already joined the waitlist for this cycle.' });
            return;
        }

        await Waitlist.create({ email });
        res.status(201).json({ message: 'Successfully joined the waitlist!' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to join waitlist. Please try again later.' });
    }
};
