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
      <div className="max-w-4xl mx-auto py-10 px-4 font-sans text-sm text-slate-600 bg-[#FDFBF7]">
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-8 shadow-sm text-center max-w-xl mx-auto mt-12">
          <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-5 text-sky-700">
            <HiOutlineBriefcase className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#000666] mb-3">Placement Talent Pool</h2>
          <p className="text-slate-500 leading-relaxed mb-6">
            Congratulations! You are officially in our Shariah-compliant placement pool. Once you complete your training modules and finalize assessments, our ops team will match you with institutional partners.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100 space-y-3">
            <div className="flex gap-2 items-start">
              <HiOutlineSparkles className="w-5 h-5 text-[#FF9800] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 text-xs">How matching works</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">We pair your stated interests (e.g. FinTech, Banking) with slots offered by partners.</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Pre-matching requirements</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">Maintain active coursework progression and pass module assessments to trigger match priority.</p>
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
