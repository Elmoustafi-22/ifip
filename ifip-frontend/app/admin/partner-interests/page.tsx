"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  HiOutlineArrowsRightLeft,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineBuildingOffice2,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineFunnel,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getAdminPartnerInterests,
  approvePartnerInterest,
  declinePartnerInterest,
  AdminPartnerInterest,
} from "@/lib/api/partner";

export default function AdminPartnerInterestsPage() {
  const [interests, setInterests] = useState<AdminPartnerInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Decline Modal
  const [declineTarget, setDeclineTarget] = useState<AdminPartnerInterest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [submittingDecline, setSubmittingDecline] = useState(false);

  // Approve Modal
  const [approveTarget, setApproveTarget] = useState<AdminPartnerInterest | null>(null);
  const [submittingApprove, setSubmittingApprove] = useState(false);

  const fetchInterests = async () => {
    try {
      const data = await getAdminPartnerInterests(statusFilter === "all" ? undefined : statusFilter);
      setInterests(data || []);
    } catch (err) {
      console.error("Failed to load partner interest requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, [statusFilter]);

  const handleApproveSubmit = async () => {
    if (!approveTarget) return;
    setSubmittingApprove(true);
    setActioningId(approveTarget._id);
    try {
      await approvePartnerInterest(approveTarget._id);
      setApproveTarget(null);
      await fetchInterests();
    } catch (err) {
      console.error("Failed to approve request:", err);
    } finally {
      setSubmittingApprove(false);
      setActioningId(null);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTarget) return;
    setSubmittingDecline(true);
    try {
      await declinePartnerInterest(declineTarget._id, declineReason);
      setDeclineTarget(null);
      setDeclineReason("");
      await fetchInterests();
    } catch (err) {
      console.error("Failed to decline request:", err);
    } finally {
      setSubmittingDecline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineArrowsRightLeft className="w-6 h-6 text-emerald-600" />
            <span>Partner Interest Requests Desk</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review candidate interest requests submitted by onboarded partner organisations.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {["pending", "approved", "declined", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Roster / Requests Queue */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : interests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <HiOutlineFunnel className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Interest Requests</h3>
          <p className="text-xs text-slate-500 mt-1">
            {statusFilter === "all"
              ? "No partner interest requests have been submitted yet."
              : `No requests found with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interests.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                {/* Partner Org Info */}
                <div className="flex items-center space-x-3">
                  {item.partnerOrgId?.logoUrl ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0">
                      <Image src={item.partnerOrgId.logoUrl} alt={item.partnerOrgId.name || ""} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold text-base flex items-center justify-center shrink-0">
                      {item.partnerOrgId?.name?.charAt(0) || "P"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.partnerOrgId?.name || "Partner Organisation"}</h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>Contact: {item.partnerOrgId?.contactPerson || "Rep"}</span>
                      <span>&bull;</span>
                      <a href={`mailto:${item.partnerOrgId?.contactEmail}`} className="text-emerald-700 hover:underline">
                        {item.partnerOrgId?.contactEmail}
                      </a>
                    </p>
                  </div>
                </div>

                {/* Requested Intern Info */}
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {item.userId?.avatarUrl ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200 shrink-0">
                      <Image src={item.userId.avatarUrl} alt={item.userId.fullName || ""} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.userId?.fullName?.charAt(0) || "I"}
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Requested Intern</span>
                    <span className="text-xs font-bold text-slate-800">{item.userId?.fullName || item.userId?.email}</span>
                  </div>
                </div>
              </div>

              {/* Note & Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-slate-500">
                    Requested on: <strong className="text-slate-700">{new Date(item.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  </p>
                  {item.note && (
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2 font-medium">
                      Partner Note: &quot;{item.note}&quot;
                    </p>
                  )}
                  {item.status === "declined" && item.adminReason && (
                    <p className="text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 mt-2 font-medium">
                      Decline Reason: {item.adminReason}
                    </p>
                  )}
                </div>

                {/* Status Badges & Admin Actions */}
                <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                  {item.status === "pending" && (
                    <>
                      <button
                        onClick={() => setApproveTarget(item)}
                        disabled={actioningId === item._id}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                      >
                        <HiOutlineCheckCircle className="w-4 h-4" />
                        <span>Approve Match</span>
                      </button>
                      <button
                        onClick={() => {
                          setDeclineTarget(item);
                          setDeclineReason("");
                        }}
                        disabled={actioningId === item._id}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors disabled:opacity-50"
                      >
                        <HiOutlineXCircle className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {item.status === "approved" && (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Approved Placement</span>
                    </span>
                  )}

                  {item.status === "declined" && (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                      <HiOutlineXCircle className="w-4 h-4 text-rose-600" />
                      <span>Declined</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <HiOutlineCheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Approve Placement Match</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Confirm placement & unlock candidate details</p>
                </div>
              </div>
              <button onClick={() => setApproveTarget(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-950 leading-relaxed font-medium">
              Approve this interest request? This will create a confirmed placement and unlock intern contact details for the partner.
            </div>

            {/* Target Details Summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Partner:</span>
                <span className="font-semibold text-slate-900">{approveTarget.partnerOrgId?.name || "Partner Organisation"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                <span className="text-slate-500">Requested Intern:</span>
                <span className="font-semibold text-slate-900">{approveTarget.userId?.fullName || approveTarget.userId?.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={submittingApprove}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {submittingApprove ? (
                  <span>Approving...</span>
                ) : (
                  <>
                    <HiOutlineCheckCircle className="w-4 h-4" />
                    <span>Confirm & Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineXCircle className="w-5 h-5 text-rose-600" />
                <span>Decline Interest Request</span>
              </h2>
              <button onClick={() => setDeclineTarget(null)} className="text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeclineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Reason (Emailed to partner)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Intern is already committed to another placement pipeline..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecline}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submittingDecline ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
