"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  HiOutlineBriefcase,
  HiOutlineGlobeAlt,
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineTag,
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

  // Modals
  const [viewPartner, setViewPartner] = useState<AdminPartnerInterest["partnerOrgId"] | null>(null);
  const [viewCandidate, setViewCandidate] = useState<AdminPartnerInterest | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AdminPartnerInterest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [submittingDecline, setSubmittingDecline] = useState(false);
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
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineArrowsRightLeft className="w-6 h-6 text-emerald-600" />
            <span>Partner Interest Requests Desk</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review candidate interest requests submitted by partner organisations. Click on a partner or candidate to view their complete profile.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {["pending", "approved", "declined", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
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
                {/* Partner Org Info (Clickable for full details) */}
                <button
                  type="button"
                  onClick={() => item.partnerOrgId && setViewPartner(item.partnerOrgId)}
                  className="flex items-center space-x-3 text-left group p-1.5 -m-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Click to view full partner organization details"
                >
                  {item.partnerOrgId?.logoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 group-hover:border-emerald-500 transition-colors">
                      <Image src={item.partnerOrgId.logoUrl} alt={item.partnerOrgId.name || ""} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-emerald-400 font-bold text-lg flex items-center justify-center shrink-0 border border-slate-700">
                      {item.partnerOrgId?.name?.charAt(0) || "P"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {item.partnerOrgId?.name || "Partner Organisation"}
                      </h3>
                      <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>Contact: <strong className="text-slate-700 font-medium">{item.partnerOrgId?.contactPerson || "Lead"}</strong></span>
                      <span>&bull;</span>
                      <span className="text-emerald-700 font-medium">{item.partnerOrgId?.contactEmail}</span>
                    </p>
                  </div>
                </button>

                {/* Requested Intern Info (Clickable for full candidate profile) */}
                <button
                  type="button"
                  onClick={() => setViewCandidate(item)}
                  className="flex items-center space-x-3 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer text-left group"
                  title="Click to view candidate details and background"
                >
                  {item.userId?.avatarUrl ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                      <Image src={item.userId.avatarUrl} alt={item.userId.fullName || ""} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.userId?.fullName?.charAt(0) || "I"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 uppercase tracking-wider block">
                        Requested Candidate
                      </span>
                      <HiOutlineArrowTopRightOnSquare className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 block">
                      {item.userId?.fullName || item.userId?.email}
                    </span>
                  </div>
                </button>
              </div>

              {/* Request Metadata: Role, Work Mode, Interest Domain */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 font-medium">
                {item.role && <span>Role: <strong className="text-slate-800">{item.role}</strong></span>}
                {item.workType && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <span>Mode: <strong className="text-slate-800">{item.workType}</strong></span>
                  </>
                )}
                {item.interestArea && (
                  <>
                    <span className="text-slate-300">&bull;</span>
                    <span>Domain: <strong className="text-slate-800">{item.interestArea}</strong></span>
                  </>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  Requested on: <strong className="text-slate-600">{new Date(item.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
                </span>
              </div>

              {/* Note & Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs pt-2">
                <div className="flex-1">
                  {item.note && (
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                      <strong className="text-slate-900">Partner Message:</strong> &quot;{item.note}&quot;
                    </p>
                  )}
                  {item.status === "declined" && item.adminReason && (
                    <p className="text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mt-2 font-medium">
                      <strong>Decline Reason:</strong> {item.adminReason}
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
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <HiOutlineXCircle className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {item.status === "approved" && (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Approved Placement</span>
                    </span>
                  )}

                  {item.status === "declined" && (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-rose-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Declined</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Partner Details Modal */}
      {viewPartner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3.5">
                {viewPartner.logoUrl ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0">
                    <Image src={viewPartner.logoUrl} alt={viewPartner.name} fill className="object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-800 text-emerald-400 font-bold text-xl flex items-center justify-center shrink-0">
                    {viewPartner.name?.charAt(0) || "P"}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-slate-900">{viewPartner.name}</h2>
                  {viewPartner.website && (
                    <a
                      href={viewPartner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:underline flex items-center space-x-1 mt-0.5"
                    >
                      <HiOutlineGlobeAlt className="w-3.5 h-3.5" />
                      <span>{viewPartner.website}</span>
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewPartner(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            {viewPartner.description && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">About Organization</h3>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {viewPartner.description}
                </p>
              </div>
            )}

            {/* Contact & Quota Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Person</span>
                <p className="font-semibold text-slate-800">{viewPartner.contactPerson || "Not specified"}</p>
                <p className="text-slate-500">{viewPartner.contactEmail}</p>
                {viewPartner.contactPhone && <p className="text-slate-500">{viewPartner.contactPhone}</p>}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Slot Quota</span>
                <p className="font-semibold text-slate-800 text-sm">{viewPartner.activeSlots ?? 5} Slots Allocated</p>
                <p className="text-[11px] text-slate-500">
                  Portal Status: <strong className={viewPartner.portalEnabled ? "text-emerald-600" : "text-slate-600"}>{viewPartner.portalEnabled ? "Active" : "Disabled"}</strong>
                </p>
              </div>
            </div>

            {/* Sector Tags */}
            {viewPartner.sectorTags && viewPartner.sectorTags.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Industry Sectors</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewPartner.sectorTags.map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active Openings */}
            {viewPartner.openings && viewPartner.openings.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registered Positions / Openings</h3>
                <div className="space-y-2">
                  {viewPartner.openings.map((op, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <strong className="text-slate-800 font-bold">{op.role}</strong>
                        {op.location && <span className="text-slate-500 ml-1.5">• {op.location}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold text-[11px]">
                          {op.mode}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {op.count} {op.count === 1 ? "Slot" : "Slots"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewPartner(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Details Modal */}
      {viewCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                {viewCandidate.userId?.avatarUrl ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0">
                    <Image src={viewCandidate.userId.avatarUrl} alt={viewCandidate.userId.fullName || ""} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-400 font-bold text-base flex items-center justify-center shrink-0">
                    {viewCandidate.userId?.fullName?.charAt(0) || "I"}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-slate-900">{viewCandidate.userId?.fullName}</h2>
                  <p className="text-xs text-slate-500">{viewCandidate.userId?.email} {viewCandidate.userId?.phone ? `• ${viewCandidate.userId.phone}` : ""}</p>
                </div>
              </div>
              <button
                onClick={() => setViewCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Academic Info */}
            {viewCandidate.application?.academic && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Background</span>
                <p className="font-bold text-slate-900">{viewCandidate.application.academic.qualification || "Degree"}</p>
                <p className="text-slate-600">{viewCandidate.application.academic.institution} • Field: {viewCandidate.application.academic.fieldOfStudy}</p>
                {viewCandidate.application.academic.gradYear && (
                  <p className="text-slate-500">Graduation Year: {viewCandidate.application.academic.gradYear}</p>
                )}
              </div>
            )}

            {/* Skills & Tools */}
            {viewCandidate.application?.skills && (
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skills & Tools</span>
                <div className="flex flex-wrap gap-1">
                  {(viewCandidate.application.skills.tools || []).concat(viewCandidate.application.skills.programmingLanguages || []).map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CV Download Link */}
            {viewCandidate.application?.cvUrl && (
              <div className="pt-2">
                <a
                  href={viewCandidate.application.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <HiOutlineDocumentText className="w-4 h-4" />
                  <span>View Candidate CV / Resume</span>
                </a>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
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
              <button onClick={() => setApproveTarget(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
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
              {approveTarget.role && (
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Role & Mode:</span>
                  <span className="font-semibold text-slate-900">{approveTarget.role} ({approveTarget.workType || "Standard"})</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={submittingApprove}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
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
              <button onClick={() => setDeclineTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecline}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
