import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MarketingSubscriber } from '../models/MarketingSubscriber.js';
import { parseMarketingContactsCsv } from '../utils/marketingContactsCsv.js';
import { logAction } from '../utils/auditLogger.js';

export async function previewMarketingContacts(req: Request, res: Response) {
    if (!req.file?.buffer?.length) { res.status(400).json({ message: 'Choose a CSV file to preview.' }); return; }
    let parsed: ReturnType<typeof parseMarketingContactsCsv>;
    try { parsed = parseMarketingContactsCsv(req.file.buffer.toString('utf8').replace(/^\uFEFF/, '')); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to read this CSV.' }); return; }
    const existing = await MarketingSubscriber.find({ email: { $in: parsed.contacts.map((contact) => contact.email) } }).select('email status').lean();
    const existingByEmail = new Map(existing.map((contact) => [contact.email, contact.status]));
    let alreadySubscribed = 0;
    let suppressed = 0;
    for (const contact of parsed.contacts) {
        const status = existingByEmail.get(contact.email);
        if (status === 'subscribed') alreadySubscribed += 1;
        else if (status === 'declined' || status === 'unsubscribed') suppressed += 1;
    }
    const importable = parsed.contacts.length - alreadySubscribed - suppressed;
    res.json({
        valid: parsed.contacts.length, importable, alreadySubscribed, suppressed,
        invalid: parsed.issues.length, duplicates: parsed.duplicates, invalidRows: parsed.issues.slice(0, 20),
    });
}

export async function importMarketingContacts(req: Request, res: Response) {
    if (req.body?.attested !== 'true') { res.status(400).json({ message: 'Confirm that these contacts agreed to receive marketing emails about NextIF and IFIP.' }); return; }
    const evidence = typeof req.body?.evidence === 'string' ? req.body.evidence.trim() : '';
    if (!evidence || evidence.length > 500) { res.status(400).json({ message: 'Describe where this legacy consent record came from (500 characters or fewer).' }); return; }
    if (!req.file?.buffer?.length) { res.status(400).json({ message: 'Choose a CSV file to import.' }); return; }

    let parsed: ReturnType<typeof parseMarketingContactsCsv>;
    try { parsed = parseMarketingContactsCsv(req.file.buffer.toString('utf8').replace(/^\uFEFF/, '')); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to read this CSV.' }); return; }
    if (!parsed.contacts.length) { res.status(400).json({ message: 'The CSV has no valid email addresses to import.' }); return; }

    const importedAt = new Date();
    const emails = parsed.contacts.map((contact) => contact.email);
    const existing = await MarketingSubscriber.find({ email: { $in: emails } }).select('email name status').lean();
    const existingByEmail = new Map(existing.map((contact) => [contact.email, contact]));
    const newContacts = parsed.contacts.filter((contact) => !existingByEmail.has(contact.email));
    const unknownContacts = parsed.contacts.filter((contact) => existingByEmail.get(contact.email)?.status === 'unknown');
    const nameOps = parsed.contacts.filter((contact) => contact.name && existingByEmail.get(contact.email)?.status === 'subscribed' && !existingByEmail.get(contact.email)?.name);

    if (newContacts.length) {
        try {
            await MarketingSubscriber.insertMany(newContacts.map((contact) => ({
                email: contact.email,
                ...(contact.name ? { name: contact.name } : {}),
                status: 'subscribed', source: 'legacy_import', consentSource: 'legacy_import',
                consentDate: undefined, consentEvidence: evidence, consentImportedAt: importedAt,
                consentImportedBy: new Types.ObjectId(req.user!.id), changedAt: importedAt,
            })), { ordered: false });
        } catch (error) {
            if ((error as { code?: number }).code !== 11000 && !(error as { writeErrors?: unknown[] }).writeErrors) throw error;
        }
    }

    if (unknownContacts.length) {
        await MarketingSubscriber.bulkWrite(unknownContacts.map((contact) => ({
            updateOne: {
                filter: { email: contact.email, status: 'unknown' },
                update: { $set: {
                    ...(contact.name ? { name: contact.name } : {}), status: 'subscribed', source: 'legacy_import', consentSource: 'legacy_import',
                    consentEvidence: evidence, consentImportedAt: importedAt, consentImportedBy: new Types.ObjectId(req.user!.id), changedAt: importedAt,
                } },
            },
        })), { ordered: false });
    }
    if (nameOps.length) {
        await MarketingSubscriber.bulkWrite(nameOps.map((contact) => ({
            updateOne: {
                filter: { email: contact.email, status: 'subscribed', name: { $in: ['', null] } },
                update: { $set: { name: contact.name } },
            },
        })), { ordered: false });
    }

    const results = await MarketingSubscriber.find({ email: { $in: emails } }).select('email status').lean();
    const finalByEmail = new Map(results.map((contact) => [contact.email, contact.status]));
    const initialStatus = new Map(existing.map((contact) => [contact.email, contact.status]));
    let imported = 0;
    let alreadySubscribed = 0;
    let suppressed = 0;
    for (const contact of parsed.contacts) {
        const before = initialStatus.get(contact.email);
        const after = finalByEmail.get(contact.email);
        if (after === 'subscribed' && before === 'subscribed') alreadySubscribed += 1;
        else if (after === 'subscribed') imported += 1;
        else suppressed += 1;
    }
    void logAction(req, 'MARKETING_CONTACTS_IMPORTED', `Imported legacy marketing contacts: ${imported} added, ${alreadySubscribed} already subscribed, ${suppressed} suppressed, ${parsed.issues.length} invalid, ${parsed.duplicates} duplicates`, { targetType: 'MarketingSubscriber' });
    res.status(200).json({
        imported, alreadySubscribed, suppressed,
        invalid: parsed.issues.length, duplicates: parsed.duplicates,
        eligible: imported + alreadySubscribed,
        invalidRows: parsed.issues.slice(0, 20),
        consentDate: null,
        message: `${imported} added as legacy-consented; ${alreadySubscribed} already subscribed; ${suppressed} existing declines/unsubscribes preserved. No original consent date was recorded.`,
    });
}
