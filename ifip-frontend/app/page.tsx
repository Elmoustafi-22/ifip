import Image from "next/image";
import Link from "next/link";
import {
  TbArrowUpRight, TbArrowsExchange, TbAward, TbBook, TbBrandLinkedin,
  TbBrandWhatsapp, TbBriefcase, TbDownload, TbMail, TbMapPin,
  TbSchool, TbSparkles, TbUser, TbUserCog,
} from "react-icons/tb";
import HomeNav from "@/components/home/HomeNav";
import HomepageReveal from "@/components/home/HomepageReveal";
import HeroSection from "@/components/home/HeroSection";
import PlacementsSection from "@/components/home/PlacementsSection";
import PricingSection from "@/components/home/PricingSection";
import PartnersSection from "@/components/home/PartnersSection";
import FaqSection from "@/components/home/FaqSection";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import { programCertificate } from "@/components/home/program-certificate";
import "@/components/home/homepage.css";

const guide = "/docs/IFIPP_Program_Pamphlet.pdf";
const email = "ifip.program@gmail.com";

const curriculum = [
  {
    title: "Foundational knowledge",
    icon: TbBook,
    topics: ["Introduction to Islamic finance principles and ecosystem", "Fintech and digital innovation", "Islamic finance ethics and professional conduct (Adab of work)", "Career pathways in the ethical economy"],
  },
  {
    title: "Professional identity",
    icon: TbUserCog,
    topics: ["Workplace professionalism and leadership", "Written, verbal and corporate communication", "CV building and LinkedIn optimization", "Personal branding and identity"],
  },
  {
    title: "Practical execution",
    icon: TbBriefcase,
    topics: ["Research and analytical thinking in finance", "Project execution and real-world simulations", "Industry tools, digital skills and productivity", "Internship orientation and expectations"],
  },
  {
    title: "AI for Effective Workplace Practice",
    icon: TbSparkles,
    topics: [
      "Create and improve professional work deliverables with AI.",
      "Use AI for research, writing, analysis and other workplace activities.",
      "Verify AI outputs, protect information and maintain professional judgement.",
    ],
  },
];

const applicants = [
  { title: "Students", icon: TbSchool, detail: "Undergraduates and postgraduates enrolled in recognized institutions and preparing for a career." },
  { title: "Graduates", icon: TbAward, detail: "Graduates of recognized institutions building knowledge and skills for the ethical economy." },
  { title: "Professionals", icon: TbBriefcase, detail: "Working professionals deepening their Shariah finance expertise and expanding their career opportunities." },
  { title: "Career changers", icon: TbArrowsExchange, detail: "People bringing skills from fields such as technology, law or administration into ethical finance." },
];

const mission = [
  { title: "Talent", icon: TbUser, detail: "Identify and prepare aspiring professionals for a career in Islamic finance." },
  { title: "Development", icon: TbBook, detail: "Build knowledge and workplace skills through structured learning and practical simulations." },
  { title: "Placement", icon: TbBriefcase, detail: "Connect qualified participants with opportunities through partner organizations." },
];

const journey = [
  { title: "Application & admission", detail: "Apply and complete the admission requirements to join the cohort." },
  { title: "Preparatory program", detail: "Complete four weeks of training covering Islamic finance, professional skills, ethics and simulations." },
  { title: "Evaluation", detail: "Demonstrate your Shariah knowledge and readiness for placement." },
  { title: "Internship placement", detail: "Qualified participants are considered for opportunities with partner organizations based on industry needs." },
  { title: "Industry experience", detail: "Participants who secure a placement apply their knowledge in the workplace." },
];

const contacts = [
  { label: "WhatsApp support", icon: TbBrandWhatsapp, href: "https://wa.me/2349060356610", external: true },
  { label: "Email support", icon: TbMail, href: `mailto:${email}` },
  { label: "LinkedIn", icon: TbBrandLinkedin, href: "https://www.linkedin.com/company/islamic-finance-internship-program/", external: true },
];

function ProgramGuide() {
  return <a className="ifip-home-text-link" href={guide} target="_blank" rel="noopener noreferrer"><TbDownload aria-hidden="true" /> Download program guide</a>;
}

