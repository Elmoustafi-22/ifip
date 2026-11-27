import type { Request, Response } from 'express';
import { MarketingCampaign, campaignSummary } from '../models/MarketingCampaign.js';
import { MarketingSubscriber } from '../models/MarketingSubscriber.js';
import { logAction } from '../utils/auditLogger.js';

export async function listMarketingCampaigns(_req: Request, res: Response) {
    const campaigns = await MarketingCampaign.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ campaigns: campaigns.map(campaignSummary) });
}

export async function createMarketingCampaign(req: Request, res: Response) {
    const { name, subject, message, batchSize = 400 } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 160 ||
        typeof subject !== 'string' || !subject.trim() || subject.length > 250 ||
        typeof message !== 'string' || !message.trim() || message.length > 30000 ||
        !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
        res.status(400).json({ message: 'Enter a campaign name, subject, message and batch size from 1 to 1,000.' }); return;
    }
    const subscribers = await MarketingSubscriber.find({ status: 'subscribed' }).select('_id').lean();
    if (subscribers.length > 50000) { res.status(413).json({ message: 'The eligible audience exceeds the current campaign limit.' }); return; }
    const campaign = await MarketingCampaign.create({
        name: name.trim(), subject: subject.trim(), message: message.trim(), batchSize,
        recipients: subscribers.map((subscriber) => ({ subscriberId: subscriber._id, status: 'pending' })),
        createdBy: req.user!.id,
    });
    void logAction(req, 'MARKETING_CAMPAIGN_CREATED', `Created marketing campaign ${campaign._id}; audience ${subscribers.length}`, { targetType: 'MarketingCampaign', targetId: String(campaign._id) });
    res.status(201).json({ campaign: campaignSummary(campaign) });
}

export async function queueMarketingCampaignBatch(req: Request, res: Response) {
    const campaign = await MarketingCampaign.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['draft', 'ready'] } },
        { $set: { status: 'queued' } },
        { returnDocument: 'after' },
    );
    if (!campaign) {
        const exists = await MarketingCampaign.exists({ _id: req.params.id });
        res.status(exists ? 409 : 404).json({ message: exists ? 'This campaign cannot send a batch in its current state.' : 'Campaign not found.' }); return;
    }
    const pending = campaign.recipients.filter((recipient: any) => recipient.status === 'pending').length;
    if (!pending) {
        await MarketingCampaign.updateOne({ _id: campaign._id, status: 'queued' }, { $set: { status: 'completed' } });
        res.status(409).json({ message: 'No eligible recipients remain in this campaign.' }); return;
    }
    void logAction(req, 'MARKETING_CAMPAIGN_BATCH_QUEUED', `Queued up to ${Math.min(pending, campaign.batchSize)} recipients for campaign ${campaign._id}`, { targetType: 'MarketingCampaign', targetId: String(campaign._id) });
    res.status(202).json({ campaign: campaignSummary(campaign) });
}

export async function getMarketingCampaign(req: Request, res: Response) {
    const campaign = await MarketingCampaign.findById(req.params.id).lean();
    if (!campaign) { res.status(404).json({ message: 'Campaign not found.' }); return; }
    res.json({ campaign: campaignSummary(campaign) });
}

export async function resumeMarketingCampaign(req: Request, res: Response) {
    await MarketingCampaign.updateOne(
        { _id: req.params.id, status: 'interrupted', 'recipients.status': 'sending' },
        { $set: { 'recipients.$[recipient].status': 'unknown' } },
        { arrayFilters: [{ 'recipient.status': 'sending' }] },
    );
    const campaign = await MarketingCampaign.findOneAndUpdate(
        { _id: req.params.id, status: 'interrupted' },
        { $set: { status: 'ready' } },
        { returnDocument: 'after' },
    );
    if (!campaign) { res.status(409).json({ message: 'This campaign is not awaiting recovery.' }); return; }
    if (!campaign.recipients.some((recipient: any) => recipient.status === 'pending')) {
        campaign.status = 'completed';
        await campaign.save();
    }
    void logAction(req, 'MARKETING_CAMPAIGN_RESUMED', `Resumed unsent recipients for campaign ${campaign._id}; uncertain outcomes are not retried`, { targetType: 'MarketingCampaign', targetId: String(campaign._id) });
    res.json({ campaign: campaignSummary(campaign) });
}
