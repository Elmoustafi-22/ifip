"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HiBars3,
  HiXMark,
  HiArrowRight,
  HiAcademicCap,
  HiSparkles,
  HiCheckCircle,
  HiShare,
  HiGlobeAlt,
  HiChevronRight,
  HiArrowDownTray,
  HiArrowTrendingUp,
  HiOutlineShieldCheck
} from "react-icons/hi2";
import {
  TbBook,
  TbUserCog,
  TbRefresh,
  TbBriefcase,
  TbHeartHandshake,
  TbAward,
  TbSearch,
  TbScale,
  TbMessage,
  TbWriting,
  TbActivity,
  TbDeviceLaptop,
  TbBrandLinkedin
} from "react-icons/tb";
import apiClient from "@/lib/api/client";
import { getActivePartners, getActiveOpenings, ActiveOpening, getOpportunities, PlacementOpportunity } from "@/lib/api/services";
import { getAccessToken } from "@/lib/api/auth";
import * as TbIcons from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";

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

function resolveOpportunityIcon(iconName: string): React.ComponentType<any> {
  const Icon = (TbIcons as any)[iconName];
  return Icon || TbIcons.TbBriefcase;
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePlacementsTab, setActivePlacementsTab] = useState<"opportunities" | "jobs">("opportunities");
  const [isNigeria, setIsNigeria] = useState<boolean | null>(null);
  const [cohortName, setCohortName] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openings, setOpenings] = useState<ActiveOpening[]>([]);
  const [openingsLoading, setOpeningsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  useEffect(() => {
    const detectIp = async () => {
      try {
        const res = await fetch("/api/geolocation");
        const data = await res.json();
        if (data && data.countryCode) {
          setIsNigeria(data.countryCode === "NG");
        } else {
          setIsNigeria(true); // Default to Nigeria if detection fails
        }
      } catch (err) {
        console.error("IP detection failed:", err);
        setIsNigeria(true); // Default fallback
      }
    };
    detectIp();
  }, []);

  useEffect(() => {
    const fetchCohortName = async () => {
      try {
        const { data } = await apiClient.get("/cohort/registration-status");
        if (data) {
          if (data.hasActiveCohort && data.cohortName) {
            setCohortName(data.cohortName);
          }
          if (data.brochureUrl) {
            setBrochureUrl(data.brochureUrl);
          }
        }
      } catch (err) {
        console.error("Failed to fetch registration status config:", err);
      }
    };
    fetchCohortName();
  }, []);

  const [partners, setPartners] = useState<{ name: string; logoUrl?: string; website?: string }[]>([]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const data = await getActivePartners();
        setPartners(data);
      } catch (err) {
        console.error("Failed to fetch active partners:", err);
      }
    };
    fetchPartners();
  }, []);

  useEffect(() => {
    const fetchOpenings = async () => {
      try {
        setOpeningsLoading(true);
        const data = await getActiveOpenings();
        setOpenings(data);
      } catch (err) {
        console.error("Failed to fetch active openings:", err);
      } finally {
        setOpeningsLoading(false);
      }
    };
    fetchOpenings();
  }, []);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setOpportunitiesLoading(true);
        const data = await getOpportunities();
        setOpportunities(data);
      } catch (err) {
        console.error("Failed to fetch placement opportunities:", err);
      } finally {
        setOpportunitiesLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col pb-16 md:pb-0">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-3 md:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo (Mobile & Desktop) */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <a href="#curriculum" className="text-on-surface/80 hover:text-primary transition-colors">Curriculum</a>
            <a href="#process" className="text-on-surface/80 hover:text-primary transition-colors">Process</a>
            <a href="#partners" className="text-on-surface/80 hover:text-primary transition-colors">Partners</a>
            <a href="#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
              Login
            </Link>
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile-only Right: Hamburger menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:text-primary"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <HiXMark className="w-6 h-6" /> : <HiBars3 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-45 bg-background md:hidden flex flex-col px-6 py-8 border-t border-outline-variant/30 gap-6">
          <a
            href="#curriculum"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Curriculum
          </a>
          <a
            href="#process"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Process
          </a>
          <a
            href="#partners"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Partners
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            FAQ
          </a>
          <div className="flex flex-col gap-4 mt-6">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-semibold border border-primary/20 py-3 rounded-[4px] hover:bg-primary/5 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center bg-impact-orange text-white font-semibold py-3 rounded-[4px]"
            >
              Apply Now
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
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
            Master & Practice<br className="hidden md:inline" /> Islamic Finance.<br className="hidden md:inline" />{" "}
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

      {/* Comprehensive Core Training Section */}
      <section id="curriculum" className="py-12 md:py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Comprehensive Core Training</h2>
            <p className="text-body-md text-on-surface-variant">Our rigorous curriculum ensures you are fully prepared for the most demanding roles.</p>
            <div className="mt-6 flex justify-center">
              <a
                href={brochureUrl || "/docs/Islamic Finance Internship Preparatory & Placement Program_20260716_181547_0000.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-impact-orange hover:bg-impact-orange/95 text-white font-semibold text-sm px-6 py-3 rounded-[6px] shadow-md hover-lift transition-all inline-flex items-center gap-2 cursor-pointer font-sans"
              >
                <HiArrowDownTray className="w-4 h-4" />
                Download Brochure
              </a>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {/* Card 1: Foundational Knowledge */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/5 rounded-[8px] text-primary">
                  <TbBook className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-primary">Foundational Knowledge</h3>
              </div>
              <ul className="flex flex-col gap-3 font-sans">
                {[
                  "Introduction to Islamic Finance Principles & Ecosystem",
                  "Fintech & Digital Innovation",
                  "Islamic Finance Ethics & Professional Conduct (Adab of Work)",
                  "Career Pathways in Ethical Economy"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-on-surface-variant font-medium">
                    <HiCheckCircle className="w-5 h-5 text-vibrant-blue shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Card 2: Professional Identity */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/5 rounded-[8px] text-primary">
                  <TbUserCog className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-primary">Professional Identity</h3>
              </div>
              <ul className="flex flex-col gap-3 font-sans">
                {[
                  "Workplace Professionalism & Leadership",
                  "Communication Skills (Written, Verbal & Corporate)",
                  "CV Building & LinkedIn Optimization",
                  "Personal Branding & Identity"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-on-surface-variant font-medium">
                    <HiCheckCircle className="w-5 h-5 text-vibrant-blue shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Card 3: Practical Execution */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/5 rounded-[8px] text-primary">
                  <TbBriefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-primary">Practical Execution</h3>
              </div>
              <ul className="flex flex-col gap-3 font-sans">
                {[
                  "Research & Analytical Thinking in Finance",
                  "Project Execution & Real-world Simulations",
                  "Industry Tools, Digital Skills & Productivity",
                  "Internship Orientation & Expectations"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-on-surface-variant font-medium">
                    <HiCheckCircle className="w-5 h-5 text-vibrant-blue shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Placements & Opportunities Section */}
      <section id="sectors" className="py-12 md:py-24 bg-background border-b border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Internships & Active Openings</h2>
            <p className="text-body-md text-on-surface-variant font-sans">
              Explore internship pathways and discover current openings across our partner network.
            </p>
          </motion.div>

          {/* Interactive Tabs Header */}
          <motion.div
            className="flex justify-center mb-12 font-sans px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-[#e8e8ed] p-1.5 rounded-full grid grid-cols-2 w-full max-w-sm sm:flex sm:w-auto items-center gap-1 shadow-sm border border-outline-variant/20">
              <button
                onClick={() => setActivePlacementsTab("opportunities")}
                className={`px-3 sm:px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-300 cursor-pointer text-center whitespace-nowrap ${activePlacementsTab === "opportunities"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant/80 hover:text-primary"
                  }`}
              >
                Opportunities
              </button>
              <button
                onClick={() => setActivePlacementsTab("jobs")}
                className={`px-3 sm:px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-300 cursor-pointer text-center whitespace-nowrap ${activePlacementsTab === "jobs"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant/80 hover:text-primary"
                  }`}
              >
                Active Openings
              </button>
            </div>
          </motion.div>

          {/* Active Tab Content */}
          <AnimatePresence mode="wait">
            {activePlacementsTab === "opportunities" ? (
              <motion.div
                key="opportunities-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >

                {/* Opportunities categories grid */}
                {opportunitiesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-outline-variant/20 rounded-[12px] p-6 flex flex-col gap-4 animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-slate-200 rounded-full shrink-0"></div>
                          <div className="h-5 w-2/3 bg-slate-200 rounded"></div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 w-full">
                          <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                          <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
                          <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant/80 font-sans font-medium text-sm">
                    No opportunities listed currently. Please check back later.
                  </div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                  >
                    {opportunities.map((opp) => {
                      const IconComponent = resolveOpportunityIcon(opp.icon);
                      return (
                        <motion.div
                          key={opp._id}
                          variants={fadeInUp}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                          className="bg-white border border-outline-variant/20 rounded-[12px] p-6 hover:shadow-md transition-all flex flex-col items-start gap-4 text-left font-sans"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary rounded-full text-white shrink-0">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-primary font-display">{opp.category}</h3>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 w-full">
                            {opp.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-primary/5 text-primary text-[11px] font-bold rounded-full border border-primary/10 transition-colors hover:bg-primary hover:text-white"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="jobs-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >

                {/* Jobs grid */}
                {openingsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-between h-44 animate-pulse"
                      >
                        <div>
                          <div className="h-3 w-24 bg-slate-200 rounded mb-2"></div>
                          <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                        </div>
                        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-2">
                          <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
                          <div className="h-4 w-24 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : openings.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant/80 font-sans font-medium text-sm">
                    No active openings currently listed. Please check back later or apply to waitlist.
                  </div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans"
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                  >
                    {openings.map((job) => (
                      <motion.div
                        key={job._id}
                        variants={fadeInUp}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="bg-white border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all"
                      >
                        <div>
                          <span className="text-[10px] uppercase font-bold text-vibrant-blue tracking-wider block mb-2">{job.department}</span>
                          <h3 className="text-base font-bold text-primary font-display mb-4 min-h-[48px] flex items-center">{job.title}</h3>
                        </div>

                        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${job.workMode === "Remote" ? "bg-sky-500/10 text-sky-600" :
                              job.workMode === "Hybrid" ? "bg-emerald-500/10 text-emerald-600" :
                                "bg-amber-500/10 text-amber-600"
                              }`}>
                              {job.workMode}
                            </span>
                            {job.location && job.location !== "-" && (
                              <span className="text-xs text-on-surface-variant font-medium">{job.location}</span>
                            )}
                          </div>

                          <Link
                            href="/apply"
                            className="text-xs font-bold text-primary hover:text-vibrant-blue transition-colors flex items-center gap-1"
                          >
                            Apply via Program &rarr;
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Who Can Apply Section */}
      <section className="py-12 md:py-24 bg-white relative flex flex-col items-center border-b border-outline-variant/10">
        {/* Overlapping Badge */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <Link
            href="/about"
            className="inline-flex items-center justify-center bg-white border border-vibrant-blue/20 hover:border-vibrant-blue text-vibrant-blue font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all whitespace-nowrap"
          >
            Learn More About Our Mission
          </Link>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 md:px-8 w-full text-center mt-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">
              Who Can Apply?
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed">
              The program welcomes ambitious minds from anywhere in the world looking to make a career impact in the ethical finance and business ecosystem. You are welcome to apply if you belong to one of these groups:
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {/* Students Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 hover:shadow-lg transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiAcademicCap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Students
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Current undergraduate and postgraduate students enrolled in recognized institutions preparing for career opportunities.
              </p>
            </motion.div>

            {/* Graduates Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 hover:shadow-lg transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <TbAward className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Graduates
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Graduates from recognized institutions seeking to develop relevant knowledge, skills, and career pathways in ethical industries.
              </p>
            </motion.div>

            {/* Professionals Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 hover:shadow-lg transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiArrowTrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Professionals
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Working professionals seeking to deepen their Shariah finance expertise, expand their network, and secure advanced roles in premium ethical institutions.
              </p>
            </motion.div>

            {/* Aspiring Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 hover:shadow-lg transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiSparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Aspiring
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Individuals from non-finance backgrounds (such as Tech, Law, or Administration) looking to pivot their existing skills into the ethical finance and fintech ecosystem.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Program Fee Section */}
      <section className="py-12 md:py-24 bg-background border-b border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Program Fee</h2>
            <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed font-sans">
              To become part of the Islamic Finance Internship Program, applicants are required to complete the registration fee as part of the admission process.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-8 max-w-3xl mx-auto w-full font-sans"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {isNigeria === null ? (
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 flex-1 w-full max-w-sm flex flex-col items-center justify-center min-h-[220px]">
                <div className="animate-pulse flex flex-col items-center gap-4 w-full">
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                </div>
              </div>
            ) : isNigeria ? (
              /* Nigeria Pricing Card */
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 flex-1 w-full max-w-sm hover:shadow-md hover-lift transition-all flex flex-col items-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Program Commitment Levy</span>
                <span className="text-4xl font-display font-black text-primary mb-6">₦20,000</span>
                <p className="text-xs text-on-surface-variant leading-relaxed text-center font-sans">
                  Grants full access to the complete preparatory program experience, including learning modules, practical simulations, and final assessment.
                </p>
              </div>
            ) : (
              /* International Pricing Card */
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 flex-1 w-full max-w-sm hover:shadow-md hover-lift transition-all flex flex-col items-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Program Commitment Levy</span>
                <span className="text-4xl font-display font-black text-primary mb-6">$30</span>
                <p className="text-xs text-on-surface-variant leading-relaxed text-center font-sans">
                  Grants full access to the complete preparatory program experience, including learning modules, practical simulations, and final assessment.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Bridge the Gap Section Banner */}
      <section className="py-10 md:py-20 bg-academic-cream">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <motion.div
            className="bg-vibrant-blue text-white rounded-[24px] px-6 py-12 md:py-16 text-center shadow-lg relative overflow-hidden flex flex-col items-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Subtle background overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_50%)]"></div>

            <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl mb-4 z-10 font-bold">
              Bridge the Gap
            </h2>
            <p className="text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-12 leading-relaxed z-10 font-sans">
              Our mission is to transform academic potential into industry-ready excellence through three core values.
            </p>

            {/* Three Core Values Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl justify-center items-start z-10"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div className="flex flex-col items-center gap-4 text-center" variants={fadeInUp}>
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbUserCog className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Talent
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Identifying and nurturing promising minds passionate about Shariah-compliant finance and ethical economy.
                </p>
              </motion.div>

              <motion.div className="flex flex-col items-center gap-4 text-center" variants={fadeInUp}>
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbRefresh className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Development
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Providing rigorous core training, professional identity workshops, simulations, and career readiness.
                </p>
              </motion.div>

              <motion.div className="flex flex-col items-center gap-4 text-center" variants={fadeInUp}>
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbBriefcase className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Placement
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Connecting qualified graduates and professionals with premier partner institutions for real-world internship exposure.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Application & Placement Journey Section */}
      <section id="process" className="py-12 md:py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Application & Placement Journey</h2>
            <p className="text-body-md text-on-surface-variant">Our step-by-step selection and placement process.</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {[
              {
                step: "1",
                title: "Application & Admission",
                desc: "Interested candidates apply for the program, complete the requirements, and are admitted into the cohort."
              },
              {
                step: "2",
                title: "Preparatory Program",
                desc: "Participants undergo a four-week intensive program covering Islamic finance, professional skills, ethics, and simulations."
              },
              {
                step: "3",
                title: "Evaluation",
                desc: "Participants undergo an assessment to evaluate Shariah knowledge, readiness, and suitability for placement."
              },
              {
                step: "4",
                title: "Internship Placement",
                desc: "Qualified participants are connected with partner organizations for internship opportunities based on industry needs."
              },
              {
                step: "5",
                title: "Industry Experience",
                desc: "Participants begin their internship journey, gaining practical workplace exposure and applying their knowledge."
              }
            ].map((journey, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="bg-white border border-outline-variant/30 rounded-[12px] p-6 flex flex-col items-start gap-4 hover:shadow-md transition-all text-left font-sans"
              >
                <div className="w-10 h-10 bg-[#000666] text-white font-bold flex items-center justify-center rounded-[4px] text-lg">
                  {journey.step}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary font-display mb-2">{journey.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{journey.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Institutional Partners for Placement Section */}
      <section id="partners" className="py-12 md:py-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-headline-lg text-primary font-display text-3xl">Institutional Partners for Placement</h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 items-center justify-items-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {partners.map((partner, i) => {
            const CardContent = (
              <div className="w-full max-w-[220px] min-h-[150px] bg-white border border-outline-variant/20 rounded-[8px] p-5 flex flex-col items-center justify-between shadow-sm hover:shadow-md hover-lift transition-all group text-center h-full">
                <div className="flex-1 flex items-center justify-center w-full">
                  {partner.logoUrl ? (
                    <Image
                      src={partner.logoUrl}
                      alt={`${partner.name} Logo`}
                      width={180}
                      height={80}
                      className="max-h-[70px] max-w-full h-auto object-contain transition-opacity duration-300"
                    />
                  ) : (
                    <div className="w-full h-[70px] bg-slate-100 rounded flex items-center justify-center text-slate-300 text-xs font-sans">
                      No Logo
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-primary/85 font-sans mt-2 block group-hover:text-primary transition-colors">
                  {partner.name}
                </span>
              </div>
            );

            return (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="w-full max-w-[220px]"
              >
                {partner.website ? (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-[220px] block cursor-pointer"
                  >
                    {CardContent}
                  </a>
                ) : (
                  CardContent
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Become a Partner CTA Section */}
      <section className="py-8 pb-12 md:pb-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <motion.div
          className="relative rounded-[20px] overflow-hidden bg-primary shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Radial glow accents */}
          <div className="absolute top-0 left-0 w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(128,216,255,0.12),transparent_65%)] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,111,45,0.10),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left — Copy */}
            <div className="flex flex-col justify-center px-8 py-14 md:px-14 md:py-16 lg:pr-8">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-impact-orange mb-4 block">
                Partner With Us
              </span>

              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-5" style={{ fontFamily: "Georgia, serif" }}>
                Grow the next generation of Islamic finance talent&nbsp;— with&nbsp;us.
              </h2>

              <p className="text-sky-100/80 text-sm md:text-base leading-relaxed mb-8 max-w-md">
                Partner organizations gain access to a curated pool of pre-trained, Shariah-literate interns who are job-ready from day one. Whether you're a bank, advisory firm, or fintech — IFIP makes it effortless.
              </p>

              {/* Benefit bullets */}
              <ul className="flex flex-col gap-3 mb-10">
                {[
                  "Pre-screened, program-certified candidates",
                  "Zero recruitment overhead on your end",
                  "Flexible internship structures to suit your firm",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-impact-orange/20 border border-impact-orange/40 flex items-center justify-center">
                      <svg className="w-3 h-3 text-impact-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/partners/apply"
                  className="inline-flex items-center justify-center gap-2 bg-impact-orange hover:bg-impact-orange/90 text-white font-bold text-sm px-7 py-3.5 rounded-[6px] shadow-lg hover-lift transition-all"
                >
                  Become a Partner
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="mailto:ifip.program@gmail.com"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/10 text-white font-semibold text-sm px-7 py-3.5 rounded-[6px] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Get in Touch
                </a>
              </div>
            </div>

            {/* Right — Decorative card panel */}
            <div className="hidden lg:flex items-center justify-center px-10 py-16 border-l border-white/10">
              <div className="flex flex-col gap-6 w-full max-w-sm">
                {/* Highlight stat cards */}
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5 text-impact-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ),
                    label: "Curated Talent Pool",
                    desc: "Interns vetted through a rigorous 4-week preparatory program and readiness assessment.",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5 text-impact-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                    label: "Shariah-Literate Professionals",
                    desc: "Graduates who understand the principles of Islamic finance, ethics, and compliance.",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5 text-impact-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    label: "Fast-Track Onboarding",
                    desc: "Our placement team handles matching, briefing, and handoff — so you start on day one.",
                  },
                ].map((card, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white/8 border border-white/10 rounded-[12px] px-5 py-4 backdrop-blur-sm hover:bg-white/12 transition-colors">
                    <span className="flex-shrink-0 w-9 h-9 bg-impact-orange/15 border border-impact-orange/25 rounded-[8px] flex items-center justify-center mt-0.5">
                      {card.icon}
                    </span>
                    <div>
                      <p className="text-white font-bold text-sm mb-0.5">{card.label}</p>
                      <p className="text-white/60 text-xs leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Program Details & FAQs Section */}
      <section id="faq" className="py-12 md:py-24 bg-white border-t border-outline-variant/10">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Frequently Asked Questions</h2>
          </motion.div>

          <div className="flex flex-col gap-4 font-sans">
            {[
              {
                q: "Is the program open to international participants?",
                a: "Yes. The program is open to participants from anywhere in the world."
              },
              {
                q: "How long is the program?",
                a: "The preparatory program runs for four weeks, followed by the assessment and internship placement process."
              },
              {
                q: "Does completing the program guarantee internship placement?",
                a: "The program is structured to ensure that participants who complete the required stages and meet the necessary criteria are considered for internship placement. Participants who are not immediately placed will remain in our talent pool and may be considered as opportunities become available within the industry."
              },
              {
                q: "Will the internship be paid?",
                a: "Internship remuneration depends on the structure and policy of the host organization. However, many internship opportunities may include financial support based on the organization’s specifications."
              },
              {
                q: "How long does the internship last?",
                a: "The duration of the internship depends on the host organization and the requirements of the placement."
              },
              {
                q: "Is prior experience required to apply?",
                a: "No. Prior industry experience is not required. The program is designed to prepare aspiring professionals by providing the knowledge, skills, and workplace readiness needed to begin their journey in the Islamic finance ecosystem."
              },
              {
                q: "Do you have international partners?",
                a: "Yes. We are currently finalizing partnerships with international organizations, which will be onboarded and announced in due course. All confirmed partners will be updated on the website."
              },
              {
                q: "Why is there a program fee?",
                a: "The program fee supports the delivery of the four-week preparatory program, including sessions facilitated by industry experts, professional development, workplace simulations, and participant support. It ensures every participant receives the practical preparation and industry exposure needed for a seamless transition into internship and the professional workplace."
              },
              {
                q: "Is it compulsory to complete the IFIP preparatory program before being considered for internship placement?",
                a: "Yes. Internship placement through IFIP is exclusively available to participants who complete the preparatory program. This enables us to assess each participant’s professional readiness, industry skills, workplace ethics, and performance through our simulations and assessments. It also ensures that the talents we recommend to partner organizations meet the standard of quality, competence, and professionalism expected by the industry."
              }
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-outline-variant/30 rounded-[8px] overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-display font-bold text-primary text-base md:text-lg hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="ml-4 text-primary shrink-0 transition-transform duration-200">
                      {isOpen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </span>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 py-5 text-sm md:text-base text-on-surface-variant leading-relaxed border-t border-outline-variant/10 bg-slate-50/10">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Callout Box */}
      <section className="pb-12 md:pb-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <motion.div
          className="bg-primary text-white rounded-[16px] p-8 md:p-12 lg:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtle background graphic */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(128,216,255,0.1),transparent_40%)]"></div>

          <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl max-w-2xl z-10">
            Begin Your Journey
          </h2>

          <p className="text-body-md text-sky-blue/80 max-w-2xl z-10 leading-relaxed">
            We encourage more individuals looking to build a career in Shariah Compliance and Advisory to apply. This is a great opportunity to grow in the field, and we’d love to have you join us.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 z-10 w-full sm:w-auto mt-4">
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] shadow-lg hover-lift transition-all text-center"
            >
              Join the Next Cohort
            </Link>
            <a
              href={brochureUrl || "/docs/Islamic Finance Internship Preparatory & Placement Program_20260716_181547_0000.pdf"}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 hover:bg-white/10 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] hover-lift transition-all text-center flex items-center justify-center gap-2"
            >
              <HiArrowDownTray className="w-5 h-5" />
              Download Program Guide
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-academic-cream border-t border-outline-variant/30 py-16 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              className="h-10 w-auto object-contain self-start"
            />
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed mt-2">
              The Islamic Finance Internship Program (IFIP) develops industry-ready talent through professional training, practical simulations, and structured internship placement across the ethical finance ecosystem.
            </p>
            <div className="flex items-center gap-3 mt-4 text-on-surface-variant">
              <a
                href="https://www.linkedin.com/company/islamic-finance-internship-program/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors"
                aria-label="LinkedIn"
              >
                <TbBrandLinkedin className="w-4 h-4" />
              </a>
              <a href="https://ifip.nextif.org" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors" aria-label="Website">
                <HiGlobeAlt className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="md:col-span-3">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Program</h4>
            <ul className="flex flex-col gap-3 text-sm text-on-surface-variant">
              <li><a href="#curriculum" className="hover:text-primary transition-colors">Curriculum</a></li>
              <li><a href="#partners" className="hover:text-primary transition-colors">Placement Partners</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Program FAQs</a></li>
              <li><Link href="/partners/apply" className="hover:text-primary transition-colors">Become a Partner</Link></li>
              <li>
                <a
                  href="https://www.linkedin.com/company/islamic-finance-internship-program/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Legal & Inquiries</h4>
            <ul className="flex flex-col gap-3 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 border-t border-outline-variant/30 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div>
            © {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.
          </div>
          <div>
            Headquarters: Financial District, Abuja
          </div>
        </div>
      </footer>
      {/* Sticky Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-outline-variant/30 px-6 py-2 flex items-center justify-between shadow-lg font-sans">
        <Link href="/" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        {isLoggedIn ? (
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Workspace</span>
          </Link>
        ) : (
          <Link href="/apply" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Apply</span>
          </Link>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/modules" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Modules</span>
          </Link>
        ) : (
          <a href="#faq" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">FAQ</span>
          </a>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Profile</span>
          </Link>
        ) : (
          <Link href="/login" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
}
