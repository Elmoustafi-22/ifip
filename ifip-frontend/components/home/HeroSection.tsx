"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TbArrowUpRight } from "react-icons/tb";
import apiClient from "@/lib/api/client";
import type { RegistrationStatus } from "@/lib/api/services";
import { formatRegistrationDeadline } from "@/lib/utils/registrationDeadline";

const entranceEase = [0.2, 0, 0, 1] as const;

export default function HeroSection() {
  const [cohort, setCohort] = useState<RegistrationStatus | null>(null);
  const entrance = { duration: 0.5, ease: entranceEase };

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const { data } = await apiClient.get<RegistrationStatus>("/cohort/registration-status", { signal: controller.signal });
        if (!controller.signal.aborted) setCohort(data);
      } catch {
        // Keep the last known cohort available during a temporary failure.
      } finally {
        fetching = false;
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, []);

  const waitingList = cohort && (!cohort.hasActiveCohort || cohort.isFull);
  const registrationDeadline = cohort?.hasActiveCohort && !cohort.isFull
    ? formatRegistrationDeadline(cohort.registrationEndDate)
    : null;

  return (
    <section className="ifip-home-hero" aria-labelledby="homepage-title">
      <div className="ifip-home-hero-grid">
        <div>
          <motion.p className="ifip-home-eyebrow" data-home-entrance initial={{ x: -18, opacity: 0.45 }} animate={{ x: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.04 }}>Islamic Finance Internship Program</motion.p>
          <motion.h1 id="homepage-title" data-home-entrance initial={{ x: -32, opacity: 0.45, filter: "blur(4px)" }} animate={{ x: 0, opacity: 1, filter: "blur(0px)" }} transition={{ ...entrance, delay: 0.14 }}>
            Prepare for a career in <em>Islamic finance.</em>
          </motion.h1>
          <motion.p className="ifip-home-lead" data-home-entrance initial={{ x: -24, opacity: 0.45 }} animate={{ x: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.26 }}>
            Industry readiness training, a professional Workplace Readiness Certificate and internship placement, preparing young talents for careers in Islamic finance, Fintech and Halal industries.
          </motion.p>
          {registrationDeadline && (
            <p className="ifip-home-registration-deadline">
              <strong>Registration deadline:</strong> {registrationDeadline}
            </p>
          )}
          <div className="ifip-home-actions">
            <motion.span className="ifip-home-action-item" data-home-entrance initial={{ y: 18, opacity: 0.45 }} animate={{ y: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.4 }}>
              <Link className="ifip-home-button" href="/apply">
                {waitingList ? "Join the waitlist" : "Apply to IFIP"}
                <TbArrowUpRight aria-hidden="true" />
              </Link>
            </motion.span>
            <motion.span className="ifip-home-action-item" data-home-entrance initial={{ y: 18, opacity: 0.45 }} animate={{ y: 0, opacity: 1 }} transition={{ ...entrance, delay: 0.5 }}>
              <Link className="ifip-home-text-link" href="/partners/apply">
                Apply to host interns <TbArrowUpRight aria-hidden="true" />
              </Link>
            </motion.span>
          </div>
        </div>
        <motion.figure className="ifip-home-hero-visual" data-home-entrance initial={{ x: 34, opacity: 0.55 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.72, delay: 0.2, ease: entranceEase }}>
          <Image src="/images/homepage/career.webp" alt="Notebook and career planning materials" width={960} height={640} priority />
          <figcaption>Prepare · Practise · Progress</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
