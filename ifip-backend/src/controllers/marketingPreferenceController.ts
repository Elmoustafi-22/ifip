import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MarketingSubscriber } from '../models/MarketingSubscriber.js';
import { verifyMarketingUnsubscribeToken } from '../utils/marketingUnsubscribeToken.js';
import { User } from '../models/User.js';

const normalize = (email: string) => email.trim().toLowerCase();

export async function getMarketingPreference(req: Request, res: Response) {
    const user = await User.findById(req.user!.id).select('email fullName');
    if (!user) { res.sendStatus(404); return; }
    const email = normalize(user.email);
    const record = await MarketingSubscriber.findOne({ email }).lean();
    res.json({ status: record?.status ?? 'unknown' });
}

export async function setMarketingPreference(req: Request, res: Response) {
    const user = await User.findById(req.user!.id).select('email fullName');
    if (!user) { res.sendStatus(404); return; }
    const email = normalize(user.email);
    const subscribed = req.body?.subscribed;
    if (typeof subscribed !== 'boolean') { res.status(400).json({ message: 'Choose whether to receive marketing emails.' }); return; }
    const record = await MarketingSubscriber.findOneAndUpdate({ email }, {
        $set: { status: subscribed ? 'subscribed' : 'declined', source: 'account_prompt', changedAt: new Date(), ...(subscribed ? { consentSource: 'account_prompt', consentDate: new Date() } : {}) },
        ...(subscribed && user.fullName ? { $setOnInsert: { name: user.fullName } } : {}),
    }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
    res.json({ status: record?.status ?? (subscribed ? 'subscribed' : 'declined') });
}

export async function unsubscribeMarketingEmail(req: Request, res: Response) {
    const subscriberId = verifyMarketingUnsubscribeToken(String(req.body?.token ?? req.query?.token ?? ''));
    if (!subscriberId || !Types.ObjectId.isValid(subscriberId)) { res.status(400).json({ message: 'This unsubscribe link is invalid.' }); return; }
    const record = await MarketingSubscriber.findByIdAndUpdate(subscriberId, {
        $set: { status: 'unsubscribed', source: 'unsubscribe', changedAt: new Date() },
    }, { returnDocument: 'after' });
    if (!record) { res.status(404).json({ message: 'This unsubscribe link is no longer available.' }); return; }
    res.json({ status: 'unsubscribed' });
}
