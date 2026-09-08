"use strict";

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineBookOpen, 
  HiOutlinePlay, 
  HiOutlineLockClosed, 
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineAcademicCap,
  HiOutlineArrowRight
} from "react-icons/hi2";
import {
  getLMSModules,
  LMSModule,
  getMyApplication,
  getCohortConfig,
  getMyTaskRewardSummary,
  MyTaskRewardSummary,
} from "@/lib/api/services";

export default function ModulesPage() {
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");
  const [isAwaitingAssignment, setIsAwaitingAssignment] = useState(false);
  const [taskRewardSummary, setTaskRewardSummary] = useState<MyTaskRewardSummary | null>(null);

  useEffect(() => {
    const fetchModulesData = async () => {
      try {
        const [profile, config, rewardSummary] = await Promise.all([
          getMyApplication(),
          getCohortConfig(),
          getMyTaskRewardSummary().catch(() => null)
        ]);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
        setTaskRewardSummary(rewardSummary);

        const modulesData = await getLMSModules();
        setModules(modulesData);
      } catch (err: any) {
        console.error("Failed to load modules page parameters:", err);
        if (err.apiCode === "AWAITING_COHORT_ASSIGNMENT") {
          setIsAwaitingAssignment(true);
        } else {
          setError(err.message || "Unable to retrieve coursework parameters. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchModulesData();
  }, []);

  const getCompletedCount = () => {
    return modules.filter(m => m.status === "completed").length;
  };

  const getProgressPercentage = () => {
    if (modules.length === 0) return 0;
    return Math.round((getCompletedCount() / modules.length) * 100);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <HiOutlinePlay className="w-4 h-4 text-[#000666]" />;
      case "quiz":
      case "assignment":
        return <HiOutlineClipboardDocumentList className="w-4 h-4 text-[#000666]" />;
      default:
        return <HiOutlineBookOpen className="w-4 h-4 text-[#000666]" />;
    }
  };

  const getContentTypeBg = (type: string) => {
    return "bg-[#000666]/5 border-[#000666]/10 text-[#000666]";
  };

  const getIsLaunched = () => {
    if (userData?.role === "admin" || userData?.role === "superadmin") return true;
    if (dashboardViewOverride === "unlocked") return true;
    if (dashboardViewOverride === "coming_soon") return false;
    return new Date() >= new Date(cohortStartDate);
  };

  const isLaunched = getIsLaunched();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading curriculum modules...</p>
      </div>
    );
  }

  if (isAwaitingAssignment) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-10 px-4 font-sans select-none">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/60 p-8 md:p-12 text-center mx-auto shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-blue-50 rounded-full text-[#000666]">
            <svg className="w-10 h-10 animate-pulse text-[#000666]/85" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <span className="text-[10px] uppercase font-bold text-[#000666] tracking-widest block mb-2">Enrollment Status: Confirmed</span>
          <h1 className="text-2xl md:text-3xl font-display font-black text-[#000666] mb-4">
            Awaiting Cohort Assignment
          </h1>
          
          <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6">
            Welcome, <strong>{userData?.fullName || "Candidate"}</strong>! Your commitment levy has been successfully received and verified. 
          </p>

          <div className="bg-[#000666]/5 rounded-xl p-4 text-xs text-[#000666] leading-relaxed font-semibold max-w-md mx-auto mb-8 border border-[#000666]/10 text-left">
            <span className="font-bold text-[10px] uppercase tracking-wider block mb-1">Admissions Notice</span>
            Our team is currently finalizing your student account parameters. You will receive an automated email confirmation with your course schedules as soon as an administrator assigns your training cohort.
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="border border-[#000666]/20 hover:bg-slate-55 text-[#000666] font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-rose-50 border border-rose-200 rounded-2xl">
        <p className="text-rose-700 font-medium text-sm mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
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
        return d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return "August 31, 2026";
      }
    };

    const getOrdinalDay = (isoString: string) => {
      try {
        const d = new Date(isoString);
        const day = d.getDate();
        const month = d.toLocaleDateString("en-US", { month: "long" });
        const year = d.getFullYear();
        
        let suffix = "th";
        if (day === 1 || day === 21 || day === 31) suffix = "st";
        else if (day === 2 || day === 22) suffix = "nd";
        else if (day === 3 || day === 23) suffix = "rd";
        
        return `${month} ${day}${suffix}, ${year}`;
      } catch {
        return "August 31st, 2026";
      }
    };

    return (
      <div className="flex-grow flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/50 p-6 md:p-12 lg:p-16 flex flex-col items-center text-center mx-auto shadow-sm select-none">
          {/* Hourglass Icon */}
          <svg
            className="w-16 h-16 text-sky-400/70 mb-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 2h12M6 22h12M6 2c0 4 3 6 3 10s-3 6-3 10M18 2c0 4-3 6-3 10s3 6 3 10M9 8h6M10 16h4"
            />
          </svg>

          {/* COMING SOON Badge */}
          <div className="bg-[#000666] text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest select-none mb-6">
            <HiOutlineClock className="w-3.5 h-3.5" />
            Coming Soon
          </div>

          {/* Welcome Heading */}
          <h1 className="text-3xl md:text-4xl font-display font-black text-[#000666] mb-4">
            Curriculum Modules
          </h1>

          {/* Dynamic launch text */}
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-8 font-medium">
            The learning curriculum and coursework modules are currently locked. Full access to all units and interactive training files will be granted upon official program commencement on{" "}
            <strong className="text-[#000666]">{getOrdinalDay(cohortStartDate)}</strong>.
          </p>

          {/* Launch Date Border Box */}
          <div className="border border-[#000666]/30 rounded-xl px-8 py-5 max-w-xs w-full mx-auto bg-slate-50/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">
              Program Launch Date
            </span>
            <span className="text-xl font-display font-black text-[#000666]">
              {formatCohortDate(cohortStartDate)}
            </span>
          </div>

          {/* Quote Footer */}
          <p className="text-xs text-slate-450 italic mt-12 font-medium max-w-md leading-relaxed">
            "Preparation is the foundation of excellence. We look forward to beginning this journey with you."
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
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Modules & Coursework</h1>
        <p className="text-slate-500 text-sm sm:text-base">Master Islamic Finance foundations, structuring, and banking parameters.</p>
      </div>

      {/* Global Progress Card */}
      {totalCount > 0 && (
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 hover:border-slate-300">
          <div>
            <h2 className="font-bold text-[#000666] text-base mb-1">Coursework Progression</h2>
            <p className="text-slate-500 text-xs">{completedCount} of {totalCount} modules completed</p>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#000666]">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-[#000666] h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {taskRewardSummary && (
        <div className="bg-gradient-to-r from-[#000666] via-[#081B72] to-[#0B2A8A] text-white rounded-2xl p-6 sm:p-7 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border border-white/10">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-200 font-bold">Coursework Task Progression</p>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {taskRewardSummary.passedModules} Approved Task{taskRewardSummary.passedModules === 1 ? "" : "s"} Completed
            </h2>
            <p className="text-xs text-sky-100/90 font-medium">
              All required practical exercises and submissions verified.
            </p>
          </div>
          <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 lg:max-w-md shrink-0">
            <span className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] select-none ${
              taskRewardSummary.status === "qualified" 
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-300/40" 
                : "bg-amber-400/20 text-amber-200 border border-amber-300/40"
            }`}>
              {taskRewardSummary.status === "qualified" ? "Requirements Met" : "In Progress"}
            </span>
            <p className="text-xs text-sky-100 leading-snug font-medium">
              {taskRewardSummary.message}
            </p>
          </div>
        </div>
      )}

      {/* Modules Stack */}
      <div className="space-y-6">
        {modules.map((mod) => {
          const isLocked = mod.status === "locked";
          const isCompleted = mod.status === "completed";
          const isInProgress = mod.status === "in_progress";
          const isNotStarted = mod.status === "not_started" || (!isLocked && !isCompleted && !isInProgress);

          return (
            <div 
              key={mod._id}
              className={`bg-white border rounded-2xl p-4 sm:p-6 relative overflow-hidden transition-all duration-300 ${
                isLocked 
                  ? "border-slate-200/60 opacity-75 select-none" 
                  : "border-[#E7E2D8] hover:border-slate-300 hover:shadow-md hover:translate-y-[-1px]"
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 w-full h-1 ${
                isCompleted 
                  ? "bg-emerald-500" 
                  : isInProgress 
                    ? "bg-[#000666]" 
                    : "bg-slate-200"
              }`} />

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  {/* Top line: Module number + Status + Type icon */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Module {mod.order}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {isInProgress && (
                        <span className="bg-[#000666]/5 text-[#000666] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#000666]/15">
                          In Progress
                        </span>
                      )}
                      {isNotStarted && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                          Not Started
                        </span>
                      )}
                      {isLocked && (
                        <span className="bg-slate-100 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <HiOutlineLockClosed className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {mod.pdfUrl && (
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200/60 inline-flex items-center gap-1">
                          PDF Pack
                        </span>
                      )}
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-[#000666]/5 border border-[#000666]/10 flex items-center justify-center shrink-0">
                      {isLocked ? (
                        <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        getContentTypeIcon(mod.contentType)
                      )}
                    </div>
                  </div>

                  <h3 className={`text-base sm:text-lg font-bold font-display leading-snug mb-1.5 break-words ${
                    isLocked ? "text-slate-400" : "text-[#000666]"
                  }`}>
                    {mod.title}
                  </h3>
                  {mod.description && (
                    <p className={`text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 mb-3 break-words ${
                      isLocked ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {mod.description}
                    </p>
                  )}

                  {/* Compact Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Week {mod.weekNumber || mod.order}</span>
                    {mod.outline?.topics && mod.outline.topics.length > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{mod.outline.topics.length} Topics</span>
                      </>
                    )}
                    {mod.pdfUrl && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                          📄 PDF Available
                        </span>
                      </>
                    )}
                    {mod.assessmentId && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1 text-[#000666] font-medium">
                          <HiOutlineAcademicCap className="w-3.5 h-3.5" /> Assessment
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 sm:pt-0 sm:self-center shrink-0 w-full sm:w-auto">
                  {isLocked ? (
                    <button
                      disabled
                      className="w-full sm:w-auto bg-slate-100 text-slate-400 font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <HiOutlineLockClosed className="w-4 h-4" /> Locked
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/modules/${mod._id}/outline`}
                      className={`w-full sm:w-auto inline-flex items-center justify-center font-bold text-xs tracking-wider uppercase px-5 py-2.5 rounded-xl shadow-xs transition-all text-center ${
                        isCompleted
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-[#000666] hover:bg-[#000666]/90 text-white hover:scale-[1.01]"
                      }`}
                    >
                      <span>{isCompleted ? "Review Module" : isInProgress ? "Resume Course" : "Start Learning"}</span>
                      <HiOutlineArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
