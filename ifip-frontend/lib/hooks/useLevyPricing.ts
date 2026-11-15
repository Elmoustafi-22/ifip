import { useEffect, useState } from "react";
import { getLevyPricing, type LevyPricing } from "@/lib/api/services";

export function useLevyPricing(enabled = true) {
  const [pricing, setPricing] = useState<LevyPricing | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    getLevyPricing().then((amounts) => {
      if (ignore) return;
      setPricing(amounts);
      setFailed(false);
    }).catch(() => {
      if (ignore) return;
      setPricing(null);
      setFailed(true);
    });
    return () => { ignore = true; };
  }, [enabled, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((current) => current + 1);
  }

  return { pricing, failed, retry };
}

export function formatLevyAmount(minorUnits: number, currency: keyof LevyPricing) {
  const amount = (minorUnits / 100).toLocaleString("en", {
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === "NGN" ? `₦${amount}` : `US$${amount}`;
}
