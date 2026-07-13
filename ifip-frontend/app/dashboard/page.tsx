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
  HiOutlineClock
} from "react-icons/hi2";
import { getMyApplication, getCohortConfig } from "@/lib/api/services";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profile, config] = await Promise.all([
          getMyApplication(),
          getCohortConfig()
        ]);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
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
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/50 p-12 md:p-16 flex flex-col items-center text-center mx-auto shadow-sm select-none">
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
          <h1 className="text-4xl font-display font-black text-[#000666] mb-4">
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

  return (
    <div className="flex flex-col gap-8 animate-fadeIn font-sans">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-display font-black text-[#000666]">
            Welcome Back, {userData?.fullName || "Candidate"}
          </h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Workspace Overview &bull; Batch 2026-A
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="bg-sky-400 hover:bg-sky-500 text-[#000666] font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all hover-lift flex items-center gap-1.5 self-start cursor-pointer"
        >
          <HiOutlineUser className="w-4 h-4" />
          Update Profile
        </Link>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Commencement Update Card (Spans 2 columns) */}
        <div className="md:col-span-2 bg-[#0E1B5D] text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between border border-[#000666]/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className="flex flex-col gap-5">
            {/* Banner Badge */}
            <div className="bg-sky-400/20 border border-sky-400/30 rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-sky-300 uppercase tracking-wider self-start select-none">
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              Cohort Announcement
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold font-display text-white">
                Islamic Finance Program Commencement Update
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium mt-1">
                Your academic placement and commitment levy verification are complete. The Batch 2026 Fall-A preparatory portal and learning modules will unlock sequentially upon official cohort kickoff.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-white/10 pt-6 mt-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
                <HiOutlineCalendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Scheduled Start Date</span>
                <span className="text-xs font-bold text-white">August 31, 2026</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
                <HiOutlineBookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Academic Modules</span>
                <span className="text-xs font-bold text-white">10 Coursework Track Units</span>
              </div>
            </div>
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
                <span className="text-slate-500">0 of 10</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Assessments Completed</span>
                <span className="text-slate-500">0 of 5</span>
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
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-slate-300 rounded-full" style={{ width: "0%" }}></div>
            </div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Awaiting Commencement Kickoff
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps Checklist Section */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col gap-6 mt-2">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-[#000666] font-display">Workspace Checklist</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Ensure your configuration parameters are complete before the cohort launch date.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Item 1 */}
          <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 shrink-0">
              <HiOutlineShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 text-left">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Commitment Levy Verified
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold uppercase tracking-wider">Done</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Your payment of N20,000 / $30 has been successfully cleared and credited.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 shrink-0">
              <HiOutlineClipboardDocumentCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 text-left">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Participant Password Set
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold uppercase tracking-wider">Done</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Your credentials are secure. You can update your password in Settings at any time.
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              cvUploaded
                ? "bg-emerald-50 border border-emerald-150 text-emerald-600"
                : "bg-amber-50 border border-amber-150 text-amber-600 animate-pulse"
            }`}>
              {cvUploaded ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineBookOpen className="w-5 h-5" />}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 text-left">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                CV &amp; Professional Qualifications
                {cvUploaded ? (
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold uppercase tracking-wider">Uploaded</span>
                ) : (
                  <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100 font-bold uppercase tracking-wider animate-pulse">Required</span>
                )}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Upload your latest CV in PDF format to complete admissions profiling.
              </p>
            </div>
            {!cvUploaded && (
              <Link
                href="/dashboard/settings"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform self-center cursor-pointer"
              >
                Upload Now
                <HiOutlineChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
