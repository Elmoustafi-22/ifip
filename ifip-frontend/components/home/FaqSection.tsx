"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
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
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                style={{ transform: "translateZ(0)" }}
                className="bg-white border border-outline-variant/30 rounded-[8px] overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-display font-bold text-primary text-base md:text-lg hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span
                    className="ml-4 text-primary shrink-0"
                    style={{
                      transition: "transform 200ms ease",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </button>

                <div
                  style={{
                    maxHeight: isOpen ? "600px" : "0px",
                    overflow: "hidden",
                    transition: "max-height 300ms ease-in-out",
                  }}
                >
                  <div className="px-6 py-5 text-sm md:text-base text-on-surface-variant leading-relaxed border-t border-outline-variant/10 bg-slate-50/10">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
