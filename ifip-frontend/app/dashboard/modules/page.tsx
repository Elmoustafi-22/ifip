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
  HiOutlineClock
} from "react-icons/hi2";
import { getLMSModules, LMSModule, getMyApplication, getCohortConfig } from "@/lib/api/services";

export default function ModulesPage() {
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");

  useEffect(() => {
    const fetchModulesData = async () => {
      try {
        const [modulesData, profile, config] = await Promise.all([
          getLMSModules(),
          getMyApplication(),
          getCohortConfig()
        ]);
        setModules(modulesData);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
      } catch (err: any) {
        console.error("Failed to load modules page parameters:", err);
        setError("Unable to retrieve coursework parameters. Please try again later.");
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
        return <HiOutlinePlay className="w-5 h-5 text-indigo-600" />;
      case "quiz":
      case "assignment":
        return <HiOutlineClipboardDocumentList className="w-5 h-5 text-rose-600" />;
      default:
        return <HiOutlineBookOpen className="w-5 h-5 text-amber-600" />;
    }
  };

  const getContentTypeBg = (type: string) => {
    switch (type) {
      case "video":
        return "bg-indigo-50 border-indigo-100";
      case "quiz":
      case "assignment":
        return "bg-rose-50 border-rose-100";
      default:
        return "bg-amber-50 border-amber-100";
    }
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

      {/* Modules Stack */}
      <div className="space-y-6">
        {modules.map((mod) => {
          const isLocked = mod.status === "locked";
          const isCompleted = mod.status === "completed";
          const isInProgress = mod.status === "in_progress";

          return (
            <div 
              key={mod._id}
              className={`bg-white border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
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
                    ? "bg-[#00B0FF]" 
                    : "bg-slate-200"
              }`} />

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  {/* Content Type Badge */}
                  <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${
                    isLocked ? "bg-slate-50 border-slate-100" : getContentTypeBg(mod.contentType)
                  }`}>
                    {isLocked ? (
                      <HiOutlineLockClosed className="w-5 h-5 text-slate-400" />
                    ) : (
                      getContentTypeIcon(mod.contentType)
                    )}
                  </div>

                  <div>
                    {/* Badge / Status Label */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Module {mod.order}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {isInProgress && (
                        <span className="bg-sky-50 text-[#00B0FF] text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-100">
                          In Progress
                        </span>
                      )}
                      {isLocked && (
                        <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-100">
                          Locked
                        </span>
                      )}
                    </div>

                    <h3 className={`text-lg font-bold font-display leading-tight mb-2 ${
                      isLocked ? "text-slate-400" : "text-[#000666]"
                    }`}>
                      {mod.title}
                    </h3>
                    <p className={`text-sm leading-relaxed max-w-xl ${
                      isLocked ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {mod.description}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-full px-3 py-1 text-xs font-medium">
                        <HiOutlineClock className="w-3.5 h-3.5" /> {mod.estimatedDuration} mins
                      </span>
                      <span className="bg-slate-50 border border-slate-100 text-slate-500 rounded-full px-3 py-1 text-xs font-medium capitalize">
                        {mod.contentType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Buttons */}
                <div className="sm:text-right shrink-0 flex items-center justify-end">
                  {isLocked ? (
                    <button 
                      disabled
                      className="bg-slate-100 text-slate-400 font-bold text-xs tracking-wider uppercase px-5 py-3 rounded-xl flex items-center gap-1.5 cursor-not-allowed"
                    >
                      <HiOutlineLockClosed className="w-4 h-4" /> Locked
                    </button>
                  ) : (
                    <Link 
                      href={`/dashboard/modules/${mod._id}`}
                      className={`inline-block font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-sm transition-all duration-200 text-center ${
                        isCompleted
                          ? "border border-[#E7E2D8] bg-[#FDFBF7] text-slate-600 hover:bg-slate-50"
                          : "bg-[#FF9800] hover:bg-[#FF9800]/90 text-white hover:scale-[1.01] hover:shadow-md"
                      }`}
                    >
                      {isCompleted ? "Review Module" : isInProgress ? "Resume Course" : "Start Module"}
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
