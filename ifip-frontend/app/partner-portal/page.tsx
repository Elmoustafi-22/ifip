"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineBriefcase,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentCheck,
  HiOutlineBuildingOffice2,
  HiOutlineExclamationCircle,
} from "react-icons/hi2";
import { getPartnerMe, PartnerMeResponse } from "@/lib/api/partner";

export default function PartnerOverviewPage() {
  const [data, setData] = useState<PartnerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await getPartnerMe();
        setData(res);
      } catch (err) {
        console.error("Failed to load partner overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
        <div className="h-48 bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  const org = data?.org;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#000666] via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            {org?.logoUrl ? (
              <div className="relative w-14 h-14 rounded-xl bg-white p-1 border border-white/20 shadow-md shrink-0">
                <Image src={org.logoUrl} alt={org.name} fill className="object-contain p-1" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-lg">
                {org?.name?.charAt(0) || "P"}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{org?.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Islamic Finance Internship Preparatory & Placement Program - Cohort 2026
              </p>
            </div>
          </div>
          <Link
            href="/partner-portal/interns"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shrink-0 cursor-pointer"
          >
            <HiOutlineUsers className="w-4 h-4" />
            <span>Browse Intern Pool</span>
            <HiOutlineArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Interns</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <HiOutlineUsers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.availableInterns ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Placement-ready candidate pool</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Requests</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <HiOutlineClock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.pendingRequests ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting IFIP admin review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmed Placements</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <HiOutlineCheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.confirmedPlacements ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Matched & interviewing</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slots Remaining</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
              <HiOutlineBriefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.slotsRemaining ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Of {org?.activeSlots ?? 5} total slots cap</p>
        </div>
      </div>

      {/* Cohort Pipeline Phase & Action Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cohort Phase Indicator */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineSparkles className="w-5 h-5 text-emerald-600" />
            <span>Cohort 2026 Program Lifecycle</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <HiOutlineAcademicCap className="w-4 h-4 text-slate-500" />
                <span>Phase 1: Curriculum</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Modules & Coursework</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <HiOutlineClipboardDocumentCheck className="w-4 h-4 text-slate-500" />
                <span>Phase 2: Assessment</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Final Evaluation & Badge</p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 relative">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase mb-2">
                <HiOutlineBuildingOffice2 className="w-4 h-4 text-emerald-600" />
                <span>Phase 3: Placement</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Partner Matching & Selection</p>
            </div>
          </div>
        </div>

        {/* Action Prompts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <HiOutlineExclamationCircle className="w-5 h-5 text-amber-500" />
              <span>Action Items</span>
            </h2>
            <div className="space-y-3">
              {(stats?.pendingRequests ?? 0) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  You have <strong className="font-bold">{stats?.pendingRequests}</strong> pending request(s) awaiting IFIP admin review.
                </div>
              )}
              {(stats?.slotsRemaining ?? 0) > 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  You have <strong className="font-bold">{stats?.slotsRemaining}</strong> available slot(s) remaining for candidate matching.
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  Your organisation has reached its maximum placement slot allocation.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/partner-portal/requests"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              <span>View Requests</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/partner-portal/placements"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Manage Placements</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
