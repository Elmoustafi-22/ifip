"use client";

import { useState } from "react";
import { updateLevyPricing, type LevyPricing } from "@/lib/api/services";
import { useLevyPricing } from "@/lib/hooks/useLevyPricing";

function toMinorUnits(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fractional = ""] = value.split(".");
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
}

function PriceFields({ pricing }: { pricing: LevyPricing }) {
  const [ngn, setNgn] = useState(String(pricing.NGN / 100));
  const [usd, setUsd] = useState(String(pricing.USD / 100));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const amounts = { NGN: toMinorUnits(ngn), USD: toMinorUnits(usd) };
    if (Object.values(amounts).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      setError("Enter positive prices with up to two decimal places.");
      return;
    }
    setSaving(true);
    try {
      await updateLevyPricing(amounts);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save levy prices.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#000666]";

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block space-y-1 text-sm font-semibold text-slate-700">
        <span>Nigeria (NGN)</span>
        <input className={inputClass} inputMode="decimal" required disabled={saving} value={ngn}
          onChange={(event) => { setNgn(event.target.value); setSaved(false); }} />
      </label>
      <label className="block space-y-1 text-sm font-semibold text-slate-700">
        <span>Outside Nigeria (USD)</span>
        <input className={inputClass} inputMode="decimal" required disabled={saving} value={usd}
          onChange={(event) => { setUsd(event.target.value); setSaved(false); }} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-800">Levy prices saved.</p>}
      <button type="submit" disabled={saving} className="w-full rounded-lg bg-[#000666] px-4 py-3 text-sm font-semibold text-white hover:bg-[#000666]/90 disabled:opacity-60">
        {saving ? "Saving prices…" : "Save levy prices"}
      </button>
    </form>
  );
}

export default function LevyPricingForm() {
  const { pricing, failed, retry } = useLevyPricing();

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="levy-price-title">
      <div>
        <h2 id="levy-price-title" className="text-base font-bold text-[#000666]">Commitment levy prices</h2>
        <p className="mt-1 text-sm text-slate-600">New checkouts use these prices. Existing payment attempts keep their quoted amount.</p>
      </div>
      {pricing ? <PriceFields pricing={pricing} /> : failed ? (
        <div>
          <p role="alert" className="text-sm text-red-700">Unable to load the current levy prices.</p>
          <button type="button" onClick={retry} className="mt-2 text-sm font-semibold text-[#000666] underline">Retry</button>
        </div>
      ) : <p role="status" className="text-sm text-slate-600">Loading levy prices…</p>}
    </section>
  );
}
