"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { TbArrowDown, TbArrowUpRight, TbBook, TbBriefcase, TbClipboardCheck } from "react-icons/tb";
import apiClient from "@/lib/api/client";
import type { RegistrationStatus } from "@/lib/api/services";

const stages = [
  { icon: TbBook, title: "Prepare", detail: "Four weeks of virtual training." },
  { icon: TbBriefcase, title: "Practice", detail: "Workplace skills and simulations." },
  { icon: TbClipboardCheck, title: "Demonstrate readiness", detail: "Assessment and placement consideration." },
];

const entranceEase = [0.2, 0, 0, 1] as const;

export default function HeroSection() {
  const [cohort, setCohort] = useState<RegistrationStatus | null>(null);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const reducedMotion = useReducedMotion();
  const initialCopy = reducedMotion ? false : { y: 14 };
  const initialPanel = reducedMotion ? false : { "--pathway-offset": 20 };
  const entrance = { duration: reducedMotion ? 0 : 0.42, ease: entranceEase };

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const { data } = await apiClient.get<RegistrationStatus>("/cohort/registration-status", { signal: controller.signal });
        if (!controller.signal.aborted) {
          setCohort(data);
          setStatusUnavailable(false);
        }
      } catch {
        // Keep the last known cohort available during a temporary failure.
        if (!controller.signal.aborted) setStatusUnavailable(true);
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

  let status = "Checking application availability…";
  if (cohort) {
    status = !cohort.hasActiveCohort
      ? "Applications are currently closed"
      : cohort.isFull
        ? "Current cohort is full"
        : "Applications open";
    if (cohort.hasActiveCohort && cohort.cohortName) status += " · " + cohort.cohortName;
  } else if (statusUnavailable) {
    status = "Check availability on the application page";
  }
  const waitingList = cohort && (!cohort.hasActiveCohort || cohort.isFull);

  return (
    <section className="ifip-home-hero" aria-labelledby="homepage-title">
      <div className="ifip-home-hero-grid">
        <div>
          <p className="ifip-home-eyebrow">Islamic Finance Internship Program</p>
          <motion.h1 id="homepage-title" data-home-entrance initial={initialCopy} animate={{ y: 0 }} transition={entrance}>
            Your pathway into <em>Islamic finance.</em>
          </motion.h1>
          <motion.p className="ifip-home-lead" data-home-entrance initial={initialCopy} animate={{ y: 0 }} transition={{ ...entrance, delay: reducedMotion ? 0 : 0.075 }}>
            Four weeks of virtual training, practical simulations and assessment, followed by consideration for internship placement with partner organizations.
          </motion.p>
          <motion.div className="ifip-home-actions" data-home-entrance initial={initialCopy} animate={{ y: 0 }} transition={{ ...entrance, delay: reducedMotion ? 0 : 0.15 }}>
            <Link className="ifip-home-button" href="/apply">
              {waitingList ? "Join the waitlist" : "Apply to IFIP"}
              <TbArrowUpRight aria-hidden="true" />
            </Link>
            <a className="ifip-home-text-link" href="#curriculum">Explore the curriculum <TbArrowDown aria-hidden="true" /></a>
          </motion.div>
          <p className="ifip-home-cohort" role="status">{status}</p>
        </div>
        <motion.aside
          className="ifip-home-pathway"
          aria-labelledby="pathway-heading"
          data-home-entrance
          initial={initialPanel}
          animate={{ "--pathway-offset": 0 }}
          transition={{ ...entrance, delay: reducedMotion ? 0 : 0.105 }}
        >
          <p className="ifip-home-eyebrow" id="pathway-heading">The program pathway</p>
          <ol>
            {stages.map(({ icon: Icon, title, detail }) => (
              <li key={title}>
                <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>
                <div><strong>{title}</strong><p>{detail}</p></div>
              </li>
            ))}
          </ol>
        </motion.aside>
      </div>
    </section>
  );
}
