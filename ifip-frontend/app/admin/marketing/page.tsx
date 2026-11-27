"use client";

import { useCallback, useEffect, useState } from "react";
import { createMarketingCampaign, importMarketingContacts, listMarketingCampaigns, previewMarketingContacts, resumeMarketingCampaign, sendMarketingCampaignBatch, type MarketingCampaign, type MarketingImportPreview, type MarketingImportResult } from "@/lib/api/services";
import { parseMarketingContactsCsv, type MarketingCsvContact } from "@/lib/marketing-contacts-csv";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";
const statusLabel: Record<MarketingCampaign["status"], string> = {
  draft: "Draft", queued: "Queued", processing: "Sending batch", ready: "Ready for next batch", interrupted: "Interrupted; review before continuing", completed: "Complete",
};

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [batchSize, setBatchSize] = useState(400);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ contacts: MarketingCsvContact[]; invalidRows: number[]; duplicates: number } | null>(null);
  const [databasePreview, setDatabasePreview] = useState<MarketingImportPreview | null>(null);
  const [previewingCsv, setPreviewingCsv] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvEvidence, setCsvEvidence] = useState("Legacy NextIF/IFIP consent records for related programme email updates");
  const [csvAttested, setCsvAttested] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<MarketingImportResult | null>(null);

  const refresh = useCallback(async () => {
    try { setCampaigns(await listMarketingCampaigns()); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load email campaigns."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [refresh]);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const campaign = await createMarketingCampaign({ name, subject, message, batchSize });
      setCampaigns((items) => [campaign, ...items]); setName(""); setSubject(""); setMessage("");
      setNotice(`Campaign saved with ${campaign.total} opted-in recipients in its audience snapshot.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the campaign."); }
    finally { setSaving(false); }
  };
  const sendNextBatch = async (campaign: MarketingCampaign) => {
    const count = Math.min(campaign.batchSize, campaign.remaining);
    if (!window.confirm(`Queue up to ${count} marketing emails for “${campaign.name}”? Only recipients who remain opted in will receive them.`)) return;
    setBusyId(campaign.id); setError(""); setNotice("");
    try {
      const updated = await sendMarketingCampaignBatch(campaign.id);
      setCampaigns((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice(`The next batch of up to ${Math.min(updated.batchSize, updated.remaining)} recipients is queued.`);
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to queue the next batch."); }
    finally { setBusyId(""); }
  };
  const continueCampaign = async (campaign: MarketingCampaign) => {
    setBusyId(campaign.id); setError(""); setNotice("");
    try {
      const updated = await resumeMarketingCampaign(campaign.id);
      setCampaigns((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice("The campaign is ready to continue. Recipients with uncertain outcomes will not be sent again.");
      void refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue this campaign."); }
    finally { setBusyId(""); }
  };
  const selectCsv = async (file?: File) => {
    setCsvFile(null); setCsvPreview(null); setDatabasePreview(null); setCsvError(""); setImportResult(null); setCsvAttested(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setCsvError("Choose a .csv file."); return; }
    if (file.size > 5 * 1024 * 1024) { setCsvError("CSV files must be 5 MB or smaller."); return; }
    try {
      const parsed = parseMarketingContactsCsv(await file.text());
      setCsvFile(file);
      setCsvPreview(parsed);
      setPreviewingCsv(true);
      setDatabasePreview(await previewMarketingContacts(file));
    } catch (reason) { setCsvError(reason instanceof Error ? reason.message : "Unable to read this CSV."); }
    finally { setPreviewingCsv(false); }
  };
  const importCsv = async () => {
    if (!csvFile || !csvPreview?.contacts.length || !databasePreview?.importable || !csvAttested || !csvEvidence.trim()) return;
    setImporting(true); setCsvError(""); setImportResult(null);
    try {
      const result = await importMarketingContacts(csvFile, csvEvidence.trim());
      setImportResult(result);
      setNotice(result.message);
      void refresh();
    } catch (reason) { setCsvError(reason instanceof Error ? reason.message : "Unable to import these contacts."); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#536a85]">Communications</p>
        <h1 className="mt-1 text-2xl font-bold text-[#101f3f]">Email campaigns</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#465a74]">Create a campaign for people who opted in to IFIP programme emails. Each campaign keeps a fixed audience snapshot; suppressed recipients are skipped when each batch sends.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}

      <section aria-labelledby="contact-import-heading" className="space-y-4 rounded-xl border border-[#cbd8e8] bg-white p-4 sm:p-6">
        <div>
          <h2 id="contact-import-heading" className="text-lg font-semibold text-[#101f3f]">Import consented contacts</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#465a74]">Upload the legacy NextIF/IFIP contacts who have already agreed to receive related programme emails. Original consent dates are left unrecorded in this import; import time, source, and your confirmation are recorded separately. Imported contacts join new campaign audience snapshots; saved campaigns keep their existing audience.</p>
          <a href="/marketing-contacts-sample.csv" download className={`mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#101f3f] underline underline-offset-2 ${focus}`}>Download sample CSV</a>
        </div>
        <label className="block space-y-1 text-sm font-medium">CSV file
          <input type="file" accept=".csv,text/csv" disabled={importing || previewingCsv} onChange={(event) => void selectCsv(event.target.files?.[0])} className={`block min-h-11 w-full rounded-lg border border-[#aebdd0] px-3 py-2 text-sm font-normal file:me-3 file:rounded-md file:border-0 file:bg-[#eef4fa] file:px-3 file:py-1 ${focus}`} />
          <span className="block text-xs font-normal text-[#536a85]">Required column: email. Optional column: name. Duplicate emails are deduplicated; extra columns are ignored. Up to 10,000 contacts and 5 MB.</span>
        </label>
        {csvError && <p role="alert" className="text-sm text-red-700">{csvError}</p>}
        {previewingCsv && <p role="status" className="text-sm text-[#536a85]">Checking contacts against current preferences…</p>}
        {csvPreview && <div className="space-y-2 rounded-lg border border-[#d8e0e8] bg-[#f8fafc] p-3 text-sm">
          <p><strong>{csvFile?.name}</strong>: {csvPreview.contacts.length} valid unique contacts · {csvPreview.invalidRows.length} invalid rows · {csvPreview.duplicates} duplicate rows.</p>
          {databasePreview && <p className="font-medium text-[#34445d]">Will add as legacy-consented: {databasePreview.importable} · Already subscribed: {databasePreview.alreadySubscribed} · Existing declines/unsubscribes to preserve: {databasePreview.suppressed}.</p>}
          {csvPreview.invalidRows.length > 0 && <p className="text-xs text-amber-800">Invalid CSV row numbers: {csvPreview.invalidRows.slice(0, 12).join(", ")}{csvPreview.invalidRows.length > 12 ? "…" : ""}</p>}
          {databasePreview?.invalidRows.length ? <p className="text-xs text-amber-800">Invalid rows: {databasePreview.invalidRows.map((issue) => `${issue.row} (${issue.reason})`).join("; ")}</p> : null}
          {csvPreview.contacts.length > 0 && <ul aria-label="Contact preview" className="space-y-1 text-xs text-[#465a74]">{csvPreview.contacts.slice(0, 4).map((contact) => <li key={`${contact.row}-${contact.email}`}>{contact.name ? `${contact.name} · ` : ""}{contact.email}</li>)}</ul>}
        </div>}
        <label className="block space-y-1 text-sm font-medium">Consent source or evidence
          <input required maxLength={500} value={csvEvidence} onChange={(event) => setCsvEvidence(event.target.value)} className={`min-h-11 w-full rounded-lg border border-[#aebdd0] px-3 font-normal ${focus}`} />
          <span className="block text-xs font-normal text-[#536a85]">Describe the legacy record or signup source. The upload does not invent or import a consent date.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#d8e0e8] p-3 text-sm leading-relaxed text-[#34445d]">
          <input type="checkbox" checked={csvAttested} onChange={(event) => setCsvAttested(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#101f3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]" />
          <span>I confirm every valid contact in this file agreed to receive email marketing from NextIF and related programmes, including IFIP. I understand this import records my confirmation and its source; it does not create an original consent date.</span>
        </label>
        <button type="button" disabled={importing || previewingCsv || !csvFile || !databasePreview?.importable || !csvAttested || !csvEvidence.trim()} onClick={() => void importCsv()} className={`min-h-11 rounded-lg bg-[#101f3f] px-5 text-sm font-semibold text-white disabled:opacity-60 ${focus}`}>{importing ? "Importing…" : `Import ${databasePreview?.importable ?? 0} contacts as consented`}</button>
        {importResult && <p role="status" className="text-sm text-[#34445d]">Added {importResult.imported} · Already subscribed {importResult.alreadySubscribed} · Preserved declines/unsubscribes {importResult.suppressed} · Invalid {importResult.invalid} · Duplicates {importResult.duplicates}. Eligible for campaigns: {importResult.eligible}.</p>}
      </section>

      <form onSubmit={create} className="space-y-4 rounded-xl border border-[#cbd8e8] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#101f3f]">Create campaign</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Campaign name
            <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className={`min-h-11 w-full rounded-lg border border-[#aebdd0] px-3 font-normal ${focus}`} />
          </label>
          <label className="space-y-1 text-sm font-medium">Email subject
            <input required maxLength={250} value={subject} onChange={(event) => setSubject(event.target.value)} className={`min-h-11 w-full rounded-lg border border-[#aebdd0] px-3 font-normal ${focus}`} />
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium">Message
          <textarea required rows={7} maxLength={30000} value={message} onChange={(event) => setMessage(event.target.value)} className={`w-full rounded-lg border border-[#aebdd0] px-3 py-2 font-normal ${focus}`} />
        </label>
        <label className="block max-w-xs space-y-1 text-sm font-medium">Recipients per batch
          <input required type="number" min={1} max={1000} value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))} className={`min-h-11 w-full rounded-lg border border-[#aebdd0] px-3 font-normal ${focus}`} />
          <span className="block text-xs font-normal text-[#536a85]">Default is 400. Create the campaign first, review its audience count, then queue each batch when ready.</span>
        </label>
        <button type="submit" disabled={saving} className={`min-h-11 rounded-lg bg-[#101f3f] px-5 text-sm font-semibold text-white disabled:opacity-60 ${focus}`}>{saving ? "Saving…" : "Save campaign"}</button>
      </form>

      <section aria-labelledby="campaign-list-heading" className="space-y-3">
        <h2 id="campaign-list-heading" className="text-lg font-semibold text-[#101f3f]">Campaign history</h2>
        {loading ? <p role="status" className="text-sm text-[#536a85]">Loading campaigns…</p> : campaigns.length === 0 ? <p className="rounded-xl border border-dashed border-[#aebdd0] bg-white p-5 text-sm text-[#536a85]">No campaigns yet. Create one to snapshot the opted-in audience.</p> : campaigns.map((campaign) => (
          <article key={campaign.id} className="space-y-3 rounded-xl border border-[#cbd8e8] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-[#101f3f]">{campaign.name}</h3><p className="mt-1 text-sm text-[#465a74]">{campaign.subject}</p></div>
              <span className="rounded-full bg-[#eef4fa] px-3 py-1 text-xs font-semibold text-[#344b68]">{statusLabel[campaign.status]}</span>
            </div>
            <p className="text-sm text-[#465a74]">Accepted by provider: <strong>{campaign.accepted}/{campaign.total}</strong> · Sending: {campaign.sending} · Failed: {campaign.failed} · Skipped after opt-out: {campaign.skipped} · Remaining: {campaign.remaining}{campaign.unknown ? ` · Outcome unknown: ${campaign.unknown}` : ""}</p>
            <details className="rounded-lg border border-[#d8e0e8] px-3 py-2"><summary className="cursor-pointer text-sm font-semibold">Review email content</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#465a74]">{campaign.message}</p></details>
            <p className="text-xs text-[#536a85]">Provider acceptance means the email request was accepted for processing; inbox delivery is not confirmed. Batch size: {campaign.batchSize}.</p>
            {(campaign.status === "draft" || campaign.status === "ready") && campaign.remaining > 0 && (
              <button type="button" disabled={busyId === campaign.id} onClick={() => void sendNextBatch(campaign)} className={`min-h-11 rounded-lg border border-[#879bb3] px-4 text-sm font-semibold text-[#101f3f] hover:bg-[#eef4fa] disabled:opacity-60 ${focus}`}>
                {busyId === campaign.id ? "Queueing…" : `Send next batch (up to ${Math.min(campaign.batchSize, campaign.remaining)})`}
              </button>
            )}
            {campaign.status === "interrupted" && <div className="space-y-2"><p className="text-sm font-medium text-amber-800">Sending stopped after an uncertain provider outcome. Those recipients are marked unknown and will not be sent again.</p>{campaign.remaining > 0 && <button type="button" disabled={busyId === campaign.id} onClick={() => void continueCampaign(campaign)} className={`min-h-11 rounded-lg border border-amber-700 px-4 text-sm font-semibold text-amber-900 disabled:opacity-60 ${focus}`}>Continue remaining recipients</button>}</div>}
          </article>
        ))}
      </section>
    </div>
  );
}
