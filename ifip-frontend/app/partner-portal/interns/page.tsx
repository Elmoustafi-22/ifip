"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineAcademicCap,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineChevronRight,
  HiOutlineTag,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";
import { getInternPool, InternSummary } from "@/lib/api/partner";
import { useFormOptions } from "@/lib/hooks/useFormOptions";

export default function InternPoolPage() {
  const { options: interestOptions } = useFormOptions("placement_interests");
  const [interns, setInterns] = useState<InternSummary[]>([]);
  const [partnerSectors, setPartnerSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    const fetchPool = async () => {
      setLoading(true);
      try {
        const res = await getInternPool({
          search: search || undefined,
          interest: selectedInterest || undefined,
          assessment: selectedAssessment || undefined,
          sort,
        });
        setInterns(res.interns || []);
        if (res.partnerSectorTags) {
          setPartnerSectors(res.partnerSectorTags);
        }
      } catch (err) {
        console.error("Failed to load intern pool:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPool, 300);
    return () => clearTimeout(timer);
  }, [search, selectedInterest, selectedAssessment, sort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000666] tracking-tight">
            Placement-Ready Intern Pool
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Candidates automatically matched to your organisation based on interest alignment.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs self-start sm:self-auto flex items-center space-x-2">
          <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-500" />
          <span>Total Candidates: <strong className="text-[#000666] font-bold">{interns.length}</strong></span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Candidate Search */}
          <div className="relative">
            <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search candidate name, field, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#000666] focus:bg-white transition-colors"
            />
          </div>

          {/* Interest Filter */}
          <select
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#000666] focus:bg-white transition-colors cursor-pointer"
          >
            <option value="">Relevant to My Organisation</option>
            <option value="all">All Candidates</option>
            {interestOptions && interestOptions.length > 0 ? (
              interestOptions
                .filter((opt) => opt.label && opt.label.toLowerCase() !== "other (specify)")
                .map((opt) => (
                  <option key={opt.value || opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))
            ) : (
              <>
                <option value="Islamic Banking & Finance">Islamic Banking & Finance</option>
                <option value="Sukuk & Capital Markets">Sukuk & Capital Markets</option>
                <option value="Takaful & Islamic Insurance">Takaful & Islamic Insurance</option>
                <option value="FinTech & Digital Transformation">FinTech & Digital Transformation</option>
                <option value="Shariah Governance & Compliance">Shariah Governance & Compliance</option>
                <option value="Wealth & Asset Management">Wealth & Asset Management</option>
                <option value="ESG & Sustainable Finance">ESG & Sustainable Finance</option>
                <option value="Financial Analysis & Research">Financial Analysis & Research</option>
              </>
            )}
          </select>

          {/* Assessment Filter */}
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#000666] focus:bg-white transition-colors cursor-pointer"
          >
            <option value="">All Assessment Statuses</option>
            <option value="passed">Passed Assessment</option>
            <option value="graded">Graded</option>
            <option value="pending">Pending Evaluation</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#000666] focus:bg-white transition-colors cursor-pointer"
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="score">Sort by Assessment Score</option>
          </select>
        </div>
      </div>

      {/* Roster Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : interns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <HiOutlineFunnel className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Candidates Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try switching the interest filter to &quot;All Candidates&quot; or clear search filters to view all candidates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interns.map((intern) => (
            <div
              key={intern.userId}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div>
                {/* Top Badge & Avatar */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    {intern.avatarUrl ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0">
                        <Image src={intern.avatarUrl} alt={intern.fullName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-[#000666] font-bold text-lg flex items-center justify-center border border-slate-200 shrink-0">
                        {intern.fullName?.charAt(0) || "I"}
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 line-clamp-1">{intern.fullName}</h2>
                      {intern.country && (
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5 font-medium">
                          <span>{intern.country}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {intern.isPlaced ? (
                      <span className="text-[11px] font-medium text-slate-500">
                        Placed
                      </span>
                    ) : intern.interestStatus === "approved" ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Matched</span>
                      </span>
                    ) : intern.interestStatus === "pending" ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Request Sent</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Assessment Badge (Only when available) */}
                {(intern.assessmentStatus === "passed" || intern.assessmentScore !== null) && (
                  <div className="mb-3">
                    {intern.assessmentStatus === "passed" ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700">
                        <HiOutlineCheckBadge className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Assessment Passed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600">
                        <HiOutlineAcademicCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>Evaluated</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Program Interests */}
                {intern.programInterests.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {intern.programInterests.map((area, idx) => {
                        const isMatch = intern.matchedInterests?.includes(area);
                        return (
                          <span
                            key={idx}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                              isMatch
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {area}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Skills Tags */}
                {(intern.skills.tools.length > 0 || intern.skills.languages.length > 0) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {[...intern.skills.tools, ...intern.skills.languages].slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <Link
                  href={`/partner-portal/interns/${intern.userId}`}
                  className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#000666] border border-slate-200 hover:border-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>View Full Profile</span>
                  <HiOutlineChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
