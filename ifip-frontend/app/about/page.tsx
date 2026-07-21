"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HiBars3,
  HiXMark,
  HiArrowRight,
  HiCheckCircle,
  HiArrowDownTray,
  HiOutlineShieldCheck
} from "react-icons/hi2";
import { TbBrandLinkedin } from "react-icons/tb";
import apiClient from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth";
import { motion } from "framer-motion";
import UserAvatarMenu from "@/components/UserAvatarMenu";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

export default function AboutIfipPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brochureUrl, setBrochureUrl] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNigeria, setIsNigeria] = useState<boolean | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  useEffect(() => {
    const fetchCohortStatus = async () => {
      try {
        const { data } = await apiClient.get("/cohort/registration-status");
        if (data && data.brochureUrl) {
          setBrochureUrl(data.brochureUrl);
        }
      } catch (err) {
        console.error("Failed to fetch registration config:", err);
      }
    };
    fetchCohortStatus();
  }, []);

  useEffect(() => {
    const detectIp = async () => {
      try {
        const res = await fetch("/api/geolocation");
        const data = await res.json();
        if (data && data.countryCode) {
          setIsNigeria(data.countryCode === "NG");
        } else {
          setIsNigeria(true); // Default fallback
        }
      } catch (err) {
        console.error("IP detection failed:", err);
        setIsNigeria(true); // Default fallback
      }
    };
    detectIp();
  }, []);

  const fallbackBrochureUrl = "/docs/Islamic Finance Internship Preparatory & Placement Program_20260716_181547_0000.pdf";
  const activeBrochureUrl = brochureUrl || fallbackBrochureUrl;

  const partnerInstitutions = [
    "Stecs", "Halvest", "Ethical Capita", "EthicalVest", "IFING Media",
    "MTeach", "Infaq.ng", "One17 Capital", "Bas Financial Services", "The Metropolitan Law Firm"
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-on-surface flex flex-col pb-16 md:pb-0">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-3 md:px-8 h-20 flex items-center justify-between">
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

          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <Link href="/" className="text-on-surface/80 hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="text-primary hover:text-primary transition-colors border-b-2 border-primary pb-1">About Program</Link>
            <Link href="/#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <UserAvatarMenu dropDirection="down" />
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
                  Login
                </Link>
                <Link
                  href="/apply"
                  className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all"
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>

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
        <div className="fixed inset-0 top-20 z-45 bg-[#FDFBF7] md:hidden flex flex-col px-6 py-8 border-t border-outline-variant/30 gap-6">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">
            Home
          </Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">
            About Program
          </Link>
          <Link href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">
            FAQ
          </Link>
          <div className="flex flex-col gap-4 mt-6">
            {isLoggedIn ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-center font-semibold bg-primary text-white py-3 rounded-[4px]">
                Go to Dashboard
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#000666]/5 to-transparent py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center flex flex-col items-center gap-6">
          <motion.div
            className="inline-flex items-center gap-2 bg-[#000666]/5 border border-[#000666]/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#000666]"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <HiOutlineShieldCheck className="w-4 h-4 text-vibrant-blue shrink-0" />
            <span>Islamic Finance Internship Program</span>
          </motion.div>

          <motion.h1
            className="text-primary text-3xl sm:text-4xl md:text-5xl font-extrabold font-display leading-tight tracking-tight max-w-3xl"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            Master Islamic Finance. Develop Industry-Ready Skills.{" "}
            <span className="text-impact-orange block sm:inline">Launch Your Career.</span>
          </motion.h1>

          <motion.p
            className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            IFIP bridges the gap between academic theory and real-world employment by providing foundational training, skill-building simulations, and internship placement matches with top partner institutions.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full justify-center"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm py-3 px-8 rounded-[4px] shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto hover-lift transition-all"
            >
              Apply for Program
              <HiArrowRight className="w-4.5 h-4.5" />
            </Link>
            <a
              href={activeBrochureUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-primary text-primary hover:bg-primary/5 font-semibold text-sm py-3 px-8 rounded-[4px] flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs hover-lift transition-all"
            >
              <HiArrowDownTray className="w-4.5 h-4.5 text-impact-orange" />
              Download Brochure
            </a>
          </motion.div>
        </div>
      </section>

      {/* Concise Program Details */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-[960px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-extrabold text-[#000666] font-display mb-4">
                About the Program
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                The <strong>Islamic Finance Internship Program (IFIP)</strong> is a structured career acceleration pathway designed specifically for students, recent graduates, and early-career professionals.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                By combining intensive theoretical instruction, practical workplace ethics, real-world finance task simulations, and evaluation assessments, IFIP equips you to hit the ground running upon internship match placement.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
              <h3 className="font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-wider">
                Core Focus Modules
              </h3>
              <ul className="space-y-3">
                {[
                  "Islamic banking & financial ecosystem principles",
                  "Ethical workspace code and Shariah compliance",
                  "Islamic Fintech platforms and digital solutions",
                  "CV formulation, LinkedIn branding & interview prep",
                  "Project execution & real-world task simulations"
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-xs text-slate-600 font-medium">
                    <HiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Learning Journey Timeline */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <h2 className="text-2xl font-extrabold text-[#000666] font-display text-center mb-10">
            Learning Journey Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: "1", title: "Apply & Screen", desc: "Submit your details, verify your profile metrics, and secure admission." },
              { step: "2", title: "Core Prep Training", desc: "4-week curriculum covering Islamic finance principles, ethics, and simulations." },
              { step: "3", title: "Evaluation Check", desc: "Complete performance assessments evaluating your knowledge and readiness." },
              { step: "4", title: "Internship Matching", desc: "Match with one of our specialized partners based on vacancy and skills." },
              { step: "5", title: "Gain Work Placement", desc: "Begin your practical role, obtaining direct mentorship and industry exposure." }
            ].map((step, i) => (
              <div key={i} className="bg-white border border-slate-100 p-5 rounded-lg flex flex-col gap-2 relative">
                <span className="text-3xl font-black text-slate-100/80 absolute top-2 right-3">{step.step}</span>
                <h3 className="font-bold text-slate-800 text-sm font-display pr-6">{step.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Can Apply & Commitment Levy */}
      <section className="py-16 bg-white">
        <div className="max-w-[960px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-[#000666] font-display mb-4">
                Eligibility & Who Can Apply
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                The program is open to undergraduate/postgraduate university students (including penultimate and final-year), recent graduates, and early-career transitioners looking to enter ethical industries.
              </p>
              <div className="space-y-3">
                {[
                  "Enrolled or graduated from a recognized higher institution",
                  "Passionate about ethical economy & Islamic finance",
                  "Willing to undergo performance training and evaluations"
                ].map((text, i) => (
                  <div key={i} className="flex gap-2 text-xs font-semibold text-slate-700">
                    <HiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#000666]/5 border border-[#000666]/10 p-6 rounded-xl flex flex-col items-center justify-center min-h-[220px] w-full text-center">
              <span className="text-[10px] font-black uppercase text-[#FF9800] tracking-wider mb-2">Registration levy</span>
              <h3 className="font-bold text-[#000666] text-lg font-display mb-4">Program Commitment Levy</h3>
              
              {isNigeria === null ? (
                <div className="animate-pulse flex flex-col items-center gap-2 w-full">
                  <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 mt-2"></div>
                </div>
              ) : isNigeria ? (
                <>
                  <span className="text-4xl font-display font-black text-[#000666] mb-3">₦20,000</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-display font-black text-[#000666] mb-3">$30</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom brochure call to action banner */}
      <section className="py-12 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="bg-[#000666] text-white rounded-xl p-8 md:p-10 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_50%)]" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display mb-3 z-10">
              Get Started with IFIP Today
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed mb-6 z-10">
              Obtain the core readiness training and secure potential internship matches across our partner institutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center z-10">
              <Link
                href="/apply"
                className="bg-impact-orange hover:bg-impact-orange/90 text-white font-bold py-3 px-8 rounded-[4px] shadow-sm text-sm"
              >
                Apply for Program
              </Link>
              <a
                href={activeBrochureUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border border-white/20 hover:bg-white/15 text-white font-bold py-3 px-8 rounded-[4px] shadow-xs text-sm"
              >
                Download Curriculum Brochure
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 flex flex-col gap-4">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={140}
              height={38}
              className="h-9 w-auto object-contain self-start"
            />
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
              Empowering the next generation of leaders in ethical and Islamic finance through structured training and matching placements.
            </p>
          </div>
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Connect</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-500">
              <li>Email: <a href="mailto:ifip.program@gmail.com" className="hover:text-primary transition-colors">ifip.program@gmail.com</a></li>
              <li>
                <a
                  href="https://www.linkedin.com/company/islamic-finance-internship-program/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors inline-flex items-center gap-1 text-sky-700"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Legal</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-500">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 md:px-8 border-t border-slate-100 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>© {new Date().getFullYear()} IFIP. All rights reserved.</div>
          <div>Headquarters: Financial District, Abuja</div>
        </div>
      </footer>
    </div>
  );
}
