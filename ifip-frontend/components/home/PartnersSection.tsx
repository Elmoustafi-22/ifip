"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { getActivePartners } from "@/lib/api/services";

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

export default function PartnersSection() {
  const fetchPartnersFn = useMemo(() => () => getActivePartners(), []);
  const { data: partnersData } = useCachedFetch<Array<{ name: string; logoUrl?: string; website?: string }>>(
    "active_partners",
    fetchPartnersFn,
    "partners"
  );
  const partners = partnersData || [];

  return (
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
                    unoptimized
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
  );
}
