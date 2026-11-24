"use client";

import { useEffect, useState } from "react";
import { TbMapPin } from "react-icons/tb";
import HomepageReveal from "./HomepageReveal";
import HomepageMotionItem from "./HomepageMotionItem";
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
    <section id="levy" className="ifip-home-section ifip-home-pricing-section" aria-labelledby="levy-title">
      <HomepageReveal className="ifip-home-wrap ifip-home-section-grid" direction="left">
        <div className="ifip-home-section-intro">
          <HomepageMotionItem as="h2" id="levy-title" delay={0.1} blur>Program commitment levy</HomepageMotionItem>
          <HomepageMotionItem as="p" delay={0.2}>The levy covers the preparatory program, including learning modules, practical simulations and the final assessment.</HomepageMotionItem>
        </div>
        <div className="ifip-home-card ifip-home-levy" role="status" aria-atomic="true">
          <HomepageMotionItem className="ifip-home-meta" delay={0.16} direction="right">
            <TbMapPin aria-hidden="true" />
            {country === null ? "Checking location…" : country === "NG" ? "Nigeria" : "Outside Nigeria"}
          </HomepageMotionItem>
          {country && pricing && <HomepageMotionItem as="p" className="ifip-home-amount" delay={0.28} direction="right">{formatLevyAmount(pricing[currency], currency)}</HomepageMotionItem>}
          {country && !pricing && <p>{failed ? "Levy temporarily unavailable." : "Loading levy…"}</p>}
        </div>
      </HomepageReveal>
    </section>
  );
}