export default function Home() {
  return (
    <div className="ifip-home">
      <HomeNav />
      <HeroSection />

      <section id="curriculum" className="ifip-home-section ifip-home-white" aria-labelledby="curriculum-title">
        <div className="ifip-home-wrap">
          <HomepageReveal className="ifip-home-section-intro">
            <p className="ifip-home-eyebrow">Curriculum</p>
            <h2 id="curriculum-title">What you’ll learn</h2>
            <p>The core training combines Islamic finance, professional development and workplace practice.</p>
            <ProgramGuide />
          </HomepageReveal>
          <div className="ifip-home-cards ifip-home-curriculum-cards">
            {curriculum.map(({ icon: Icon, title, topics }, index) => (
              <HomepageReveal as="article" className="ifip-home-card" key={title} delay={index * 0.06}>
                <header className="ifip-home-curriculum-heading">
                  <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                </header>
                <ul className="ifip-home-curriculum-list">{topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
              </HomepageReveal>
            ))}
          </div>
          <HomepageReveal as="article" className="ifip-home-card ifip-home-curriculum-certificate">
            <span className="ifip-home-icon"><programCertificate.icon aria-hidden="true" /></span>
            <div>
              <h3>{programCertificate.title}</h3>
              <p>{programCertificate.detail}</p>
              <p className="ifip-home-curriculum-certificate-detail">Awarded after the 4-week training and required before joining the talent pool. Shows partners you are internship ready.</p>
            </div>
          </HomepageReveal>
        </div>
      </section>

      <PlacementsSection />

      <section className="ifip-home-section" aria-labelledby="eligibility-title">
        <div className="ifip-home-wrap ifip-home-section-grid">
          <HomepageReveal className="ifip-home-section-intro">
            <h2 id="eligibility-title">Who can apply?</h2>
            <p>IFIP welcomes applicants from anywhere in the world. Prior industry experience is optional.</p>
            <Link className="ifip-home-text-link" href="/about">Learn about IFIP <TbArrowUpRight aria-hidden="true" /></Link>
          </HomepageReveal>
          <div className="ifip-home-eligibility">
            {applicants.map(({ icon: Icon, title, detail }, index) => (
              <HomepageReveal as="article" className="ifip-home-card" key={title} delay={(index % 2) * 0.06}>
                <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </HomepageReveal>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="ifip-home-section ifip-home-dark" aria-labelledby="mission-title">
        <div className="ifip-home-wrap">
          <HomepageReveal className="ifip-home-section-intro">
            <h2 id="mission-title">Bridge the gap</h2>
            <p>IFIP connects academic preparation with workplace experience in Islamic finance.</p>
          </HomepageReveal>
          <div className="ifip-home-cards">
            {mission.map(({ icon: Icon, title, detail }, index) => (
              <HomepageReveal as="article" className="ifip-home-card" key={title} delay={index * 0.06}>
                <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </HomepageReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="ifip-home-section ifip-home-tint" aria-labelledby="process-title">
        <div className="ifip-home-wrap ifip-home-section-grid">
          <HomepageReveal className="ifip-home-section-intro">
            <p className="ifip-home-eyebrow">Process</p>
            <h2 id="process-title">Application &amp; placement journey</h2>
            <p>Placement depends on readiness and openings with partner organizations.</p>
          </HomepageReveal>
          <ol className="ifip-home-journey" role="list">
            {journey.map(({ title, detail }) => (
              <HomepageReveal as="li" key={title}><h3>{title}</h3><p>{detail}</p></HomepageReveal>
            ))}
          </ol>
        </div>
      </section>

      <PartnersSection />

      <section className="ifip-home-section ifip-home-tint" aria-labelledby="partner-cta-title">
        <HomepageReveal className="ifip-home-wrap ifip-home-section-grid">
          <h2 id="partner-cta-title">Help develop Islamic finance talent</h2>
          <div className="ifip-home-section-intro">
            <p>Partner organizations can connect with candidates prepared through training, workplace simulations and assessment. The placement team supports matching, briefing and onboarding.</p>
            <div className="ifip-home-actions">
              <Link className="ifip-home-button" href="/partners/apply">Become a partner <TbArrowUpRight aria-hidden="true" /></Link>
              <a className="ifip-home-text-link" href={`mailto:${email}`}><TbMail aria-hidden="true" /> Get in touch</a>
            </div>
          </div>
        </HomepageReveal>
      </section>

      <FaqSection />

      <section className="ifip-home-section ifip-home-dark" aria-labelledby="final-cta-title">
        <HomepageReveal className="ifip-home-wrap ifip-home-section-grid">
          <h2 id="final-cta-title">Begin your journey</h2>
          <div className="ifip-home-section-intro">
            <p>Take the next step towards a career in Islamic finance.</p>
            <div className="ifip-home-actions">
              <Link className="ifip-home-button" href="/apply">Apply to IFIP <TbArrowUpRight aria-hidden="true" /></Link>
              <ProgramGuide />
            </div>
          </div>
        </HomepageReveal>
      </section>

      <footer id="contact" className="ifip-home-footer">
        <div className="ifip-home-wrap">
          <div className="ifip-home-footer-grid">
            <div>
              <Image className="ifip-home-logo" src="/images/logos/logo-full-color.png" alt="Islamic Finance Internship Program" width={160} height={44} />
              <p>Professional training, practical simulations and structured internship placement in Islamic finance.</p>
            </div>
            <nav aria-label="Program links">
              <h2>Program</h2>
              <ul>
                <li><a href="#curriculum">Curriculum</a></li>
                <li><a href="#partners">Placement partners</a></li>
                <li><a href="#faq">Program FAQs</a></li>
                <li><Link href="/partners/apply">Become a partner</Link></li>
              </ul>
            </nav>
            <div className="ifip-home-footer-contacts">
              <h2>Contact</h2>
              <ul>
                {contacts.map(({ label, icon: Icon, href, external }) => (
                  <li key={href}>
                    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
                      <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>{label}
                    </a>
                  </li>
                ))}
                <li className="ifip-home-address"><span className="ifip-home-icon"><TbMapPin aria-hidden="true" /></span>Financial District, Abuja</li>
              </ul>
            </div>
          </div>
          <p className="ifip-home-footer-bottom">© {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.</p>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
  );
}
