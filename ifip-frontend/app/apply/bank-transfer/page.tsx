"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getApplicantBankTransfer, submitApplicantBankTransferProof, type ApplicantBankTransfer } from "@/lib/api/services";

const action = "inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60";
const field = "mt-1 block w-full min-w-0 rounded-lg border border-outline bg-surface px-3 py-2";
const headings = {
  awaiting_proof: "Pay by bank transfer",
  under_review: "Payment proof under review",
  needs_information: "More information needed",
  approved: "Bank transfer approved",
  closed: "Bank transfer closed",
};

export default function BankTransferPage() {
  const [transfer, setTransfer] = useState<ApplicantBankTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getApplicantBankTransfer(controller.signal).then(result => {
      if (!controller.signal.aborted) setTransfer(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not check your transfer.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function refresh() {
    setBusy(true);
    setError("");
    try { setTransfer(await getApplicantBankTransfer()); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not check your transfer."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const proof = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try { setTransfer(await submitApplicantBankTransferProof(proof)); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not upload your receipt."); }
    finally { setBusy(false); }
  }

  const account = transfer?.account;
  const canSubmit = transfer?.review === "awaiting_proof" || transfer?.review === "needs_information";
  const email = transfer && `mailto:ifip.program@gmail.com?${new URLSearchParams({ subject: `IFIP payment proof ${transfer.reference}`,
    body: "Application email: \nBank transaction ID or UETR: \nTransfer date: \n\nPlease attach your receipt." }).toString().replaceAll("+", "%20")}`;

  return (
    <main className="min-h-dvh bg-surface-container-low px-4 py-8 sm:py-12">
      <section aria-labelledby="transfer-heading" className="mx-auto max-w-xl space-y-5 rounded-2xl border border-outline-variant bg-surface p-5 sm:p-8">
        <Link href={transfer && transfer.review !== "closed" ? "/" : "/apply"} className="text-sm font-semibold text-primary underline">
          {transfer && transfer.review !== "closed" ? "IFIP home" : "Back to application"}
        </Link>
        <h1 id="transfer-heading" className="text-2xl font-semibold text-primary" aria-live="polite">
          {loading ? "Checking your transfer" : transfer ? headings[transfer.review] : "Bank transfer"}
        </h1>
        {error && <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
        {!loading && !transfer && <p className="text-sm">Open your saved application to start a transfer or use your resume link to sign back in.</p>}
        {transfer && <>
          <p className="break-words text-sm">IFIP reference <strong className="text-primary">{transfer.reference}</strong></p>
          <p className="text-sm">Amount due <strong className="text-primary">{new Intl.NumberFormat("en", { style: "currency", currency: transfer.currency, currencyDisplay: "code" }).format(transfer.amount / 100)}</strong></p>
          {account && <>
            <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 rounded-lg bg-surface-container-low p-4 text-sm">
              {[["Beneficiary", account.name], ["Bank", account.bank], ["Account number", account.number], ["Routing number", account.routing], ["SWIFT/BIC", account.swift], ["Account type", account.type], ["Account address", account.address]].map(([label, value]) => (
                <div key={label} className="contents"><dt>{label}</dt><dd className="break-words font-semibold">{value}</dd></div>
              ))}
            </dl>
            <p className="text-sm">Include your IFIP reference in the transfer description. Your seat is held until {new Date(transfer.holdUntil).toLocaleString()}.</p>
          </>}
          {!account && transfer.review === "awaiting_proof" && <p className="text-sm">Your seat hold has expired. If you already sent the transfer, submit the receipt. Contact IFIP before sending a new transfer.</p>}
          {transfer.feedback && <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-3 text-sm">{transfer.feedback}</p>}
          {transfer.review === "under_review" && <p className="text-sm">IFIP will check the credit in its bank account. After approval and enrollment, you’ll get a password setup link by email.</p>}
          {canSubmit && <>
            <form onSubmit={submit} className="space-y-3 border-t border-outline-variant pt-4">
              <h2 className="font-semibold text-primary">Upload payment proof</h2>
              <label className="block text-sm">Bank transaction ID or UETR<input className={field} name="bankReference" minLength={3} maxLength={120} required /></label>
              <label className="block text-sm">Transfer date<input className={field} name="transferDate" type="date" required /></label>
              <label className="block text-sm">Receipt (PDF, PNG or JPEG, up to 5 MB)<input className={field} name="receipt" type="file" accept="application/pdf,image/png,image/jpeg" required /></label>
              <button type="submit" disabled={busy} className={action}>{busy ? "Uploading…" : "Submit proof"}</button>
            </form>
            <a href={email || "mailto:ifip.program@gmail.com"} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Email payment proof</a>
          </>}
          {transfer.review === "approved" && (transfer.setPasswordToken
            ? <Link href={`/set-password?${new URLSearchParams({ token: transfer.setPasswordToken })}`} className={action}>Set your password</Link>
            : <Link href="/login" className={action}>Sign in</Link>)}
        </>}
        {!loading && !canSubmit && (!transfer || transfer.review === "under_review") && <button type="button" className={action} disabled={busy} onClick={refresh}>{busy ? "Checking…" : "Check transfer status"}</button>}
      </section>
    </main>
  );
}
