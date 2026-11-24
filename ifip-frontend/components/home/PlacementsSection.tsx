"use client";

import { useState } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import * as Tabler from "react-icons/tb";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { getActiveOpenings, getOpportunities } from "@/lib/api/services";
import HomepageReveal from "./HomepageReveal";
import HomepageMotionItem from "./HomepageMotionItem";

function resolveIcon(name: string): IconType {
  return Object.hasOwn(Tabler, name) ? Tabler[name as keyof typeof Tabler] : Tabler.TbBriefcase;
}

const tabs = [
  { id: "opportunities", label: "Opportunities" },
  { id: "openings", label: "Active openings" },
] as const;

export default function PlacementsSection() {
  const [activeTab, setActiveTab] = useState<"opportunities" | "openings">("opportunities");
  const opportunities = useCachedFetch("placement_opportunities", getOpportunities, "opportunities");
  const openings = useCachedFetch("published_partner_openings", getActiveOpenings);

  return (
    <section id="sectors" className="ifip-home-section ifip-home-white" aria-labelledby="sectors-title">
      <div className="ifip-home-wrap">
        <HomepageReveal className="ifip-home-section-intro" direction="left">
          <HomepageMotionItem as="h2" id="sectors-title" delay={0.1} blur>Internships &amp; active openings</HomepageMotionItem>
          <HomepageMotionItem as="p" delay={0.2}>Explore internship pathways and discover current openings across our partner network.</HomepageMotionItem>
        </HomepageReveal>
        <div className="ifip-home-catalog">
          <div className="ifip-home-switcher" role="group" aria-label="Internship listings">
            {tabs.map(({ id, label }) => (
              <HomepageMotionItem as="span" key={id} delay={id === "opportunities" ? 0.1 : 0.18}>
                <button type="button" aria-pressed={activeTab === id} aria-controls={`homepage-${id}`} onClick={() => setActiveTab(id)}>{label}</button>
              </HomepageMotionItem>
            ))}
          </div>
          <div id="homepage-opportunities" hidden={activeTab !== "opportunities"}>
            {opportunities.data?.length ? (
              <div className="ifip-home-cards">
                {opportunities.data.map((opportunity, index) => {
                  const Icon = resolveIcon(opportunity.icon);
                  return (
                    <HomepageReveal as="article" key={opportunity._id} className="ifip-home-card" delay={(index % 3) * 0.06} direction={index % 2 ? "right" : "left"}>
                      <HomepageMotionItem as="span" className="ifip-home-icon" delay={0.12}><Icon aria-hidden="true" /></HomepageMotionItem>
                      <HomepageMotionItem as="h3" delay={0.2} blur>{opportunity.category}</HomepageMotionItem>
                      <ul className="ifip-home-tags" aria-label="Areas of work">
                        {opportunity.roles.map((role, roleIndex) => <HomepageMotionItem as="li" key={roleIndex} className="ifip-home-tag" delay={0.28 + roleIndex * 0.05}>{role}</HomepageMotionItem>)}
                      </ul>
                    </HomepageReveal>
                  );
                })}
              </div>
            ) : <CatalogState loading={opportunities.loading} error={opportunities.error} retry={opportunities.refetch} label="opportunities" />}
          </div>
          <div id="homepage-openings" hidden={activeTab !== "openings"}>
            {openings.data?.length ? (
              <div className="ifip-home-cards">
                {openings.data.map((opening, index) => {
                  const ModeIcon = opening.workMode === "Remote" ? Tabler.TbDeviceLaptop : opening.workMode === "Hybrid" ? Tabler.TbDevices : Tabler.TbBuilding;
                  return (
                    <HomepageReveal as="article" key={opening._id} className="ifip-home-card ifip-home-opening" delay={(index % 3) * 0.06} direction={index % 2 ? "right" : "left"}>
                      {(opening.partnerName || opening.department) && (
                        <HomepageMotionItem as="p" className="ifip-home-department" delay={0.12}>{[opening.partnerName, opening.department].filter(Boolean).join(" · ")}</HomepageMotionItem>
                      )}
                      <HomepageMotionItem as="h3" delay={0.2} blur>{opening.title}</HomepageMotionItem>
                      <div className="ifip-home-meta">
                        <HomepageMotionItem as="span" className="ifip-home-tag" delay={0.28}><ModeIcon aria-hidden="true" />{opening.workMode}</HomepageMotionItem>
                        {opening.location && opening.location !== "-" && <HomepageMotionItem as="span" className="ifip-home-meta" delay={0.34}><Tabler.TbMapPin aria-hidden="true" />{opening.location}</HomepageMotionItem>}
                      </div>
                      <HomepageMotionItem className="ifip-home-action-item" delay={0.4}><Link href="/apply" className="ifip-home-text-link">Apply to IFIP <Tabler.TbArrowUpRight aria-hidden="true" /></Link></HomepageMotionItem>
                    </HomepageReveal>
                  );
                })}
              </div>
            ) : <CatalogState loading={openings.loading} error={openings.error} retry={openings.refetch} label="active openings" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function CatalogState({ loading, error, retry, label }: { loading: boolean; error: Error | null; retry: () => void; label: string }) {
  return (
    <div className="ifip-home-catalog-state">
      <p role="status">{loading ? `Loading ${label}…` : error ? `Could not load ${label}.` : `No ${label} are listed right now. Please check back later.`}</p>
      {!loading && error && <button type="button" className="ifip-home-retry" onClick={retry}>Retry {label}</button>}
    </div>
  );
}
