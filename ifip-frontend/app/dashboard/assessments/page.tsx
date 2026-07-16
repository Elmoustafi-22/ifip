"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineClipboardDocumentList, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineLockClosed, 
  HiOutlineClock,
  HiOutlineChevronRight,
  HiOutlineArrowPath
} from "react-icons/hi2";
import { getLMSModules, LMSModule, getMyApplication, getCohortConfig } from "@/lib/api/services";

export default function AssessmentsPage() {
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");

  useEffect(() => {
    const fetchAssessmentsData = async () => {
      try {
        const [modulesData, profile, config] = await Promise.all([
          getLMSModules(),
          getMyApplication(),
          getCohortConfig()
        ]);
        // Filter modules that actually have an assessment linked
        const assessmentModules = modulesData.filter(m => m.assessmentId);
        setModules(assessmentModules);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
      } catch (err: any) {
        console.error("Failed to load assessments page parameters:", err);
        setError("Unable to retrieve assessments. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchAssessmentsData();
  }, []);

  const getIsLaunched = () => {
    if (userData?.role === "admin" || userData?.role === "superadmin") return true;
    if (dashboardViewOverride === "unlocked") return true;
    if (dashboardViewOverride === "coming_soon") return false;
    return new Date() >= new Date(cohortStartDate);
  };

  const isLaunched = getIsLaunched();

  const getCompletedCount = () => {
    return modules.filter(m => m.assessmentStatus === "passed").length;
  };

  const getProgressPercentage = () => {
    if (modules.length === 0) return 0;
    return Math.round((getCompletedCount() / modules.length) * 100);
  };

  const getStatusBadge = (status: string | undefined, isParentLocked: boolean) => {
    if (isParentLocked) {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-100">
          <HiOutlineLockClosed className="w-3.5 h-3.5" /> Locked
        </span>
      );
    }

    switch (status) {
      case "passed":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-100">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Passed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-rose-100">
            <HiOutlineXCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-100">
            <HiOutlineClock className="w-3.5 h-3.5 animate-pulse" /> Under Review
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 bg-sky-50 text-[#00B0FF] text-[10px] font-bold px-2.5 py-1 rounded-md border border-sky-100">
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-200">
            Awaiting Action
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading course assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-rose-50 border border-rose-200 rounded-2xl">
        <p className="text-rose-700 font-medium text-sm mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    );
  }

  if (!isLaunched) {
    const formatCohortDate = (isoString: string) => {
      try {
        const d = new Date(isoString);
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      } catch {
        return "August 31, 2026";
      }
    };

    return (
      <div className="flex-grow flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/50 p-6 md:p-12 lg:p-16 flex flex-col items-center text-center mx-auto shadow-sm select-none">
          <svg className="w-16 h-16 text-sky-400/70 mb-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12M6 22h12M6 2c0 4 3 6 3 10s-3 6-3 10M18 2c0 4-3 6-3 10s3 6 3 10M9 8h6M10 16h4" />
          </svg>
          <div className="bg-[#000666] text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest select-none mb-6">
            <HiOutlineClock className="w-3.5 h-3.5" /> Coming Soon
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-[#000666] mb-4">Course Assessments</h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-8 font-medium">
            Program assessments and practical evaluations are currently locked. Access will be unlocked on program launch day:{" "}
            <strong className="text-[#000666]">{formatCohortDate(cohortStartDate)}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = getCompletedCount();
  const totalCount = modules.length;
  const progressPercent = getProgressPercentage();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Assessments & Evaluations</h1>
        <p className="text-slate-500 text-sm sm:text-base">Complete quizzes and practical simulations to unlock placement desk opportunities.</p>
      </div>

      {/* Progress Card */}
      {totalCount > 0 && (
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-300 transition-all duration-300">
          <div>
            <h2 className="font-bold text-[#000666] text-base mb-1">Evaluations Progression</h2>
            <p className="text-slate-500 text-xs">{completedCount} of {totalCount} assessments passed</p>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#00B0FF]">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-[#00B0FF] h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod) => {
          const isModuleLocked = mod.status === "locked";
          const assessmentStatus = mod.assessmentStatus || "not_started";
          const isPassed = assessmentStatus === "passed";

          return (
            <div 
              key={mod._id}
              className={`bg-white border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                isModuleLocked 
                  ? "border-slate-200/60 opacity-75 select-none" 
                  : "border-[#E7E2D8] hover:border-slate-300 hover:shadow-md hover:translate-y-[-1px]"
              }`}
            >
              {/* Left Accent Strip */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                isModuleLocked ? "bg-slate-200" : isPassed ? "bg-emerald-500" : "bg-[#00B0FF]"
              }`} />

              <div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Module {mod.order}
                    </span>
                  </div>
                  {getStatusBadge(assessmentStatus, isModuleLocked)}
                </div>

                <div className="flex gap-3 pl-2 mb-4">
                  <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border ${
                    isModuleLocked ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-sky-50/60 border-sky-100 text-[#000666]"
                  }`}>
                    <HiOutlineClipboardDocumentList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold font-display leading-snug mb-1 ${
                      isModuleLocked ? "text-slate-400" : "text-[#000666]"
                    }`}>
                      {mod.title} Assessment
                    </h3>
                    <p className="text-slate-400 text-[10px] flex items-center gap-1 font-medium">
                      Est. Duration: {mod.estimatedDuration || 15} mins
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pl-2">
                {isModuleLocked ? (
                  <div className="text-slate-400 text-xs flex items-center gap-1.5 py-2 font-medium bg-slate-50 rounded-xl px-3 border border-slate-100">
                    <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
                    Complete Module {mod.order} content to unlock.
                  </div>
                ) : (
                  <Link
                    href={`/dashboard/modules/${mod._id}`}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isPassed 
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200" 
                        : "bg-[#000666] hover:bg-[#000666]/90 text-white hover:shadow-md"
                    }`}
                  >
                    {isPassed ? "Review Results" : "Take Assessment"}
                    <HiOutlineChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
