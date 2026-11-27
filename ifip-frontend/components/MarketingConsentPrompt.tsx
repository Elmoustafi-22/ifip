"use client";

import { useEffect, useState } from "react";
import { getMarketingPreference, setMarketingPreference, type MarketingConsentStatus } from "@/lib/api/services";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";

export default function MarketingConsentPrompt() {
  const [status, setStatus] = useState<MarketingConsentStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void getMarketingPreference().then(({ status: value }) => setStatus(value)).catch(() => setLoadFailed(true)); }, []);
  if (status !== "unknown" || loadFailed) return null;
  const choose = async (subscribed: boolean) => {
    setBusy(true); setError("");
    try { const result = await setMarketingPreference(subscribed); setStatus(result.status); }
    catch { setError("Unable to save your choice. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="marketing-consent-title" className="rounded-xl border border-[#cbd8e8] bg-white p-4 sm:p-5">
      <h2 id="marketing-consent-title" className="font-semibold">Choose your email preferences</h2>
      <p className="mt-1 text-sm leading-relaxed text-[#465a74]">Would you like occasional IFIP emails about future cohorts, registration reminders, and related programme opportunities? This is optional. You can unsubscribe at any time.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void choose(true)} className={`min-h-11 rounded-lg bg-[#101f3f] px-4 text-sm font-semibold text-white disabled:opacity-60 ${focus}`}>Accept marketing emails</button>
        <button type="button" disabled={busy} onClick={() => void choose(false)} className={`min-h-11 rounded-lg border border-[#aebdd0] px-4 text-sm font-semibold disabled:opacity-60 ${focus}`}>Decline</button>
      </div>
      <p role="status" className="sr-only">{busy ? "Saving email preference" : ""}</p>
    </section>
  );
}
