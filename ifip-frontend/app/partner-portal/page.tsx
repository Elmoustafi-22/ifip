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
  HiOutlineClipboardDocumentList,
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
      {/* Organization Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          {org?.logoUrl ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-50 p-2 border border-slate-200 shrink-0">
              <Image
                src={org.logoUrl}
                alt={org.name}
                fill
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-2xl text-[#000666] shrink-0">
              {org?.name?.charAt(0) || "P"}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#000666] tracking-tight">{org?.name}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Partner Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl line-clamp-2">
              {org?.description || "Partner portal for candidate matching and internship placements."}
            </p>
          </div>
        </div>

        <Link
          href="/partner-portal/interns"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#000666] hover:bg-[#000666]/90 text-white font-semibold text-xs transition-colors shadow-xs self-start md:self-auto cursor-pointer"
        >
          <span>Browse Intern Pool</span>
          <HiOutlineArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Pool</span>
            <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
              <HiOutlineUsers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#000666] mt-2">{stats?.availableInterns ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Available for selection</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <HiOutlineClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700 mt-2">{stats?.pendingRequests ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Awaiting admin review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Placements</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <HiOutlineCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-2">{stats?.confirmedPlacements ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Matched & interviewing</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slots Remaining</span>
            <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
              <HiOutlineBriefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#000666] mt-2">{stats?.slotsRemaining ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Of {org?.activeSlots ?? 5} total slots cap</p>
        </div>
      </div>

      {/* Action Items & Quick Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#000666] flex items-center space-x-2">
              <HiOutlineClipboardDocumentList className="w-5 h-5 text-slate-500" />
              <span>Placement Status &amp; Action Items</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status updates on your candidate requests and slot allocation.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/partner-portal/requests"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors border border-slate-200 cursor-pointer shadow-xs"
            >
              <span>View Requests</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/partner-portal/placements"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Manage Placements</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {(stats?.pendingRequests ?? 0) > 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
              You have <strong className="font-semibold text-slate-900">{stats?.pendingRequests}</strong> pending candidate request(s) awaiting IFIP admissions review.
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              No pending placement requests awaiting review.
            </div>
          )}
          {(stats?.slotsRemaining ?? 0) > 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
              Your organization has <strong className="font-bold text-[#000666]">{stats?.slotsRemaining}</strong> placement slot(s) available for intern matching.
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
