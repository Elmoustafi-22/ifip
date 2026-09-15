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
        <div className="h-32 bg-slate-200/70 rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="h-40 bg-slate-200/70 rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const org = data?.org;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-sm border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {org?.logoUrl ? (
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/10 p-2 border border-white/20 shrink-0 backdrop-blur-sm">
                <Image
                  src={org.logoUrl}
                  alt={org.name}
                  fill
                  className="object-contain p-1"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-2xl text-emerald-400 shrink-0">
                {org?.name?.charAt(0) || "P"}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{org?.name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Partner Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl line-clamp-2">
                {org?.description || "Partner portal for candidate matching and internship placements."}
              </p>
            </div>
          </div>

          <Link
            href="/partner-portal/interns"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs self-start md:self-auto cursor-pointer"
          >
            <span>Browse Intern Pool</span>
            <HiOutlineArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Pool</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <HiOutlineUsers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.availableInterns ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Available for selection</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Requests</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <HiOutlineClock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{stats?.pendingRequests ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting admin review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Placements</span>
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

      {/* Action Items & Quick Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <HiOutlineExclamationCircle className="w-5 h-5 text-amber-500" />
              <span>Placement Status & Action Items</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status updates on your candidate requests and slot allocation.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/partner-portal/requests"
              className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              <span>View Requests</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/partner-portal/placements"
              className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Manage Placements</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {(stats?.pendingRequests ?? 0) > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              You have <strong className="font-bold">{stats?.pendingRequests}</strong> pending request(s) awaiting IFIP admin review.
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              No pending placement requests awaiting review.
            </div>
          )}
          {(stats?.slotsRemaining ?? 0) > 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              You have <strong className="font-bold">{stats?.slotsRemaining}</strong> available slot(s) remaining for candidate matching.
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              Your organisation has reached its maximum placement slot allocation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
