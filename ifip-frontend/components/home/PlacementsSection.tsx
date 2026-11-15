"use client";

import { useState } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import * as Tabler from "react-icons/tb";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { getActiveOpenings, getOpportunities } from "@/lib/api/services";
import HomepageReveal from "./HomepageReveal";

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
  const openings = useCachedFetch("active_openings", getActiveOpenings, "openings");

  return (
    <section id="sectors" className="ifip-home-section ifip-home-white" aria-labelledby="sectors-title">
      <div className="ifip-home-wrap">
        <HomepageReveal className="ifip-home-section-intro">
          <h2 id="sectors-title">Internships &amp; active openings</h2>
          <p>Explore internship pathways and discover current openings across our partner network.</p>
        </HomepageReveal>
        <div className="ifip-home-catalog">
          <div className="ifip-home-switcher" role="group" aria-label="Internship listings">
            {tabs.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={activeTab === id} aria-controls={`homepage-${id}`} onClick={() => setActiveTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <div id="homepage-opportunities" hidden={activeTab !== "opportunities"}>
            {opportunities.data?.length ? (
              <div className="ifip-home-cards">
                {opportunities.data.map((opportunity, index) => {
                  const Icon = resolveIcon(opportunity.icon);
                  return (
                    <HomepageReveal as="article" key={opportunity._id} className="ifip-home-card" delay={(index % 3) * 0.06}>
                      <span className="ifip-home-icon"><Icon aria-hidden="true" /></span>
                      <h3>{opportunity.category}</h3>
                      <ul className="ifip-home-tags" aria-label="Areas of work">
                        {opportunity.roles.map((role, index) => <li key={index} className="ifip-home-tag">{role}</li>)}
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
                    <HomepageReveal as="article" key={opening._id} className="ifip-home-card ifip-home-opening" delay={(index % 3) * 0.06}>
                      <p className="ifip-home-department">{opening.department}</p>
                      <h3>{opening.title}</h3>
                      <div className="ifip-home-meta">
                        <span className="ifip-home-tag"><ModeIcon aria-hidden="true" />{opening.workMode}</span>
                        {opening.location && opening.location !== "-" && <span className="ifip-home-meta"><Tabler.TbMapPin aria-hidden="true" />{opening.location}</span>}
                      </div>
                      <Link href="/apply" className="ifip-home-text-link" aria-label={`Apply via IFIP for ${opening.title}`}>
                        Apply via IFIP <Tabler.TbArrowUpRight aria-hidden="true" />
                      </Link>
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
