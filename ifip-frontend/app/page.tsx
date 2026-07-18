// Server Component — no "use client" directive.
// All interactive/stateful parts are isolated in small client components under components/home/.

import Image from "next/image";
import Link from "next/link";
import {
  HiAcademicCap,
  HiSparkles,
  HiCheckCircle,
  HiShare,
  HiGlobeAlt,
  HiArrowDownTray,
  HiArrowTrendingUp,
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

import HomeNav from "@/components/home/HomeNav";
import HeroSection from "@/components/home/HeroSection";
import PlacementsSection from "@/components/home/PlacementsSection";
import PricingSection from "@/components/home/PricingSection";
import PartnersSection from "@/components/home/PartnersSection";
import FaqSection from "@/components/home/FaqSection";
import MobileBottomNav from "@/components/home/MobileBottomNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col pb-16 md:pb-0">

      {/* ── Client: Sticky nav + mobile drawer ── */}
      <HomeNav />

      {/* ── Client: Hero with cohort data + framer motion ── */}
      <HeroSection />

      {/* ── Server: Comprehensive Core Training ── */}
      <section id="curriculum" className="py-12 md:py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Comprehensive Core Training</h2>
            <p className="text-body-md text-on-surface-variant">Our rigorous curriculum ensures you are fully prepared for the most demanding roles.</p>
            <div className="mt-6 flex justify-center">
              <a
                href="/docs/Islamic Finance Internship Preparatory & Placement Program_20260716_181547_0000.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-impact-orange hover:bg-impact-orange/95 text-white font-semibold text-sm px-6 py-3 rounded-[6px] shadow-md hover-lift transition-all inline-flex items-center gap-2 cursor-pointer font-sans"
              >
                <HiArrowDownTray className="w-4 h-4" />
                Download Brochure
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Foundational Knowledge */}
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6">
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
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6">
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
            <div className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 shadow-level1 hover:shadow-md transition-all flex flex-col gap-6">
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

      {/* ── Client: Placements & Openings (live data + tab toggle) ── */}
      <PlacementsSection />

      {/* ── Server: Who Can Apply ── */}
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
          <div>
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">
              Who Can Apply?
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed">
              The program welcomes ambitious minds from anywhere in the world looking to make a career impact in the ethical finance and business ecosystem. You are welcome to apply if you belong to one of these groups:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <HiAcademicCap className="w-8 h-8" />,
                title: "Students",
                desc: "Current undergraduate and postgraduate students enrolled in recognized institutions preparing for career opportunities."
              },
              {
                icon: <TbAward className="w-8 h-8" />,
                title: "Graduates",
                desc: "Graduates from recognized institutions seeking to develop relevant knowledge, skills, and career pathways in ethical industries."
              },
              {
                icon: <HiArrowTrendingUp className="w-8 h-8" />,
                title: "Professionals",
                desc: "Working professionals seeking to deepen their Shariah finance expertise, expand their network, and secure advanced roles in premium ethical institutions."
              },
              {
                icon: <HiSparkles className="w-8 h-8" />,
                title: "Aspiring",
                desc: "Individuals from non-finance backgrounds (such as Tech, Law, or Administration) looking to pivot their existing skills into the ethical finance and fintech ecosystem."
              }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-outline-variant/30 rounded-[12px] p-5 md:p-8 hover:shadow-lg transition-all flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-primary/5 rounded-full text-primary">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold font-display text-primary">{card.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Client: Pricing (requires geolocation) ── */}
      <PricingSection />

      {/* ── Server: Bridge the Gap Banner ── */}
      <section className="py-10 md:py-20 bg-academic-cream">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="bg-vibrant-blue text-white rounded-[24px] px-6 py-12 md:py-16 text-center shadow-lg relative overflow-hidden flex flex-col items-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_50%)]"></div>

            <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl mb-4 z-10 font-bold">
              Bridge the Gap
            </h2>
            <p className="text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-12 leading-relaxed z-10 font-sans">
              Our mission is to transform academic potential into industry-ready excellence through three core values.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl justify-center items-start z-10">
              {[
                {
                  icon: <TbUserCog className="w-8 h-8 text-white" />,
                  title: "Talent",
                  desc: "Identifying and nurturing promising minds passionate about Shariah-compliant finance and ethical economy."
                },
                {
                  icon: <TbRefresh className="w-8 h-8 text-white" />,
                  title: "Development",
                  desc: "Providing rigorous core training, professional identity workshops, simulations, and career readiness."
                },
                {
                  icon: <TbBriefcase className="w-8 h-8 text-white" />,
                  title: "Placement",
                  desc: "Connecting qualified graduates and professionals with premier partner institutions for real-world internship exposure."
                }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 bg-white/10 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center">
                    {item.icon}
                  </div>
                  <h4 className="text-base font-bold text-white leading-tight">{item.title}</h4>
                  <p className="text-xs text-white/80 leading-relaxed font-sans max-w-[220px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Server: Application & Placement Journey ── */}
      <section id="process" className="py-12 md:py-24 bg-white border-y border-outline-variant/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Application &amp; Placement Journey</h2>
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
              <div
                key={i}
                className="bg-white border border-outline-variant/30 rounded-[12px] p-6 flex flex-col items-start gap-4 hover:shadow-md transition-all text-left font-sans"
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

      {/* ── Client: Partners (live data) ── */}
      <PartnersSection />

      {/* ── Server: Become a Partner CTA ── */}
      <section className="py-8 pb-12 md:pb-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="relative rounded-[20px] overflow-hidden bg-primary shadow-2xl">
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
                Partner organizations gain access to a curated pool of pre-trained, Shariah-literate interns who are job-ready from day one. Whether you&apos;re a bank, advisory firm, or fintech — IFIP makes it effortless.
              </p>

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
        </div>
      </section>

      {/* ── Client: FAQ accordion (toggle state) ── */}
      <FaqSection />

      {/* ── Server: Bottom CTA ── */}
      <section className="pb-12 md:pb-24 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="bg-primary text-white rounded-[16px] p-8 md:p-12 lg:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(128,216,255,0.1),transparent_40%)]"></div>

          <h2 className="text-headline-lg font-display text-white text-3xl md:text-4xl max-w-2xl z-10">
            Begin Your Journey
          </h2>

          <p className="text-body-md text-sky-blue/80 max-w-2xl z-10 leading-relaxed">
            We encourage more individuals looking to build a career in Shariah Compliance and Advisory to apply. This is a great opportunity to grow in the field, and we&apos;d love to have you join us.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 z-10 w-full sm:w-auto mt-4">
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] shadow-lg hover-lift transition-all text-center"
            >
              Join the Next Cohort
            </Link>
            <a
              href="/docs/Islamic Finance Internship Preparatory & Placement Program_20260716_181547_0000.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 hover:bg-white/10 text-white font-semibold text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 rounded-[4px] hover-lift transition-all text-center flex items-center justify-center gap-2"
            >
              <HiArrowDownTray className="w-5 h-5" />
              Download Program Guide
            </a>
          </div>
        </div>
      </section>

      {/* ── Server: Footer ── */}
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
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Legal &amp; Inquiries</h4>
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

      {/* ── Client: Fixed mobile bottom nav (login state) ── */}
      <MobileBottomNav />
    </div>
  );
}
