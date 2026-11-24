"use client";

import Image from "next/image";
import Link from "next/link";
import { TbArrowUpRight, TbBuilding } from "react-icons/tb";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { getActivePartners } from "@/lib/api/services";
import HomepageReveal from "./HomepageReveal";
import HomepageMotionItem from "./HomepageMotionItem";

interface Partner {
  name: string;
  logoUrl?: string;
  website?: string;
}

export default function PartnersSection() {
  const { data: partners, loading, error, refetch } = useCachedFetch<Partner[]>("active_partners", getActivePartners, "partners");

  return (
    <section id="partners" className="ifip-home-section ifip-home-partners-section" aria-labelledby="partners-title">
      <div className="ifip-home-wrap">
        <HomepageReveal direction="left"><HomepageMotionItem as="h2" id="partners-title" delay={0.1} blur>Institutional partners for placement</HomepageMotionItem></HomepageReveal>
        {partners?.length ? (
          <ul className="ifip-home-partners-grid">
            {partners.map(({ name, logoUrl, website }, index) => {
              const content = <>
                <HomepageMotionItem className="ifip-home-partner-logo" delay={0.12}>
                  {logoUrl ? <Image src={logoUrl} width={180} height={80} alt="" unoptimized /> : <span className="ifip-home-icon"><TbBuilding aria-hidden="true" /></span>}
                </HomepageMotionItem>
                <HomepageMotionItem as="h3" delay={0.22} blur>{name}</HomepageMotionItem>
              </>;
              return (
                <HomepageReveal as="li" key={`${name}-${index}`} className="ifip-home-card" delay={(index % 4) * 0.05} direction={index % 2 ? "right" : "left"}>
                  {website ? <a href={website} target="_blank" rel="noopener noreferrer">{content}</a> : content}
                </HomepageReveal>
              );
            })}
          </ul>
        ) : (
          <div className="ifip-home-catalog-state">
            <p role="status">
              {loading ? "Loading placement partners…" : error ? "Could not load placement partners." : "Our network of institutional placement partners is continually expanding."}
            </p>
            {!loading && (error
              ? <button type="button" className="ifip-home-retry" onClick={refetch}>Retry placement partners</button>
              : <Link href="/partners/apply" className="ifip-home-text-link">Become an institutional partner <TbArrowUpRight aria-hidden="true" /></Link>)}
          </div>
        )}
      </div>
    </section>
  );
}
