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
  TbDeviceLaptop
} from "react-icons/tb";
import apiClient from "@/lib/api/client";
import { getActivePartners } from "@/lib/api/services";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activePlacementsTab, setActivePlacementsTab] = useState<"opportunities" | "jobs">("opportunities");
  const [isNigeria, setIsNigeria] = useState<boolean | null>(null);
  const [cohortName, setCohortName] = useState("September 2026");

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
        if (data && data.hasActiveCohort && data.cohortName) {
          setCohortName(data.cohortName);
        }
      } catch (err) {
        console.error("Failed to fetch registration status name:", err);
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

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col pb-16 md:pb-0">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          {/* Mobile-only Left: Hamburger and Logo */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:text-primary"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <HiXMark className="w-6 h-6" /> : <HiBars3 className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logos/logo-full-color.png"
                alt="IFIP Logo"
                width={120}
                height={33}
                priority
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop-only Left: Logo */}
          <Link href="/" className="hidden md:flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-10 w-auto object-contain"
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

          {/* Mobile-only Right: User Profile Avatar */}
          <div className="flex md:hidden items-center">
            <Link href="/login" aria-label="User Profile">
              <div className="w-9 h-9 rounded-full bg-[#000666]/10 border border-[#000666]/20 flex items-center justify-center text-primary font-bold text-sm hover:bg-[#000666]/20 transition-colors">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </Link>
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
      <section className="py-12 md:py-20 max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2.5 bg-[#e8e8ed] px-4 py-2 rounded-full w-max text-sm font-semibold text-primary font-sans">
            <HiOutlineShieldCheck className="w-5 h-5 text-primary stroke-[2]" />
            Islamic Finance Internship Preparatory and Placement Program
          </div>

          <h1 className="text-display-lg text-primary leading-tight text-3xl sm:text-5xl lg:text-6xl font-bold font-display">
            Master & Practice<br />
            Islamic Finance.<br />
            <span className="text-vibrant-blue italic font-serif">Put your talent into action.</span>
          </h1>

          <p className="text-body-lg text-on-surface-variant max-w-xl">
            Join our intensive program designed to equip you with the essential skills, knowledge, and hands-on experience to excel in the global Islamic finance and ethical business ecosystem.
          </p>

          {/* Mobile Hero Checklist */}
          <div className="flex md:hidden flex-col gap-3 bg-[#e8e8ed]/40 border border-[#e8e8ed] rounded-xl p-4 w-full font-sans text-sm font-semibold text-primary">
            {[
              "4-Week Intensive Training",
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
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-base py-4 px-8 rounded-[4px] text-center shadow-level1 hover-lift flex items-center justify-center gap-2 transition-all"
            >
              Apply for Program
              <HiArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="/documents/IFIP_Program_Guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-primary text-primary hover:bg-primary/5 font-semibold text-base py-4 px-8 rounded-[4px] text-center hover-lift flex items-center justify-center gap-2 transition-all bg-white"
            >
              Download Program Guide
            </a>
          </div>
        </div>

        {/* Right side Video/Media Card */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
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
                <span className="text-xs uppercase font-bold text-on-surface-variant tracking-wider block">Next Cohort Session</span>
                <span className="font-semibold text-primary text-sm">{cohortName}</span>
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
        </div>
      </section>

      {/* Comprehensive Core Training Section */}
      <section id="curriculum" className="py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-label-md text-vibrant-blue uppercase tracking-widest block mb-2">Curriculum</span>
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Comprehensive Core Training</h2>
            <p className="text-body-md text-on-surface-variant">Our rigorous curriculum ensures you are fully prepared for the most demanding roles.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Foundational Knowledge */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 shadow-level1 hover-lift transition-all flex flex-col gap-6">
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
            </div>

            {/* Card 2: Professional Identity */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 shadow-level1 hover-lift transition-all flex flex-col gap-6">
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
            </div>

            {/* Card 3: Practical Execution */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 shadow-level1 hover-lift transition-all flex flex-col gap-6">
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
            </div>
          </div>
        </div>
      </section>

      {/* Placements & Opportunities Section */}
      <section id="sectors" className="py-24 bg-background border-b border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-label-md text-vibrant-blue uppercase tracking-widest block mb-2">Placements</span>
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Internships & Active Openings</h2>
            <p className="text-body-md text-on-surface-variant font-sans">
              Explore internship pathways and currently active role openings across our partner network.
            </p>
          </div>

          {/* Interactive Tabs Header */}
          <div className="flex justify-center mb-12 font-sans">
            <div className="bg-[#e8e8ed] p-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm border border-outline-variant/20">
              <button
                onClick={() => setActivePlacementsTab("opportunities")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${activePlacementsTab === "opportunities"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant/80 hover:text-primary"
                  }`}
              >
                Placement Opportunities
              </button>
              <button
                onClick={() => setActivePlacementsTab("jobs")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${activePlacementsTab === "jobs"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant/80 hover:text-primary"
                  }`}
              >
                Active Openings
              </button>
            </div>
          </div>

          {/* Active Tab Content */}
          {activePlacementsTab === "opportunities" ? (
            <div>
              {/* Opportunities Header Text */}
              <div className="text-center mb-8 font-sans">
                <p className="text-sm font-semibold text-primary/80">Opportunities across a wide range of industries for selected and high-performing participants.</p>
              </div>

              {/* 11 Categories grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    category: "Islamic Finance & Investment",
                    roles: ["Islamic Finance Analyst", "Investment Research Assistant", "Sukuk Research Intern", "Wealth Management Support Intern"],
                    icon: TbActivity
                  },
                  {
                    category: "Shariah, Advisory & Legal",
                    roles: ["Shariah Advisory Support Intern", "Compliance Support Intern", "Legal & Compliance Intern"],
                    icon: TbScale
                  },
                  {
                    category: "Business & Strategy",
                    roles: ["Business Development Intern", "Strategy Support Intern", "Operations Intern"],
                    icon: TbBriefcase
                  },
                  {
                    category: "Customer & Client Services",
                    roles: ["Customer Support Intern", "Client Relationship Intern"],
                    icon: TbUserCog
                  },
                  {
                    category: "Marketing & Communications",
                    roles: ["Digital Marketing Intern", "Social Media Manager Intern", "Brand Communications Intern"],
                    icon: TbMessage
                  },
                  {
                    category: "Content & Media",
                    roles: ["Content Writer Intern", "Copywriting Intern", "Editorial Assistant Intern"],
                    icon: TbWriting
                  },
                  {
                    category: "Creative Design",
                    roles: ["Graphic Design Intern", "UI/UX Design Support Intern", "Visual Content Creator Intern", "Product Design Intern"],
                    icon: TbSearch
                  },
                  {
                    category: "Technology & Product",
                    roles: ["Fintech Product Support Intern", "Product Research Intern", "Data Support Intern"],
                    icon: TbDeviceLaptop
                  },
                  {
                    category: "Research & Policy",
                    roles: ["Research Assistant Intern", "Policy & Industry Research Intern"],
                    icon: TbSearch
                  },
                  {
                    category: "Human Capital",
                    roles: ["HR Support Intern", "Talent Coordination Intern"],
                    icon: TbUserCog
                  },
                  {
                    category: "Events & Community",
                    roles: ["Event Coordination Intern", "Community Engagement Intern"],
                    icon: TbHeartHandshake
                  }
                ].map((opp, i) => {
                  const IconComponent = opp.icon;
                  return (
                    <div
                      key={i}
                      className="bg-white border border-outline-variant/20 rounded-[12px] p-6 hover:shadow-md hover-lift transition-all flex flex-col items-start gap-4 text-left font-sans"
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
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              {/* Active Jobs Header Text */}
              <div className="text-center mb-8 font-sans">
                <p className="text-sm font-semibold text-primary/80">Active internship and full-time vacancies currently open with our ecosystem partners.</p>
              </div>

              {/* Jobs grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {[
                  { dept: "Marketing & Communications", pos: "Digital Marketing Intern", mode: "Hybrid", loc: "Hybrid" },
                  { dept: "Marketing & Communications", pos: "Social Media Manager Intern", mode: "Hybrid", loc: "Kano" },
                  { dept: "Marketing & Communications", pos: "Community Manager (Full-time)", mode: "Remote", loc: "Lagos" },
                  { dept: "Marketing & Communications", pos: "Brand Communications Intern", mode: "Remote", loc: "Remote" },
                  { dept: "Creative Design", pos: "Graphic Design Intern", mode: "Hybrid", loc: "Kano" },
                  { dept: "Creative Design", pos: "UI/UX Design Support Intern", mode: "Remote", loc: "Remote" },
                  { dept: "Creative Design", pos: "Visual Content Creator Intern", mode: "Hybrid", loc: "Hybrid" },
                  { dept: "Creative Design", pos: "Product Design Intern", mode: "Remote", loc: "Remote" },
                  { dept: "Fund Management", pos: "Investment Research Intern", mode: "Remote", loc: "Lagos" },
                  { dept: "Legal & Shariah", pos: "Legal and Compliance Intern", mode: "On-site", loc: "Lagos & Abuja" }
                ].map((job, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-outline-variant/30 rounded-xl p-6 flex flex-col justify-between hover:shadow-md hover-lift transition-all"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-vibrant-blue tracking-wider block mb-2">{job.dept}</span>
                      <h3 className="text-base font-bold text-primary font-display mb-4 min-h-[48px] flex items-center">{job.pos}</h3>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${job.mode === "Remote" ? "bg-sky-500/10 text-sky-600" :
                            job.mode === "Hybrid" ? "bg-emerald-500/10 text-emerald-600" :
                              "bg-amber-500/10 text-amber-600"
                          }`}>
                          {job.mode}
                        </span>
                        {job.loc && job.loc !== "-" && (
                          <span className="text-xs text-on-surface-variant font-medium">{job.loc}</span>
                        )}
                      </div>

                      <Link
                        href="/apply"
                        className="text-xs font-bold text-primary hover:text-vibrant-blue transition-colors flex items-center gap-1"
                      >
                        Apply via Program &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Who Can Apply Section */}
      <section className="py-24 bg-white relative flex flex-col items-center border-b border-outline-variant/10">
        {/* Overlapping Badge */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <Link
            href="#curriculum"
            className="inline-flex items-center justify-center bg-white border border-vibrant-blue/20 hover:border-vibrant-blue text-vibrant-blue font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all"
          >
            Learn More About Our Mission
          </Link>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 md:px-8 w-full text-center mt-6">
          <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">
            Who Can Apply?
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed">
            IFIP is open to ambitious individuals looking to make a career impact in the ethical finance and business ecosystem.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Students Card */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 hover:shadow-lg hover-lift transition-all flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiAcademicCap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Students
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Current undergraduate and postgraduate students enrolled in recognized institutions preparing for career opportunities.
              </p>
            </div>

            {/* Graduates Card */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 hover:shadow-lg hover-lift transition-all flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <TbAward className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Graduates
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Graduates from recognized institutions seeking to develop relevant knowledge, skills, and career pathways in ethical industries.
              </p>
            </div>

            {/* Professionals Card */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 hover:shadow-lg hover-lift transition-all flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiArrowTrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Professionals
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Early-career professionals looking to enhance their expertise or transition into Islamic finance, fintech, and other ethical sectors.
              </p>
            </div>

            {/* Aspiring Card */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-8 hover:shadow-lg hover-lift transition-all flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-primary/5 rounded-full text-primary">
                <HiSparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                Aspiring
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Individuals interested in exploring career opportunities within Islamic finance and related ethical economy industries.
              </p>
            </div>
          </div>

          {/* Ineligible Bar */}
          <div className="max-w-[1280px] w-full mx-auto mt-12">
            <div className="bg-[#000666] text-white p-4 rounded-[8px] flex items-center justify-between text-left gap-4 font-sans">
              <span className="text-sm font-semibold leading-relaxed">
                <strong>Who is not eligible?</strong> Applications from individuals who do not meet our entry requirements or target profile will not be processed.
              </span>
            </div>
          </div>
        </div>
      </section>
      {/* Program Fee Section */}
      <section className="py-24 bg-background border-b border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center w-full">
          <span className="text-label-md text-impact-orange uppercase tracking-widest block mb-2">Registration</span>
          <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Program Fee</h2>
          <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed font-sans">
            To become part of the Islamic Finance Internship Program, applicants are required to complete the registration fee as part of the admission process.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 max-w-3xl mx-auto w-full font-sans">
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
                <p className="text-xs text-on-surface-variant leading-relaxed text-center">
                  Grants full access to the complete program experience, including training, simulations, assessment, and internship placement opportunities.
                </p>
              </div>
            ) : (
              /* International Pricing Card */
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 flex-1 w-full max-w-sm hover:shadow-md hover-lift transition-all flex flex-col items-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Program Commitment Levy</span>
                <span className="text-4xl font-display font-black text-primary mb-6">$30</span>
                <p className="text-xs text-on-surface-variant leading-relaxed text-center">
                  Grants full access to the complete program experience, including training, simulations, assessment, and internship placement opportunities.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bridge the Gap Section Banner */}
      <section className="py-20 bg-academic-cream">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="bg-vibrant-blue text-white rounded-[24px] px-6 py-12 md:py-16 text-center shadow-lg relative overflow-hidden flex flex-col items-center">
            {/* Subtle background overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_50%)]"></div>

            <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl mb-4 z-10 font-bold">
              Bridge the Gap
            </h2>
            <p className="text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-12 leading-relaxed z-10 font-sans">
              Our mission is to transform academic potential into industry-ready excellence through three core values.
            </p>

            {/* Three Core Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl justify-center items-start z-10">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbUserCog className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Talent
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Identifying and nurturing promising minds passionate about Shariah-compliant finance and ethical economy.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbRefresh className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Development
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Providing rigorous core training, professional identity workshops, simulations, and career readiness.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                  <TbBriefcase className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Placement
                </h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">
                  Connecting qualified graduates and professionals with premier partner institutions for real-world internship exposure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application & Placement Journey Section */}
      <section id="process" className="py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-label-md text-vibrant-blue uppercase tracking-widest block mb-2">Process</span>
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Application & Placement Journey</h2>
            <p className="text-body-md text-on-surface-variant">Our step-by-step selection and placement process.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
                title: "Ready Evaluation",
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
              <div
                key={i}
                className="bg-white border border-outline-variant/30 rounded-[12px] p-6 flex flex-col items-start gap-4 hover:shadow-md hover-lift transition-all text-left font-sans"
              >
                <div className="w-10 h-10 bg-[#000666] text-white font-bold flex items-center justify-center rounded-[4px] text-lg">
                  {journey.step}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary font-display mb-2">{journey.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{journey.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Partners for Placement Section */}
      <section id="partners" className="py-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-label-md text-impact-orange uppercase tracking-widest block mb-2">Ecosystem</span>
          <h2 className="text-headline-lg text-primary font-display text-3xl">Institutional Partners for Placement</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 items-center justify-items-center">
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

            if (partner.website) {
              return (
                <a
                  key={i}
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-[220px] block cursor-pointer"
                >
                  {CardContent}
                </a>
              );
            }

            return (
              <div key={i} className="w-full max-w-[220px]">
                {CardContent}
              </div>
            );
          })}
        </div>
      </section>
      {/* Program Details & FAQs Section */}
      <section id="faq" className="py-24 bg-white border-t border-outline-variant/10">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-label-md text-vibrant-blue uppercase tracking-widest block mb-2">Information</span>
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Frequently Asked Questions</h2>
          </div>

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
              }
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-outline-variant/30 rounded-[8px] overflow-hidden transition-all duration-200"
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
                    className={`transition-all duration-200 ease-in-out overflow-hidden ${isOpen ? "max-h-[500px] border-t border-outline-variant/10" : "max-h-0"
                      }`}
                  >
                    <div className="px-6 py-5 text-sm md:text-base text-on-surface-variant leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Callout Box */}
      <section className="pb-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="bg-primary text-white rounded-[16px] p-8 md:p-12 lg:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden shadow-xl">
          {/* Subtle background graphic */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(128,216,255,0.1),transparent_40%)]"></div>

          <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl max-w-2xl z-10">
            Begin Your Journey
          </h2>

          <p className="text-body-md text-sky-blue/80 max-w-xl z-10">
            This program is more than training—it is a bridge into real opportunities, industry exposure, and career development in Islamic finance and the ethical economy.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 z-10 w-full sm:w-auto mt-4">
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold py-4 px-8 rounded-[4px] shadow-lg hover-lift transition-all text-center"
            >
              Apply for Program
            </Link>
            <a
              href="/documents/IFIP_Program_Guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 hover:bg-white/10 text-white font-semibold py-4 px-8 rounded-[4px] hover-lift transition-all text-center flex items-center justify-center gap-2"
            >
              <HiArrowDownTray className="w-5 h-5" />
              Download Program Guide
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-academic-cream border-t border-outline-variant/30 py-16 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-12">
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
              The Islamic Finance Internship Program (IFIP) provides rigorous academic training and professional placement for ethical finance leaders.
            </p>
            <div className="flex items-center gap-3 mt-4 text-on-surface-variant">
              <a href="#" className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors" aria-label="Social Share">
                <HiShare className="w-4 h-4" />
              </a>
              <a href="https://ifip.ng" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors" aria-label="Website">
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
              <li><a href="#curriculum" className="hover:text-primary transition-colors">Program FAQs</a></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Legal & Inquiries</h4>
            <ul className="flex flex-col gap-3 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="/login" className="hover:text-primary transition-colors">Partner Login</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 border-t border-outline-variant/30 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div>
            © {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.
          </div>
          <div>
            Headquarters: Financial District, Lagos
          </div>
        </div>
      </footer>
      {/* Sticky Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-outline-variant/30 px-6 py-2 flex items-center justify-between shadow-lg font-sans">
        <Link href="/" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        <Link href="/apply" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Apply</span>
        </Link>
        <a href="#faq" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">FAQ</span>
        </a>
        <Link href="/login" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Profile</span>
        </Link>
      </div>
    </div>
  );
}
