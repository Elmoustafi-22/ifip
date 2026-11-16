"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { getCvRequestDetails, type CvRequestDetails } from "@/lib/api/services";

function websiteLink(website?: string) {
  if (!website) return;
  try {
    const url = new URL(website);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return;
  }
}

export default function CvRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CvRequest key={id} id={id} />;
}

function CvRequest({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<CvRequestDetails | "missing" | "failed">();
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    title.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getCvRequestDetails(id, controller.signal).then(
      (details) => {
        if (!controller.signal.aborted) setResult(details);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const missing = typeof error === "object" && error !== null && "status" in error && error.status === 404;
        setResult(missing ? "missing" : "failed");
      },
    );
    return () => controller.abort();
  }, [attempt, id]);

  const company = typeof result === "object" ? result.company : null;
  const website = websiteLink(company?.website);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <h1 ref={title} tabIndex={-1} className="font-display text-2xl font-bold text-[#000666]">
        CV request
      </h1>
      <section aria-label="Requesting company" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {result === undefined && <p role="status" className="text-sm text-slate-600">Loading company details…</p>}
        {result === "missing" && <p className="text-sm text-slate-700">This CV request is unavailable.</p>}
        {result === "failed" && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700">Could not load the CV request.</p>
            <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#000666]"
              onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>
              Try again
            </button>
          </div>
        )}
        {result && typeof result === "object" && (
          <>
            {company ? (
              <>
                <h2 className="break-words text-xl font-bold text-slate-900">{company.name}</h2>
                {company.sectorTags?.length ? (
                  <ul aria-label="Company sectors" className="flex flex-wrap gap-2">
                    {company.sectorTags.map((sector) => (
                      <li key={sector} className="max-w-full break-words rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{sector}</li>
                    ))}
                  </ul>
                ) : null}
                {company.description && <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{company.description}</p>}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#000666] underline">
                    Company website <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </>
            ) : <p className="text-sm text-slate-700">Company details are unavailable.</p>}
            <div className="border-t border-slate-200 pt-4">
              <Link href="/dashboard/settings#documents" className="inline-flex min-h-11 items-center rounded-lg bg-[#000666] px-4 text-sm font-semibold text-white hover:bg-[#111979]">
                Upload or update your CV
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
