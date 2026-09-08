"use client";

import { useEffect, useState } from "react";
import { 
  HiOutlineBriefcase, 
  HiOutlineChevronRight, 
  HiOutlineSparkles,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldCheck
} from "react-icons/hi2";
import { getMyPlacement, Placement } from "@/lib/api/services";

export default function ParticipantPlacementPage() {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlacement = async () => {
      try {
        const data = await getMyPlacement();
        setPlacement(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError("pool");
        } else {
          setError("failed");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPlacement();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-xs">Retrieving matching records...</p>
      </div>
    );
  }

  // 1. Participant is in pool, no match yet
  if (error === "pool" || !placement) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-sm text-slate-600 bg-[#FDFBF7]">
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm text-center max-w-xl mx-auto mt-6">
          <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#000666] border border-sky-100">
            <HiOutlineBriefcase className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-display text-[#000666] mb-2">
            Internship Placement Considerations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
            Participation in IFIP prepares candidates for industry placement opportunities, but placement is not guaranteed or automatic. Final placement recommendation and matching strictly depend upon your completion of the preparatory program, assessment performance, and final review and selection by partner organizations.
          </p>
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 text-left border border-slate-200/70 space-y-3.5">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-md bg-blue-100/70 text-[#000666] flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineClipboardDocumentCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Program &amp; Assessment Completion</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  Candidates must complete all required modules and achieve satisfactory scores across unit assessments to qualify for partner referral.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-md bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Partner Company Review &amp; Selection</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  Host financial institutions independently evaluate candidate profiles, simulations, and interview outcomes based on their available openings.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-md bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineSparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Talent Pool Matching</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                  Qualified candidates are matched with partner slots aligned with their field of focus (e.g. Islamic Banking, Takaful, FinTech) as opportunities open.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partner = placement.partnerOrgId;
  const statusSteps = ["matched", "interviewing", "placed"];
  const currentStepIndex = statusSteps.indexOf(placement.status);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 font-sans bg-[#FDFBF7]">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">My Placement Matching</h1>
        <p className="text-slate-500 text-sm">Review your matched partner organization details and interview schedules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Match Tracker and Profile Details (Col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#000666] mb-6">Internship Lifecycle Tracker</h2>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative">
              {statusSteps.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1 w-full relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                      isCurrent 
                        ? "bg-[#FF9800] border-[#FF9800] text-white animate-pulse" 
                        : isActive 
                          ? "bg-[#000666] border-[#000666] text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="text-left sm:text-center">
                      <div className={`font-bold capitalize text-xs ${isActive ? "text-[#000666]" : "text-slate-400"}`}>
                        {step}
                      </div>
                      <span className="text-[10px] text-slate-400 block sm:inline mt-0.5 capitalize">
                        {step === "matched" ? "Matched" : step === "interviewing" ? "Interviewing" : "Onboarded"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employer Card */}
          {partner && (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <span className="bg-sky-50 text-sky-700 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded border border-sky-100">
                    Matched Employer
                  </span>
                  <h3 className="text-lg font-black text-[#000666] mt-2.5">{partner.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {partner.sectorTags?.map((tag: string, index: number) => (
                    <span key={index} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                {partner.description || "Leading financial institution offering robust growth opportunities."}
              </p>
              {placement.notes && (
                <div className="bg-[#FDFBF7] border border-[#E7E2D8] rounded-xl p-4">
                  <h4 className="font-bold text-xs text-[#000666] mb-1.5">Ops Manager Notes</h4>
                  <p className="text-slate-600 text-xs italic">"{placement.notes}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info/Onboarding Guidelines (Col-span 1) */}
        <div className="space-y-6">
          <div className="bg-[#0E1B5D] text-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
              <HiOutlineShieldCheck className="w-5 h-5 text-[#FF9800]" /> Interview Guidelines
            </h3>
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex gap-2">
                <HiOutlineChevronRight className="w-4 h-4 text-[#FF9800] shrink-0 mt-0.5" />
                <span>Prepare explanations for Murabahah, Mudarabah, and ethical finance structures.</span>
              </li>
              <li className="flex gap-2">
                <HiOutlineChevronRight className="w-4 h-4 text-[#FF9800] shrink-0 mt-0.5" />
                <span>Highlight module coursework case-studies completed during training.</span>
              </li>
              <li className="flex gap-2">
                <HiOutlineChevronRight className="w-4 h-4 text-[#FF9800] shrink-0 mt-0.5" />
                <span>Log in to dashboard alerts to check for interview invite scheduling times.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-[#000666] text-sm flex items-center gap-2 mb-3">
              <HiOutlineChatBubbleLeftRight className="w-5 h-5 text-indigo-500" /> Need Support?
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              Questions regarding internship matches or slots capacity? Get in touch with our matching desk.
            </p>
            <a 
              href="mailto:placement.ifip@gmail.com" 
              className="text-[#00B0FF] font-bold text-xs hover:underline block"
            >
              Contact Matching Coordinator &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
