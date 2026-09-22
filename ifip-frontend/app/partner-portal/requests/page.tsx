"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineChevronRight,
  HiOutlineFunnel,
  HiOutlineXMark,
} from "react-icons/hi2";
import { getMyInterests, withdrawInterest, PartnerInterestItem } from "@/lib/api/partner";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PartnerInterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Withdraw Modal State
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await getMyInterests();
      setRequests(res.interests || []);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleWithdrawSubmit = async () => {
    if (!withdrawTargetId) return;
    setActioningId(withdrawTargetId);
    try {
      await withdrawInterest(withdrawTargetId);
      setWithdrawTargetId(null);
      await fetchRequests();
    } catch (err) {
      console.error("Failed to withdraw request:", err);
    } finally {
      setActioningId(null);
    }
  };

  const filtered = requests.filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000666] tracking-tight">
            My Interest Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Track candidate selection requests submitted to IFIP admissions.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {["all", "pending", "approved", "declined"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-white text-[#000666] font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Card List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <HiOutlineFunnel className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Requests Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {statusFilter === "all"
              ? "You haven't submitted any candidate interest requests yet."
              : `No requests with status "${statusFilter}".`}
          </p>
          <Link
            href="/partner-portal/interns"
            className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>Browse Intern Pool</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              {/* Left Info */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-[#000666] font-bold text-sm flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                  {req.intern?.fullName?.charAt(0) || "C"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <span>{req.intern?.fullName || "Candidate"}</span>
                  </h3>
                  
                  {/* Role, Work Mode, Domain text */}
                  {(req.role || req.workType || req.interestArea) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mt-1 flex-wrap">
                      {req.role && <span>Role: <strong className="text-slate-800">{req.role}</strong></span>}
                      {req.workType && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span>{req.workType}</span>
                        </>
                      )}
                      {req.interestArea && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span>{req.interestArea}</span>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-1.5 font-medium">
                    Submitted on: {new Date(req.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {req.note && (
                    <p className="text-xs text-slate-700 mt-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <strong>Note:</strong> &quot;{req.note}&quot;
                    </p>
                  )}
                  {req.status === "declined" && req.adminReason && (
                    <p className="text-xs text-rose-700 mt-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-medium">
                      Admin note: {req.adminReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Status Badge & Actions */}
              <div className="flex items-center space-x-3 self-end sm:self-auto">
                {req.status === "pending" && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    <HiOutlineClock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Review</span>
                  </span>
                )}
                {req.status === "approved" && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Approved Placement</span>
                  </span>
                )}
                {req.status === "declined" && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                    <HiOutlineXCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Declined</span>
                  </span>
                )}

                {req.status === "pending" && (
                  <button
                    onClick={() => setWithdrawTargetId(req._id)}
                    disabled={actioningId === req._id}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                    <span>Withdraw</span>
                  </button>
                )}

                <Link
                  href={`/partner-portal/interns/${req.userId}`}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  <HiOutlineUser className="w-3.5 h-3.5 text-slate-500" />
                  <span>Profile</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineTrash className="w-5 h-5 text-rose-600" />
                <span>Withdraw Request</span>
              </h2>
              <button
                type="button"
                onClick={() => setWithdrawTargetId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to withdraw this interest request? This will remove your request from IFIP admin consideration.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawTargetId(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdrawSubmit}
                disabled={actioningId === withdrawTargetId}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                {actioningId === withdrawTargetId ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  "Confirm Withdraw"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
