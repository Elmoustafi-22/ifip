import { MarketingCampaign } from '../models/MarketingCampaign.js';
import { MarketingSubscriber } from '../models/MarketingSubscriber.js';
import { LOGO_HEADER_URL, sendMarketingEmail } from './emailService.js';
import { createMarketingUnsubscribeToken } from '../utils/marketingUnsubscribeToken.js';
import { env } from '../config/env.js';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

async function sendOne(campaign: any, recipient: any) {
    const subscriber = await MarketingSubscriber.findById(recipient.subscriberId);
    if (!subscriber || subscriber.status !== 'subscribed') {
        await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients.subscriberId': recipient.subscriberId },
            { $set: { 'recipients.$.status': 'skipped', 'recipients.$.updatedAt': new Date() } },
        );
        return;
    }
    const claimed = await MarketingCampaign.updateOne(
        { _id: campaign._id, recipients: { $elemMatch: { subscriberId: recipient.subscriberId, status: 'pending' } } },
        { $set: { 'recipients.$.status': 'sending', 'recipients.$.updatedAt': new Date() } },
    );
    if (!claimed.matchedCount) return;
    const currentPreference = await MarketingSubscriber.findById(recipient.subscriberId).select('status');
    if (!currentPreference || currentPreference.status !== 'subscribed') {
        await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients.subscriberId': recipient.subscriberId },
            { $set: { 'recipients.$.status': 'skipped', 'recipients.$.updatedAt': new Date() } },
        );
        return;
    }
    const token = createMarketingUnsubscribeToken(String(subscriber._id));
    const unsubscribeUrl = `${env.CLIENT_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    const oneClickUnsubscribeUrl = `${env.CLIENT_URL}/unsubscribe/one-click?token=${encodeURIComponent(token)}`;
    const firstName = subscriber.name?.trim().split(/\s+/)[0];
    const greeting = firstName ? `<p style="margin:0 0 18px;line-height:1.7;color:#34445d">Hello ${escapeHtml(firstName)},</p>` : '<p style="margin:0 0 18px;line-height:1.7;color:#34445d">Hello,</p>';
    const messageHtml = escapeHtml(campaign.message).split(/\r?\n\s*\r?\n/).map((paragraph: string) => `<p style="margin:0 0 18px;line-height:1.7;color:#34445d">${paragraph.replace(/\r?\n/g, '<br>')}</p>`).join('');
    const safeApplyUrl = escapeHtml(`${env.CLIENT_URL}/apply`);
    const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f7f5ef;font-family:Arial,Helvetica,sans-serif;color:#101f3f"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.subject)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5ef;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e3dfd5;border-radius:14px;overflow:hidden"><tr><td style="padding:22px 28px;border-bottom:1px solid #e8e5dc"><img src="${LOGO_HEADER_URL}" width="170" alt="IFIP — Islamic Finance Internship Program" style="display:block;width:170px;max-width:100%;height:auto;border:0"></td></tr><tr><td style="padding:30px 28px 26px"><p style="margin:0 0 10px;color:#687894;font-size:11px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase">IFIP programme update</p><h1 style="margin:0 0 22px;color:#101f3f;font-size:25px;line-height:1.25">${escapeHtml(campaign.subject)}</h1>${greeting}${messageHtml}<p style="margin:24px 0 0"><a href="${safeApplyUrl}" style="display:inline-block;padding:13px 20px;border-radius:7px;background:#101f3f;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">View registration details</a></p></td></tr><tr><td style="padding:18px 28px;background:#f8f7f2;border-top:1px solid #e8e5dc;color:#687894;font-size:12px;line-height:1.6">You received this email because you opted in to IFIP programme updates.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#34445d;text-decoration:underline">Unsubscribe from marketing emails</a></td></tr></table><p style="margin:14px 0 0;color:#8995a7;font-size:11px">Islamic Finance Internship Program</p></td></tr></table></body></html>`;
    try {
        const result = await sendMarketingEmail(subscriber.email, campaign.subject, html, oneClickUnsubscribeUrl, `marketing:${campaign._id}:${subscriber._id}`);
        const outcome = result.status === 'suppressed' ? 'skipped'
            : ['queued', 'sending', 'sent', 'delivered'].includes(result.status) ? 'accepted' : 'failed';
        await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients.subscriberId': recipient.subscriberId },
            { $set: { 'recipients.$.status': outcome, 'recipients.$.updatedAt': new Date() } },
        );
    } catch {
        await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients.subscriberId': recipient.subscriberId },
            { $set: { 'recipients.$.status': 'failed', 'recipients.$.updatedAt': new Date() } },
        );
    }
}

export async function processNextMarketingCampaignBatch() {
    const stale = new Date(Date.now() - 10 * 60_000);
    const interrupted = await MarketingCampaign.updateMany(
        { status: 'processing', processingAt: { $lt: stale } },
        { $set: { status: 'interrupted' }, $unset: { processingAt: 1 } },
    );
    if (interrupted.modifiedCount) {
        await MarketingCampaign.updateMany(
            { status: 'interrupted', 'recipients.status': 'sending' },
            { $set: { 'recipients.$[recipient].status': 'unknown' } },
            { arrayFilters: [{ 'recipient.status': 'sending' }] },
        );
    }
    const campaign = await MarketingCampaign.findOneAndUpdate(
        { status: 'queued' }, { $set: { status: 'processing', processingAt: new Date() } },
        { returnDocument: 'after', sort: { createdAt: 1 } },
    );
    if (!campaign) return false;
    try {
        const recipients = campaign.recipients.filter((item: any) => item.status === 'pending').slice(0, campaign.batchSize);
        for (let offset = 0; offset < recipients.length; offset += 5) {
            await Promise.all(recipients.slice(offset, offset + 5).map((recipient: any) => sendOne(campaign, recipient)));
            await MarketingCampaign.updateOne({ _id: campaign._id, status: 'processing' }, { $set: { processingAt: new Date() } });
        }
        const refreshed = await MarketingCampaign.findById(campaign._id).select('recipients').lean();
        const hasPending = refreshed?.recipients.some((item: any) => item.status === 'pending');
        await MarketingCampaign.updateOne(
            { _id: campaign._id, status: 'processing' },
            { $set: { status: hasPending ? 'ready' : 'completed' }, $unset: { processingAt: 1 } },
        );
    } catch {
        await MarketingCampaign.updateOne(
            { _id: campaign._id, status: 'processing' },
            { $set: { status: 'interrupted', 'recipients.$[recipient].status': 'unknown' }, $unset: { processingAt: 1 } },
            { arrayFilters: [{ 'recipient.status': 'sending' }] },
        );
    }
    return true;
}

export function startMarketingCampaignWorker() {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await processNextMarketingCampaignBatch(); }
        catch { console.error('[MarketingCampaign] queue unavailable'); }
        finally { running = false; }
    };
    const timer = setInterval(() => void tick(), 2000);
    timer.unref();
    void tick();
    return () => clearInterval(timer);
}
