"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiArrowRight, HiChevronRight, HiOutlineShieldCheck } from "react-icons/hi2";
import { motion } from "framer-motion";
import apiClient from "@/lib/api/client";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";

const fadeInUp = {
  initial: { opacity: 0, y: 25 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCohortStatus = useMemo(() => async () => {
    const { data } = await apiClient.get("/cohort/registration-status");
    return data;
  }, []);

  const { data: cohortData } = useCachedFetch<{ hasActiveCohort: boolean; cohortName?: string; brochureUrl?: string }>(
    "cohort_registration_status",
    fetchCohortStatus,
    "cohort"
  );

  const cohortName = cohortData?.hasActiveCohort && cohortData?.cohortName ? cohortData.cohortName : "";

  // Render a static (non-animated) version on the server / before mount to maximise LCP
  if (!mounted) {
    return (
      <section className="pt-10 pb-12 md:py-20 max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="hidden sm:inline-flex items-center gap-2.5 bg-[#e8e8ed] px-4 py-2 rounded-full max-w-full text-sm font-semibold text-primary font-sans w-fit">
            <HiOutlineShieldCheck className="w-5 h-5 text-primary stroke-[2] shrink-0" />
            <span>Islamic Finance Internship Preparatory and Placement Program</span>
          </div>
          <h1 className="text-display-lg text-primary leading-tight text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight">
            Master &amp; Practice<br className="hidden md:inline" /> Islamic Finance.<br className="hidden md:inline" />{" "}
            <span className="text-vibrant-blue italic font-serif block mt-1.5 md:inline md:mt-0">Put your talent into action.</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl">
            Join our intensive program designed to equip you with the essential skills, knowledge, and hands-on experience to excel in the global Islamic finance and ethical business ecosystem.
          </p>
          {/* Mobile Hero Checklist */}
          <div className="flex md:hidden flex-col gap-3 bg-vibrant-blue/5 border border-vibrant-blue/10 rounded-xl p-5 w-full font-sans text-sm font-semibold text-[#000666]">
            {[
              "4-Week Intensive Virtual Training",
              "Workplace Professionalism",
              "Practical Simulations",
              "Internship Placement"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-vibrant-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2 font-sans">
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] text-center shadow-level1 hover-lift flex items-center justify-center gap-2 transition-all"
            >
              Apply for Program
              <HiArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/partners/apply"
              className="border border-primary text-primary hover:bg-primary/5 font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] text-center hover-lift flex items-center justify-center gap-2 transition-all bg-white"
            >
              Become a Partner
            </Link>
          </div>
        </div>
        {/* Right side card — static for SSR */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[460px] bg-white border border-outline-variant/30 rounded-2xl shadow-level1 overflow-hidden flex flex-col">
            <div className="w-full aspect-[16/10] bg-slate-100/60 flex items-center justify-center p-4 relative">
              <Image
                src="/images/homepage/undraw_accomplishments_tb6k.svg"
                alt="Structured Career Development"
                width={400}
                height={250}
                priority
                className="w-full h-auto object-contain max-h-[220px]"
              />
            </div>
            <div className="bg-white p-4 border-t border-outline-variant/20 flex justify-between items-center font-sans">
              <div />
              <Link href="/apply" className="text-sm font-bold text-vibrant-blue flex items-center gap-1 hover:text-vibrant-blue/80 transition-colors">
                Apply Now
                <HiChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-10 pb-12 md:py-20 max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <motion.div
        className="lg:col-span-7 flex flex-col gap-5"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div
          className="hidden sm:inline-flex items-center gap-2.5 bg-[#e8e8ed] px-4 py-2 rounded-full max-w-full text-sm font-semibold text-primary font-sans w-fit"
          variants={fadeInUp}
        >
          <HiOutlineShieldCheck className="w-5 h-5 text-primary stroke-[2] shrink-0" />
          <span>Islamic Finance Internship Preparatory and Placement Program</span>
        </motion.div>

        <motion.h1
          className="text-display-lg text-primary leading-tight text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight"
          variants={fadeInUp}
        >
          Master &amp; Practice<br className="hidden md:inline" /> Islamic Finance.<br className="hidden md:inline" />{" "}
          <span className="text-vibrant-blue italic font-serif block mt-1.5 md:inline md:mt-0">Put your talent into action.</span>
        </motion.h1>

        <motion.p
          className="text-body-lg text-on-surface-variant max-w-xl"
          variants={fadeInUp}
        >
          Join our intensive program designed to equip you with the essential skills, knowledge, and hands-on experience to excel in the global Islamic finance and ethical business ecosystem.
        </motion.p>

        {/* Mobile Hero Checklist */}
        <motion.div
          className="flex md:hidden flex-col gap-3 bg-vibrant-blue/5 border border-vibrant-blue/10 rounded-xl p-5 w-full font-sans text-sm font-semibold text-[#000666]"
          variants={fadeInUp}
        >
          {[
            "4-Week Intensive Virtual Training",
            "Workplace Professionalism",
            "Practical Simulations",
            "Internship Placement"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <svg className="w-5 h-5 text-vibrant-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{item}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2 font-sans"
          variants={fadeInUp}
        >
          <Link
            href="/apply"
            className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] text-center shadow-level1 hover-lift flex items-center justify-center gap-2 transition-all"
          >
            Apply for Program
            <HiArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/partners/apply"
            className="border border-primary text-primary hover:bg-primary/5 font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] text-center hover-lift flex items-center justify-center gap-2 transition-all bg-white"
          >
            Become a Partner
          </Link>
        </motion.div>
      </motion.div>

      {/* Right side Video/Media Card */}
      <motion.div
        className="lg:col-span-5 relative flex justify-center lg:justify-end"
        initial={{ opacity: 0, scale: 0.95, x: 30 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.25, type: "spring", stiffness: 60 }}
      >
        <div className="relative w-full max-w-[460px] bg-white border border-outline-variant/30 rounded-2xl shadow-level1 hover-lift overflow-hidden flex flex-col group transition-all">
          {/* Gray Video Placeholder */}
          <div className="w-full aspect-[16/10] bg-slate-100/60 flex items-center justify-center p-4 relative">
            <Image
              src="/images/homepage/undraw_accomplishments_tb6k.svg"
              alt="Structured Career Development"
              width={400}
              height={250}
              priority
              className="w-full h-auto object-contain max-h-[220px] group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Card Footer Bar */}
          <div className="bg-white p-4 border-t border-outline-variant/20 flex justify-between items-center font-sans">
            <div>
              {cohortName && (
                <>
                  <span className="text-xs uppercase font-bold text-on-surface-variant tracking-wider block">Next Cohort Session</span>
                  <span className="font-semibold text-primary text-sm">{cohortName}</span>
                </>
              )}
            </div>
            <Link
              href="/apply"
              className="text-sm font-bold text-vibrant-blue flex items-center gap-1 hover:text-vibrant-blue/80 transition-colors"
            >
              Apply Now
              <HiChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
