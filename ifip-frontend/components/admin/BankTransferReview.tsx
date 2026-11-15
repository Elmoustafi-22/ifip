"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { getAdminBankTransferReceipt, submitAdminBankTransferAction, type AdminPayment } from "@/lib/api/services";

type Action = Parameters<typeof submitAdminBankTransferAction>[1];
const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2";
const button = "min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-[#000666] disabled:opacity-60";
const statusNames = { awaiting_proof: "Awaiting proof", under_review: "Under review", needs_information: "More information needed", approved: "Approved", closed: "Closed" };

export default function BankTransferReview({ payment, onUpdated }: { payment: AdminPayment; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const transfer = payment.bankTransfer;
  if (!transfer) return null;

  async function run(action: Action, payload?: FormData | Record<string, string>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const message = await submitAdminBankTransferAction(payment._id, action, payload);
      await onUpdated();
      setNotice(message || "Payment proof attached.");
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message || "The action could not be completed. Refresh the payment and try again." : "The action could not be completed. Refresh the payment and try again.");
    } finally { setBusy(false); }
  }

  function submit(action: Action, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void run(action, action === "proof" ? fields : Object.fromEntries([...fields].map(([key, value]) => [key, String(value)])));
  }

  async function download() {
    setBusy(true);
    setError("");
    try {
      const file = await getAdminBankTransferReceipt(payment._id);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt.${file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Could not download the receipt."); }
    finally { setBusy(false); }
  }

  const panel = (title: string, children: ReactNode) => <details className="rounded-lg border border-slate-200 bg-white p-3">
    <summary className="cursor-pointer font-semibold">{title}</summary>{children}
  </details>;

  return <section aria-label="Bank transfer review" className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
    <h2 className="font-bold">Bank transfer review</h2>
    <p>Status <strong>{statusNames[transfer.review]}</strong></p>
    {payment.transferApplicant && <p className="break-words">Applicant {payment.transferApplicant.fullName} · {payment.transferApplicant.email}</p>}
    {payment.transferCohort && <p className="break-words">Cohort {payment.transferCohort}</p>}
    {transfer.bankReference && <p className="break-words">Submitted transaction ID {transfer.bankReference} · {transfer.transferDate} · {transfer.source === "email" ? "Email" : "Applicant upload"}</p>}
    <p>Seat hold until {new Date(transfer.holdUntil).toLocaleString()}</p>
    {transfer.feedback && <p className="whitespace-pre-wrap break-words">{transfer.feedback}</p>}
    {transfer.creditKey && <p className="break-words">Matched bank credit {transfer.creditKey} · {transfer.settledDate}</p>}
    {transfer.receiptType && <button type="button" className={button} disabled={busy} onClick={download}>Download receipt</button>}
    {notice && <p role="status" className="font-semibold text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
    {transfer.review === "approved" && <button type="button" className={button} disabled={busy} onClick={() => run("resend-setup")}>Retry enrollment or resend setup email</button>}
    {payment.status === "pending" && <>
      {panel("Attach emailed proof", <form onSubmit={event => submit("proof", event)} className="mt-3 space-y-3">
        <label className="block">Bank transaction ID or UETR<input name="bankReference" className={field} minLength={3} maxLength={120} required /></label>
        <label className="block">Transfer date<input name="transferDate" type="date" className={field} required /></label>
        <label className="block">Receipt<input name="receipt" type="file" className={field} accept="application/pdf,image/png,image/jpeg" required /></label>
        <button className={button} disabled={busy}>Attach receipt</button>
      </form>)}
      {transfer.review === "under_review" && panel("Confirm settled bank credit", <form onSubmit={event => submit("approve", event)} className="mt-3 space-y-3">
        <p>Match the receipt to the credit in IFIP’s bank account before approving.</p>
        <label className="block">Bank-side credit reference<input name="bankCreditId" className={field} minLength={3} maxLength={120} required /></label>
        <label className="block">Settlement date<input name="settledDate" type="date" className={field} required /></label>
        <label className="block">Credited amount (USD)<input name="creditedAmount" inputMode="decimal" className={field} required /></label>
        <input type="hidden" name="currency" value="USD" />
        <input type="hidden" name="proofId" value={transfer.proofId ?? ""} />
        <button className={button} disabled={busy}>Approve and enroll</button>
      </form>)}
      {panel("Request information or close", <form onSubmit={event => submit("review", event)} className="mt-3 space-y-3">
        <label className="block">Decision<select name="decision" className={field}><option value="needs_information">Request more information</option><option value="closed">Close this request</option></select></label>
        <label className="block">Message to applicant<textarea name="feedback" className={field} maxLength={500} required /></label>
        <button className={button} disabled={busy}>Save decision</button>
      </form>)}
    </>}
  </section>;
}
