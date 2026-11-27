"use client";

import { useEffect, useState } from "react";
import { getMarketingPreference, setMarketingPreference, type MarketingConsentStatus } from "@/lib/api/services";

export default function MarketingPreferenceSettings() {
  const [status, setStatus] = useState<MarketingConsentStatus>("unknown");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void getMarketingPreference().then((value) => setStatus(value.status)).catch(() => setError("Unable to load marketing email preference.")).finally(() => setLoading(false)); }, []);
  const update = async (subscribed: boolean) => {
    setSaving(true); setError("");
    try { setStatus((await setMarketingPreference(subscribed)).status); }
    catch { setError("Unable to save your preference. Try again."); }
    finally { setSaving(false); }
  };
  return (
    <section aria-labelledby="marketing-preference-title" className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h4 id="marketing-preference-title" className="font-semibold text-slate-900">IFIP campaign emails</h4>
      <p className="mt-1 text-sm text-slate-600">Occasional future cohort, registration, and programme opportunity emails. Essential account and application messages are separate.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status" className="mt-2 text-sm text-slate-600">Loading preference…</p> : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-700">Status: <strong>{status === "subscribed" ? "Subscribed" : status === "unknown" ? "No choice recorded" : "Not subscribed"}</strong></p>
          {status !== "subscribed" ? <button type="button" disabled={saving} onClick={() => void update(true)} className="min-h-10 rounded-lg bg-[#000666] px-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2">{saving ? "Saving…" : "Subscribe"}</button> : <button type="button" disabled={saving} onClick={() => void update(false)} className="min-h-10 rounded-lg border border-slate-400 px-3 text-sm font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2">{saving ? "Saving…" : "Unsubscribe"}</button>}
        </div>
      )}
    </section>
  );
}
