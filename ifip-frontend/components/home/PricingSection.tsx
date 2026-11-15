"use client";

import { useEffect, useState } from "react";
import { TbMapPin } from "react-icons/tb";
import HomepageReveal from "./HomepageReveal";
import { formatLevyAmount, useLevyPricing } from "@/lib/hooks/useLevyPricing";

export default function PricingSection() {
  const [country, setCountry] = useState<string | null>(null);
  const { pricing, failed } = useLevyPricing();
  const currency = country === "NG" ? "NGN" : "USD";

  useEffect(() => {
    const controller = new AbortController();
    async function detectLocation() {
      try {
        const response = await fetch("/api/geolocation", { signal: controller.signal });
        if (!response.ok) throw new Error("Location unavailable");
        const { countryCode } = await response.json();
        if (!controller.signal.aborted) setCountry(countryCode || "NG");
      } catch {
        if (!controller.signal.aborted) setCountry("NG");
      }
    }
    void detectLocation();
    return () => controller.abort();
  }, []);

  return (
    <section id="levy" className="ifip-home-section ifip-home-tint" aria-labelledby="levy-title">
      <HomepageReveal className="ifip-home-wrap ifip-home-section-grid">
        <div className="ifip-home-section-intro">
          <h2 id="levy-title">Program commitment levy</h2>
          <p>The levy covers the preparatory program, including learning modules, practical simulations and the final assessment.</p>
        </div>
        <div className="ifip-home-card ifip-home-levy" role="status" aria-atomic="true">
          <div className="ifip-home-meta">
            <TbMapPin aria-hidden="true" />
            {country === null ? "Checking location…" : country === "NG" ? "Nigeria" : "Outside Nigeria"}
          </div>
          {country && pricing && <p className="ifip-home-amount">{formatLevyAmount(pricing[currency], currency)}</p>}
          {country && !pricing && <p>{failed ? "Levy temporarily unavailable." : "Loading levy…"}</p>}
        </div>
      </HomepageReveal>
    </section>
  );
}
