"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { getActiveOpenings, ActiveOpening, getOpportunities, PlacementOpportunity } from "@/lib/api/services";
import * as TbIcons from "react-icons/tb";

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

export default function PlacementsSection() {
  const [activePlacementsTab, setActivePlacementsTab] = useState<"opportunities" | "jobs">("opportunities");

  // Openings
  const fetchOpeningsFn = useMemo(() => () => getActiveOpenings(), []);
  const { data: openingsData, loading: openingsLoading } = useCachedFetch<ActiveOpening[]>(
    "active_openings",
    fetchOpeningsFn,
    "openings"
  );
  const openings = openingsData || [];

  // Opportunities
  const fetchOpportunitiesFn = useMemo(() => () => getOpportunities(), []);
  const { data: opportunitiesData, loading: opportunitiesLoading } = useCachedFetch<PlacementOpportunity[]>(
    "placement_opportunities",
    fetchOpportunitiesFn,
    "opportunities"
  );
  const opportunities = opportunitiesData || [];

  return (
    <section id="sectors" className="py-12 md:py-24 bg-background border-b border-outline-variant/10">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-headline-lg text-primary font-display text-3xl md:text-4xl mb-4 font-bold">Internships &amp; Active Openings</h2>
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
  );
}
