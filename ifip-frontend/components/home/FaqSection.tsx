import { TbPlus } from "react-icons/tb";
import HomepageReveal from "./HomepageReveal";
import HomepageMotionItem from "./HomepageMotionItem";
const faqs = [
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
    a: "Internship remuneration depends on the structure and policy of the host organization. However, many internship opportunities may include financial support based on the organization's specifications."
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
    a: "Yes. Internship placement through IFIP is exclusively available to participants who complete the preparatory program. This enables us to assess each participant's professional readiness, industry skills, workplace ethics, and performance through our simulations and assessments. It also ensures that the talents we recommend to partner organizations meet the standard of quality, competence, and professionalism expected by the industry."
  }
];

export default function FaqSection() {
  return (
    <section id="faq" className="ifip-home-section ifip-home-white" aria-labelledby="faq-title">
      <HomepageReveal className="ifip-home-wrap ifip-home-section-grid" direction="left">
        <HomepageMotionItem as="h2" id="faq-title" delay={0.1} blur>Frequently asked questions</HomepageMotionItem>
        <div className="ifip-home-faq">
          {faqs.map(({ q, a }, index) => (
            <HomepageReveal as="div" key={q} delay={Math.min(index, 5) * 0.05} direction="right">
            <details name="homepage-faq">
              <summary>{q}<TbPlus aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
            </HomepageReveal>
          ))}
        </div>
      </HomepageReveal>
    </section>
  );
}
