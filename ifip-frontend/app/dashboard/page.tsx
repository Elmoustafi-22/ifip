"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiOutlineSparkles,
  HiOutlineCalendar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineBookOpen,
  HiOutlineChevronRight,
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineVideoCamera,
  HiOutlineBriefcase,
  HiOutlineFolderMinus
} from "react-icons/hi2";
import { getMyApplication, getCohortConfig, getUpcomingSessions, getLMSModules, ProgrammeSession, LMSModule } from "@/lib/api/services";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");
  const [upcomingSessions, setUpcomingSessions] = useState<ProgrammeSession[]>([]);
  const [modules, setModules] = useState<LMSModule[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profile, config, sessions, mods] = await Promise.all([
          getMyApplication(),
          getCohortConfig(),
          getUpcomingSessions().catch(() => []),
          getLMSModules().catch(() => [])
        ]);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
        setUpcomingSessions(sessions || []);
        setModules(mods || []);
      } catch (err) {
        console.error("Failed to load dashboard parameters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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
      const suffix = ["th", "st", "nd", "rd"];
      const v = day % 100;
      const ord = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
      return `${month} ${day}${ord}`;
    } catch {
      return "August 31st";
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
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-slate-400 font-semibold">Loading dashboard parameters...</p>
      </div>
    );
  }

  if (!isLaunched) {
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
            Welcome to IFIP
          </h1>

          {/* Dynamic launch text */}
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-8 font-medium">
            The program is currently in pre-launch. Full access to training modules and assessments will be granted on{" "}
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

  const cvUploaded = !!userData?.cvUrl;

  // Live module/assessment stats (Fix 3)
  const totalModules = modules.length;
  const completedModules = modules.filter(m => m.status === 'completed').length;
  const totalAssessments = modules.filter(m => m.assessmentId).length;
  const passedAssessments = modules.filter(m => m.assessmentId && m.assessmentStatus === 'passed').length;
  const modulesLabel = totalModules > 0 ? `${totalModules} Coursework Track Unit${totalModules === 1 ? '' : 's'}` : 'Modules loading...';
  const modulesUnlocked = modules.filter(m => m.status !== 'locked').length;

  // Active module: first in_progress or unlocked module, or first module
  const currentModule = modules.find(m => m.status === 'in_progress') 
    || modules.find(m => m.status === 'unlocked') 
    || modules[0];

  return (
    <div className="flex flex-col gap-8 animate-fadeIn font-sans">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl md:text-2xl font-display font-black text-[#000666]">
            Welcome Back, {userData?.fullName || "Candidate"}
          </h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Workspace Overview &bull; Batch 2026-A
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="hidden md:inline-flex bg-sky-400 hover:bg-sky-500 text-[#000666] font-bold text-xs px-4 py-2 rounded-lg shadow-xs transition-all hover-lift items-center gap-1.5 self-start cursor-pointer"
        >
          <HiOutlineUser className="w-4 h-4" />
          Update Profile
        </Link>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Learning Hub / Resume Coursework (Spans 2 columns) */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#0E1B5D] via-[#091342] to-[#000666] text-white rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col justify-between border border-[#000666]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="flex flex-col gap-4 relative z-10">
            {/* Status / Track Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="bg-sky-400/20 border border-sky-400/30 rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-sky-300 uppercase tracking-wider self-start select-none">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-sky-300" />
                {currentModule ? `Week ${currentModule.weekNumber || 1} • Active Coursework Track` : "Cohort Track"}
              </div>
              <span className="text-[11px] text-slate-300 font-semibold">
                Batch 2026-A
              </span>
            </div>

            {/* Current Module Title & Context */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                {currentModule?.title || "Islamic Finance Professional Modules"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-xl">
                {currentModule?.description || "Master industry-standard Islamic banking principles, Sukuk structuring, and Shariah governance frameworks."}
              </p>
            </div>
          </div>

          {/* Quick Metrics & CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-white/10 pt-5 mt-6 gap-4 relative z-10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
                  <HiOutlineBookOpen className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Coursework</span>
                  <span className="text-xs font-bold text-white">
                    {completedModules} of {totalModules} Completed
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
                  <HiOutlineCalendar className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cohort Start</span>
                  <span className="text-xs font-bold text-white">{formatCohortDate(cohortStartDate)}</span>
                </div>
              </div>
            </div>

            <Link
              href={currentModule ? `/dashboard/modules/${currentModule._id}` : "/dashboard/modules"}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#000666] font-bold text-xs shadow-md transition-all hover-lift shrink-0 cursor-pointer"
            >
              <span>{completedModules > 0 ? "Continue Learning" : "Start Coursework"}</span>
              <HiOutlineArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Progress Sidebar Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#000666] uppercase tracking-wide border-b border-slate-100 pb-3">
              LMS Status
            </h3>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Placement Level</span>
                <span className="text-[#000666]">Batch 2026-A</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Modules Unlocked</span>
                {/* Fix 3: live module count */}
                <span className="text-slate-500">{modulesUnlocked} of {totalModules || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Assessments Completed</span>
                {/* Fix 3: live assessment count */}
                <span className="text-slate-500">{passedAssessments} of {totalAssessments || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Profile Completion</span>
                <span className={`font-bold ${cvUploaded ? "text-emerald-600" : "text-amber-500"}`}>
                  {cvUploaded ? "100% Completed" : "80% (Upload CV)"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600">Overall Progress</span>
              <span className="text-[#000666]">{totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-[#0E1B5D] to-[#FF9800] rounded-full transition-all duration-500"
                style={{ width: `${totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%` }}
              ></div>
            </div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
              <span className={`w-1.5 h-1.5 rounded-full ${completedModules > 0 ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              {completedModules > 0 ? `${completedModules} of ${totalModules} completed` : "Awaiting Commencement Kickoff"}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Timetable Sessions Widget */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col gap-5 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#000666] font-display flex items-center gap-2">
              <HiOutlineCalendar className="w-5 h-5 text-[#FF9800]" />
              <span>Upcoming Live Sessions &amp; Calendar</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Live lectures, group breakouts, and timetable checkpoints for your cohort.
            </p>
          </div>
          <Link
            href="/dashboard/schedule"
            className="text-xs font-bold text-[#000666] hover:text-[#FF9800] inline-flex items-center gap-1 shrink-0"
          >
            <span>View Full 4-Week Timetable</span>
            <HiOutlineArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
            <p>No upcoming live sessions in the next few days.</p>
            <Link
              href="/dashboard/schedule"
              className="mt-2 inline-block text-xs font-bold text-sky-600 hover:underline"
            >
              Check the full 4-week timetable &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map((sess) => {
              const dateObj = new Date(sess.sessionDate);
              return (
                <div
                  key={sess._id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex flex-col justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#000666] bg-white border border-slate-200 px-2 py-0.5 rounded">
                        Week {sess.weekNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-[#000666] line-clamp-2">
                      {sess.title}
                    </h4>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="w-3 h-3 text-slate-400" />
                        {dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>•</span>
                      <span>{sess.durationMinutes || 60}m</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    {sess.meetingUrl ? (
                      <a
                        href={sess.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1"
                      >
                        <HiOutlineVideoCamera className="w-3.5 h-3.5" />
                        Join Meeting
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Scheduled</span>
                    )}

                    <Link
                      href="/dashboard/schedule"
                      className="text-[11px] font-semibold text-[#000666] hover:underline"
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Required Alert Banner (Only shown if CV is still missing) */}
      {!cvUploaded && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <HiOutlineBookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                Action Required: Upload CV &amp; Qualifications
              </h4>
              <p className="text-xs text-amber-800/80 font-medium mt-0.5">
                Upload your latest CV in PDF format to complete your admissions file.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <span>Upload Now</span>
            <HiOutlineChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Weekly Milestones & Program Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col gap-5 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#000666] font-display">
              Weekly Milestones &amp; Program Hub
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Key checkpoint tracks and resources for your current cohort progression.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Assessments */}
          <Link
            href="/dashboard/assessments"
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#000666] shrink-0">
                <HiOutlineClipboardDocumentCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600">
                {passedAssessments > 0 ? `${passedAssessments} Passed` : "Assessments"}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#000666] group-hover:text-sky-600 transition-colors">
                Module Assessments
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Unit test checkpoints, quizzes, and simulations.
              </p>
            </div>
            <span className="text-xs font-bold text-sky-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
              View Tasks &rarr;
            </span>
          </Link>

          {/* Card 2: Placement */}
          <Link
            href="/dashboard/placement"
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <HiOutlineBriefcase className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {cvUploaded ? "Profile On File" : "CV Required"}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#000666] group-hover:text-emerald-700 transition-colors">
                Placement &amp; Careers
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Subject to coursework completion and company review.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Placement Hub &rarr;
            </span>
          </Link>

          {/* Card 3: Resources */}
          <Link
            href="/dashboard/resources"
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <HiOutlineFolderMinus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600">
                Library
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#000666] group-hover:text-indigo-700 transition-colors">
                Knowledge Resources
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Shariah standards, contract templates, and reading packs.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Open Library &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
