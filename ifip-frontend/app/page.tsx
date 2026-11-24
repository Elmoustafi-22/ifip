import Image from "next/image";
import Link from "next/link";
import {
  TbArrowUpRight, TbArrowsExchange, TbAward, TbBook, TbBrandLinkedin,
  TbBrandWhatsapp, TbBriefcase, TbDownload, TbMail, TbMapPin,
  TbClipboardCheck, TbSchool, TbSparkles, TbUserCog,
} from "react-icons/tb";
import HomeNav from "@/components/home/HomeNav";
import HomepageReveal from "@/components/home/HomepageReveal";
import HomepageMotionItem from "@/components/home/HomepageMotionItem";
import HeroSection from "@/components/home/HeroSection";
import PlacementsSection from "@/components/home/PlacementsSection";
import PricingSection from "@/components/home/PricingSection";
import PartnersSection from "@/components/home/PartnersSection";
import FaqSection from "@/components/home/FaqSection";
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

const assessmentIncludes = [
  "Testing participants on key concepts and practical knowledge covered during the programme.",
  "A secure and standardised assessment delivered through a third-party platform.",
  "Successful completion as a requirement for certification and entry into the programme’s talent pool.",
];

const applicants = [
  { title: "Students", icon: TbSchool, detail: "Undergraduates and postgraduates enrolled in recognized institutions and preparing for a career." },
  { title: "Graduates", icon: TbAward, detail: "Graduates of recognized institutions building knowledge and skills for the ethical economy." },
  { title: "Professionals", icon: TbBriefcase, detail: "Working professionals deepening their Shariah finance expertise and expanding their career opportunities." },
  { title: "Career changers", icon: TbArrowsExchange, detail: "People bringing skills from fields such as technology, law or administration into ethical finance." },
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

      <section id="curriculum" className="ifip-home-section ifip-home-white ifip-home-curriculum-section" aria-labelledby="curriculum-title">
        <div className="ifip-home-wrap">
          <div className="ifip-home-curriculum-lead">
            <HomepageReveal className="ifip-home-section-intro" direction="left">
              <HomepageMotionItem as="p" className="ifip-home-eyebrow" delay={0.08}>Curriculum</HomepageMotionItem>
              <HomepageMotionItem as="h2" id="curriculum-title" delay={0.16} blur>What you’ll learn</HomepageMotionItem>
              <HomepageMotionItem as="p" delay={0.24}>The core training combines Islamic finance, professional development and workplace practice.</HomepageMotionItem>
              <HomepageMotionItem className="ifip-home-action-item" delay={0.32}><ProgramGuide /></HomepageMotionItem>
            </HomepageReveal>
            <HomepageReveal className="ifip-home-editorial-image" variant="media" delay={0.1}>
              <Image src="/images/homepage/curriculum.webp" alt="Study notes and a calendar used to plan a learning programme" width={960} height={640} />
            </HomepageReveal>
          </div>
          <div className="ifip-home-cards ifip-home-curriculum-cards">
            {curriculum.map(({ icon: Icon, title, topics }, index) => (
              <HomepageReveal as="article" className="ifip-home-card" key={title} delay={index * 0.05} direction={index % 2 === 0 ? "left" : "right"}>
                <header className="ifip-home-curriculum-heading">
                  <HomepageMotionItem as="span" className="ifip-home-module-index" delay={0.12}>{String(index + 1).padStart(2, "0")}</HomepageMotionItem>
                  <HomepageMotionItem as="span" className="ifip-home-icon" delay={0.18} direction="right"><Icon aria-hidden="true" /></HomepageMotionItem>
                  <HomepageMotionItem as="h3" delay={0.24} blur>{title}</HomepageMotionItem>
                </header>
                <ul className="ifip-home-curriculum-list">{topics.map((topic, topicIndex) => <HomepageMotionItem as="li" key={topic} delay={0.32 + topicIndex * 0.06}>{topic}</HomepageMotionItem>)}</ul>
              </HomepageReveal>
            ))}
          </div>
          <div className="ifip-home-curriculum-outcomes">
            <HomepageReveal as="article" className="ifip-home-assessment" direction="left">
              <div className="ifip-home-assessment-heading">
                <HomepageMotionItem as="span" className="ifip-home-icon" delay={0.1}><TbClipboardCheck aria-hidden="true" /></HomepageMotionItem>
                <div>
                  <HomepageMotionItem as="p" className="ifip-home-eyebrow" delay={0.16}>Final stage</HomepageMotionItem>
                  <HomepageMotionItem as="h3" id="assessment-title" delay={0.22} blur>Standard Assessment</HomepageMotionItem>
                </div>
              </div>
              <HomepageMotionItem as="p" className="ifip-home-assessment-copy" delay={0.28}>At the end of the programme, participants will complete a structured assessment covering the knowledge and skills gained throughout the sessions. The assessment is designed to measure their understanding, readiness and commitment before a certificate is issued.</HomepageMotionItem>
              <HomepageMotionItem as="p" className="ifip-home-assessment-label" delay={0.34}>Assessment includes:</HomepageMotionItem>
              <ul className="ifip-home-assessment-list">
                {assessmentIncludes.map((item, index) => <HomepageMotionItem as="li" key={item} delay={0.4 + index * 0.06}>{item}</HomepageMotionItem>)}
              </ul>
            </HomepageReveal>
            <HomepageReveal as="article" className="ifip-home-certificate-panel" direction="right">
              <HomepageMotionItem as="span" className="ifip-home-icon" delay={0.12}><programCertificate.icon aria-hidden="true" /></HomepageMotionItem>
              <HomepageMotionItem as="p" className="ifip-home-eyebrow" delay={0.2}>On completion</HomepageMotionItem>
              <HomepageMotionItem as="h3" delay={0.28} blur>{programCertificate.title}</HomepageMotionItem>
              <HomepageMotionItem as="p" delay={0.36}>{programCertificate.detail}</HomepageMotionItem>
            </HomepageReveal>
          </div>
        </div>
      </section>

      <PlacementsSection />

      <section className="ifip-home-section ifip-home-eligibility-section" aria-labelledby="eligibility-title">
        <div className="ifip-home-wrap ifip-home-section-grid">
          <HomepageReveal className="ifip-home-section-intro" direction="left">
            <HomepageMotionItem as="h2" id="eligibility-title" delay={0.1} blur>Who can apply?</HomepageMotionItem>
            <HomepageMotionItem as="p" delay={0.18}>IFIP welcomes applicants from anywhere in the world. Prior industry experience is optional.</HomepageMotionItem>
            <HomepageMotionItem className="ifip-home-action-item" delay={0.26}><Link className="ifip-home-text-link" href="/about">Learn about IFIP <TbArrowUpRight aria-hidden="true" /></Link></HomepageMotionItem>
          </HomepageReveal>
          <div className="ifip-home-eligibility">
            {applicants.map(({ icon: Icon, title, detail }, index) => (
              <HomepageReveal as="article" className="ifip-home-card" key={title} delay={(index % 2) * 0.07} direction={index % 2 === 0 ? "left" : "right"}>
                <HomepageMotionItem as="span" className="ifip-home-icon" delay={0.12}><Icon aria-hidden="true" /></HomepageMotionItem>
                <div>
                  <HomepageMotionItem as="h3" delay={0.2} blur>{title}</HomepageMotionItem>
                  <HomepageMotionItem as="p" delay={0.28}>{detail}</HomepageMotionItem>
                </div>
              </HomepageReveal>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <section id="process" className="ifip-home-section ifip-home-process-section" aria-labelledby="process-title">
        <div className="ifip-home-wrap ifip-home-section-grid">
          <HomepageReveal className="ifip-home-section-intro ifip-home-process-intro" direction="left">
            <HomepageMotionItem as="p" className="ifip-home-eyebrow" delay={0.08}>Process</HomepageMotionItem>
            <HomepageMotionItem as="h2" id="process-title" delay={0.16} blur>Application &amp; placement journey</HomepageMotionItem>
            <HomepageMotionItem as="p" delay={0.24}>Placement depends on readiness and openings with partner organizations.</HomepageMotionItem>
            <HomepageReveal className="ifip-home-process-media" variant="media" delay={0.14}>
              <Image src="/images/homepage/application.webp" alt="A learner reviewing a CV on a laptop" width={960} height={640} />
            </HomepageReveal>
          </HomepageReveal>
          <ol className="ifip-home-journey" role="list">
            {journey.map(({ title, detail }, index) => (
              <HomepageReveal as="li" key={title} delay={index * 0.05} direction="right">
                <HomepageMotionItem as="h3" delay={0.16} blur>{title}</HomepageMotionItem>
                <HomepageMotionItem as="p" delay={0.24}>{detail}</HomepageMotionItem>
              </HomepageReveal>
            ))}
          </ol>
        </div>
      </section>

      <PartnersSection />

      <section className="ifip-home-section ifip-home-partner-callout" aria-labelledby="partner-cta-title">
        <HomepageReveal className="ifip-home-wrap ifip-home-section-grid" direction="left">
          <HomepageMotionItem as="h2" id="partner-cta-title" delay={0.1} blur>Help develop Islamic finance talent</HomepageMotionItem>
          <div className="ifip-home-section-intro">
            <HomepageMotionItem as="p" delay={0.2}>Partner organizations can connect with candidates prepared through training, workplace simulations and assessment. The placement team supports matching, briefing and onboarding.</HomepageMotionItem>
            <div className="ifip-home-actions">
              <HomepageMotionItem as="span" className="ifip-home-action-item" delay={0.3}><Link className="ifip-home-button" href="/partners/apply">Become a partner <TbArrowUpRight aria-hidden="true" /></Link></HomepageMotionItem>
              <HomepageMotionItem as="span" className="ifip-home-action-item" delay={0.4}><a className="ifip-home-text-link" href={`mailto:${email}`}><TbMail aria-hidden="true" /> Get in touch</a></HomepageMotionItem>
            </div>
          </div>
        </HomepageReveal>
      </section>

      <FaqSection />

      <section className="ifip-home-section ifip-home-dark" aria-labelledby="final-cta-title">
        <HomepageReveal className="ifip-home-wrap ifip-home-section-grid" direction="left">
          <HomepageMotionItem as="h2" id="final-cta-title" delay={0.1} blur>Begin your journey</HomepageMotionItem>
          <div className="ifip-home-section-intro">
            <HomepageMotionItem as="p" delay={0.2}>Take the next step towards a career in Islamic finance.</HomepageMotionItem>
            <div className="ifip-home-actions">
              <HomepageMotionItem as="span" className="ifip-home-action-item" delay={0.3}><Link className="ifip-home-button" href="/apply">Apply to IFIP <TbArrowUpRight aria-hidden="true" /></Link></HomepageMotionItem>
              <HomepageMotionItem as="span" className="ifip-home-action-item" delay={0.4}><ProgramGuide /></HomepageMotionItem>
            </div>
          </div>
        </HomepageReveal>
      </section>

      <footer id="contact" className="ifip-home-footer">
        <div className="ifip-home-wrap">
          <div className="ifip-home-footer-grid">
            <HomepageReveal direction="left">
              <Image className="ifip-home-logo" src="/images/logos/logo-full-color.png" alt="Islamic Finance Internship Program" width={160} height={44} />
              <HomepageMotionItem as="p" delay={0.16}>Professional training, practical simulations and structured internship placement in Islamic finance.</HomepageMotionItem>
            </HomepageReveal>
            <HomepageReveal direction="up"><nav aria-label="Program links">
              <HomepageMotionItem as="h2" delay={0.1}>Program</HomepageMotionItem>
              <ul>
                <HomepageMotionItem as="li" delay={0.16}><a href="#curriculum">Curriculum</a></HomepageMotionItem>
                <HomepageMotionItem as="li" delay={0.22}><a href="#partners">Placement partners</a></HomepageMotionItem>
                <HomepageMotionItem as="li" delay={0.28}><a href="#faq">Program FAQs</a></HomepageMotionItem>
                <HomepageMotionItem as="li" delay={0.34}><Link href="/partners/apply">Become a partner</Link></HomepageMotionItem>
              </ul>
            </nav></HomepageReveal>
            <HomepageReveal className="ifip-home-footer-contacts" direction="right">
              <HomepageMotionItem as="h2" delay={0.1}>Contact</HomepageMotionItem>
              <ul>
                {contacts.map(({ label, icon: Icon, href, external }, index) => (
                  <HomepageMotionItem as="li" key={href} delay={0.16 + index * 0.06}>
                    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
                      <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>{label}
                    </a>
                  </HomepageMotionItem>
                ))}
                <HomepageMotionItem as="li" className="ifip-home-address" delay={0.38}><span className="ifip-home-icon"><TbMapPin aria-hidden="true" /></span>Financial District, Abuja</HomepageMotionItem>
              </ul>
            </HomepageReveal>
          </div>
          <HomepageMotionItem as="p" className="ifip-home-footer-bottom">© {new Date().getFullYear()} IFIP. All rights reserved.</HomepageMotionItem>
        </div>
      </footer>

    </div>
  );
}
