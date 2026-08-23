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

export default function InternPoolPage() {
  const [interns, setInterns] = useState<InternSummary[]>([]);
  const [partnerSectors, setPartnerSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillsQuery, setSkillsQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    const fetchPool = async () => {
      setLoading(true);
      try {
        const res = await getInternPool({
          search: search || undefined,
          skills: skillsQuery || undefined,
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
  }, [search, skillsQuery, selectedInterest, selectedAssessment, sort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineUsers className="w-6 h-6 text-emerald-600" />
            <span>Placement-Ready Intern Pool</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Candidates automatically matched to your organisation based on interest alignment.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto flex items-center space-x-2">
          <HiOutlineBuildingOffice2 className="w-4 h-4 text-emerald-600" />
          <span>Total Candidates: <strong className="text-emerald-700 font-bold">{interns.length}</strong></span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Name Search */}
          <div className="relative">
            <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search candidate name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Skills Filter */}
          <div className="relative">
            <HiOutlineTag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by skill / tool..."
              value={skillsQuery}
              onChange={(e) => setSkillsQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Interest Filter */}
          <select
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="">Relevant to My Organisation</option>
            <option value="all">All Candidates</option>
            <option value="Islamic Banking">Islamic Banking</option>
            <option value="Islamic Capital Markets">Islamic Capital Markets</option>
            <option value="Sukuk Structuring">Sukuk Structuring</option>
            <option value="FinTech">FinTech & Takaful</option>
            <option value="Shariah Governance">Shariah Governance</option>
            <option value="Wealth Management">Wealth Management</option>
            <option value="ESG">ESG & Sustainable Finance</option>
          </select>

          {/* Assessment Filter */}
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors cursor-pointer"
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
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors cursor-pointer"
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
            Try switching the interest filter to &quot;All Candidates&quot; or clear search filters to view full roster.
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
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-400 font-bold text-lg flex items-center justify-center border border-slate-700 shrink-0">
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Placed
                      </span>
                    ) : intern.interestStatus === "approved" ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        <HiOutlineCheckCircle className="w-3 h-3 text-teal-600" />
                        <span>Matched</span>
                      </span>
                    ) : intern.interestStatus === "pending" ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <HiOutlineClock className="w-3 h-3 text-amber-600" />
                        <span>Request Sent</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Assessment Badge */}
                <div className="mb-3">
                  {intern.assessmentStatus === "passed" ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <HiOutlineCheckBadge className="w-4 h-4 text-emerald-600" />
                      <span>Assessment Passed ({intern.assessmentScore ?? 100}%)</span>
                    </span>
                  ) : intern.assessmentScore !== null ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <HiOutlineAcademicCap className="w-4 h-4 text-slate-500" />
                      <span>Evaluated ({intern.assessmentScore}%)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      <HiOutlineClock className="w-4 h-4 text-slate-400" />
                      <span>Pending Evaluation</span>
                    </span>
                  )}
                </div>

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
                  className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
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
