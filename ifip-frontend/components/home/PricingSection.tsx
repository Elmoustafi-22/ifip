"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PricingSection() {
  const [isNigeria, setIsNigeria] = useState<boolean | null>(null);

  useEffect(() => {
    const detectIp = async () => {
      try {
        const res = await fetch("/api/geolocation");
        const data = await res.json();
        if (data && data.countryCode) {
          setIsNigeria(data.countryCode === "NG");
        } else {
          setIsNigeria(true);
        }
      } catch (err) {
        console.error("IP detection failed:", err);
        setIsNigeria(true);
      }
    };
    detectIp();
  }, []);

  return (
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
  );
}
