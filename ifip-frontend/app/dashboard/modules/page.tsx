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
import { getLMSModules, LMSModule } from "@/lib/api/services";

export default function ModulesPage() {
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await getLMSModules();
        setModules(data);
      } catch (err: any) {
        console.error("Failed to load modules:", err);
        setError("Unable to retrieve course modules. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
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
