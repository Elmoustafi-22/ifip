"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlineCheck,
} from "react-icons/hi2";
import {
  getAdminJobOpenings,
  getAdminJobOpeningById,
  reviewAdminJobOpening,
  AdminJobOpeningItem,
} from "@/lib/api/services";

export default function AdminJobOpeningsPage() {
  const [openings, setOpenings] = useState<AdminJobOpeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal state
  const [selectedOpening, setSelectedOpening] = useState<AdminJobOpeningItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminRequirements, setAdminRequirements] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState<"approve" | "reject" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOpenings = async () => {
    setLoading(true);
    try {
      const res = await getAdminJobOpenings();
      setOpenings(res.openings || []);
    } catch (err: any) {
      console.error("Failed to load job openings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, []);

  const filteredOpenings = useMemo(() => {
    return openings.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.partner?.name && item.partner.name.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [openings, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = openings.length;
    const pending = openings.filter((o) => o.status === "pending_review").length;
    const open = openings.filter((o) => o.status === "open").length;
    const totalApps = openings.reduce((acc, o) => acc + (o.applicationCount || 0), 0);
    return { total, pending, open, totalApps };
  }, [openings]);

  const handleOpenReview = async (opening: AdminJobOpeningItem) => {
    setSelectedOpening(opening);
    setAdminNotes(opening.adminNotes || "");
    setAdminRequirements(opening.adminRequirements ? [...opening.adminRequirements] : []);
    setNewRuleInput("");
    setFeedbackMessage(null);

    // Fetch full details if needed
    setModalLoading(true);
    try {
      const detailed = await getAdminJobOpeningById(opening._id);
      setSelectedOpening(detailed);
      setAdminNotes(detailed.adminNotes || "");
      setAdminRequirements(detailed.adminRequirements ? [...detailed.adminRequirements] : []);
    } catch (err) {
      console.error("Failed to fetch opening detail:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddAdminRule = () => {
    const trimmed = newRuleInput.trim();
    if (!trimmed) return;
    setAdminRequirements((prev) => [...prev, trimmed]);
    setNewRuleInput("");
  };

  const handleRemoveAdminRule = (index: number) => {
    setAdminRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReviewSubmit = async (action: "approve" | "reject") => {
    if (!selectedOpening) return;
    setSubmittingAction(action);
    setFeedbackMessage(null);

    try {
      await reviewAdminJobOpening(selectedOpening._id, {
        action,
        adminNotes: adminNotes.trim() || undefined,
        adminRequirements: adminRequirements.filter((r) => r.trim()),
      });

      setFeedbackMessage({
        type: "success",
        text:
          action === "approve"
            ? "Job opening verified and declared open. Active participants and partner have been notified."
            : "Job opening rejected. Partner has been notified with your feedback.",
      });

      // Update in local state
      setOpenings((prev) =>
        prev.map((o) =>
          o._id === selectedOpening._id
            ? {
                ...o,
                status: action === "approve" ? "open" : "rejected",
                adminNotes: adminNotes.trim() || undefined,
                adminRequirements,
              }
            : o
        )
      );

      setTimeout(() => {
        setSelectedOpening(null);
        setFeedbackMessage(null);
      }, 1400);
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err?.response?.data?.message || err.message || "Failed to process review.",
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <HiOutlineClock className="w-3.5 h-3.5 text-amber-600" />
            Pending Verification
          </span>
        );
      case "open":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Open for Applications
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <HiOutlineXCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-[#000666]">Job Openings Verification</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review partner job submissions, add custom eligibility rules, and declare openings open to candidates.
          </p>
        </div>
        <button
          onClick={fetchOpenings}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition self-start sm:self-auto cursor-pointer"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Openings</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pending Review</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Declared Open</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.open}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidate Applications</div>
          <div className="text-2xl font-bold text-[#000666] mt-1">{stats.totalApps}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by role, partner, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] focus:bg-white transition"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "pending_review", label: "Pending Review" },
            { id: "open", label: "Open" },
            { id: "rejected", label: "Rejected" },
            { id: "closed", label: "Closed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#000666] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Openings List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
          <p className="text-sm text-slate-500 mt-3 font-medium">Loading job openings...</p>
        </div>
      ) : filteredOpenings.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <HiOutlineBriefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 mt-3">No Job Openings Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No openings match your current search or filter."
              : "Partners have not created any job openings yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOpenings.map((opening) => (
            <div
              key={opening._id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition gap-4"
            >
              <div className="space-y-3">
                {/* Top status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getStatusBadge(opening.status)}
                </div>

                {/* Role Title & Partner */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{opening.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                    <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium">{opening.partner?.name || "Partner Organisation"}</span>
                  </div>
                </div>

                {/* Meta Attributes */}
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-0.5">
                  <span>{opening.workMode}</span>
                  {opening.location && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span>{opening.location}</span>
                    </>
                  )}
                  <span className="text-slate-300">&bull;</span>
                  <span>{opening.slots} {opening.slots === 1 ? "Slot" : "Slots"}</span>
                </div>

                {/* Application Count */}
                <div className="text-xs text-slate-500">
                  Applications received:{" "}
                  <strong className="text-slate-800">{opening.applicationCount || 0}</strong>
                </div>

                {/* Requirements Summary */}
                {((opening.requirements && opening.requirements.length > 0) ||
                  (opening.adminRequirements && opening.adminRequirements.length > 0)) && (
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span className="font-semibold text-slate-700">Rules & Requirements: </span>
                    {(opening.requirements?.length || 0) + (opening.adminRequirements?.length || 0)} specified
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenReview(opening)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    opening.status === "pending_review"
                      ? "bg-[#000666] text-white hover:bg-[#000666]/90 shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <HiOutlineDocumentText className="w-4 h-4" />
                  {opening.status === "pending_review" ? "Review & Declare Open" : "View Details & Rules"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="mb-1">
                  {getStatusBadge(selectedOpening.status)}
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {selectedOpening.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisation:{" "}
                  <strong className="text-slate-700">
                    {selectedOpening.partner?.name || "Partner Organisation"}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedOpening(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-[#000666]" />
                <p className="mt-2">Loading full details...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm">
                {/* Job Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Work Mode</span>
                    <span className="font-semibold text-slate-800">{selectedOpening.workMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Location</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOpening.location || "Remote"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Positions Available</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOpening.slots} {selectedOpening.slots === 1 ? "Slot" : "Slots"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {selectedOpening.description && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Role Description
                    </label>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedOpening.description}
                    </p>
                  </div>
                )}

                {/* Partner Defined Requirements */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Requirements Defined by Partner
                  </label>
                  {selectedOpening.requirements && selectedOpening.requirements.length > 0 ? (
                    <ul className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {selectedOpening.requirements.map((req, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                      No specific requirements listed by partner.
                    </p>
                  )}
                </div>

                {/* Admin Defined Requirements / Rules */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#000666] uppercase tracking-wider">
                      Additional Admin Rules & Requirements (Optional)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Candidates will respond to these when applying
                    </span>
                  </div>

                  {adminRequirements.length > 0 && (
                    <ul className="space-y-1.5">
                      {adminRequirements.map((rule, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-950 px-3 py-2 rounded-lg"
                        >
                          <span className="flex-1 font-medium">{rule}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminRule(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Remove rule"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add rule input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an admin requirement (e.g. Minimum 80% on Sukuk assessment)..."
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAdminRule();
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                    />
                    <button
                      type="button"
                      onClick={handleAddAdminRule}
                      className="px-3 py-2 text-xs font-bold bg-[#000666] text-white rounded-lg hover:bg-[#000666]/90 flex items-center gap-1 cursor-pointer"
                    >
                      <HiOutlinePlus className="w-3.5 h-3.5" />
                      Add Rule
                    </button>
                  </div>
                </div>

                {/* Admin Notes / Rejection Feedback */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Administrator Notes & Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter notes or explanation for partner (required if rejecting)..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] leading-relaxed"
                  />
                </div>

                {/* Feedback status message */}
                {feedbackMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      feedbackMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {feedbackMessage.type === "success" ? (
                      <HiOutlineCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <HiOutlineXMark className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{feedbackMessage.text}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedOpening(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Close
              </button>

              {selectedOpening.status === "pending_review" && (
                <>
                  <button
                    type="button"
                    disabled={!!submittingAction}
                    onClick={() => handleReviewSubmit("reject")}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction === "reject" ? "Rejecting..." : "Reject Opening"}
                  </button>
                  <button
                    type="button"
                    disabled={!!submittingAction}
                    onClick={() => handleReviewSubmit("approve")}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {submittingAction === "approve" ? (
                      "Publishing..."
                    ) : (
                      <>
                        <HiOutlineCheck className="w-4 h-4" />
                        Approve & Declare Open
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
