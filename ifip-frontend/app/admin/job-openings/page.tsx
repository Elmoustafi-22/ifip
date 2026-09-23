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
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineAcademicCap,
  HiOutlineVideoCamera,
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";
import {
  getAdminJobOpenings,
  getAdminJobOpeningById,
  getAllAdminJobApplications,
  reviewAdminJobOpening,
  AdminJobOpeningItem,
  AdminJobApplicationItem,
} from "@/lib/api/services";

export default function AdminJobOpeningsPage() {
  const [openings, setOpenings] = useState<AdminJobOpeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal state
  const [selectedOpening, setSelectedOpening] = useState<AdminJobOpeningItem | null>(null);
  const [modalTab, setModalTab] = useState<"details" | "applicants">("details");
  const [modalLoading, setModalLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminRequirements, setAdminRequirements] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState<"approve" | "reject" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Applicant tab state within modal
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [expandedAppIds, setExpandedAppIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Global "All Candidate Applications" modal
  const [allAppsModalOpen, setAllAppsModalOpen] = useState(false);
  const [allApps, setAllApps] = useState<AdminJobApplicationItem[]>([]);
  const [allAppsLoading, setAllAppsLoading] = useState(false);
  const [allAppsSearch, setAllAppsSearch] = useState("");
  const [allAppsOpeningFilter, setAllAppsOpeningFilter] = useState("all");
  const [allAppsStatusFilter, setAllAppsStatusFilter] = useState("all");

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

  const handleOpenReview = async (
    opening: AdminJobOpeningItem,
    initialTab: "details" | "applicants" = "details"
  ) => {
    setModalTab(initialTab);
    setSelectedOpening(opening);
    setAdminNotes(opening.adminNotes || "");
    setAdminRequirements(opening.adminRequirements ? [...opening.adminRequirements] : []);
    setNewRuleInput("");
    setFeedbackMessage(null);
    setApplicantSearch("");
    setApplicantStatusFilter("all");

    // Fetch full details (includes enriched applications)
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

  const handleOpenAllApps = async () => {
    setAllAppsModalOpen(true);
    setAllAppsLoading(true);
    setAllAppsSearch("");
    setAllAppsOpeningFilter("all");
    setAllAppsStatusFilter("all");
    try {
      const res = await getAllAdminJobApplications();
      setAllApps(res.applications || []);
    } catch (err) {
      console.error("Failed to load all job applications:", err);
    } finally {
      setAllAppsLoading(false);
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
    if (action === "reject" && !adminNotes.trim()) {
      setFeedbackMessage({
        type: "error",
        text: "Please provide a reason or feedback in Administrator Notes before rejecting this opening.",
      });
      return;
    }
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

  const toggleAppExpanded = (appId: string) => {
    setExpandedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
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

  const getAppStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <HiOutlineClock className="w-3.5 h-3.5 text-slate-500" />
            Submitted
          </span>
        );
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <HiOutlineClock className="w-3.5 h-3.5 text-amber-600" />
            Under Review
          </span>
        );
      case "shortlisted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Shortlisted
          </span>
        );
      case "interview_scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <HiOutlineVideoCamera className="w-3.5 h-3.5 text-sky-600" />
            Interview Scheduled
          </span>
        );
      case "not_selected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <HiOutlineXCircle className="w-3.5 h-3.5 text-rose-600" />
            Not Selected
          </span>
        );
      default:
        return null;
    }
  };

  // Filtered applicants for selected opening
  const modalApplicants = useMemo(() => {
    if (!selectedOpening?.applications) return [];
    return selectedOpening.applications.filter((app) => {
      const matchesStatus =
        applicantStatusFilter === "all" || app.status === applicantStatusFilter;
      const q = applicantSearch.toLowerCase().trim();
      const name = app.applicant?.fullName?.toLowerCase() || "";
      const email = app.applicant?.email?.toLowerCase() || "";
      const country = app.applicant?.country?.toLowerCase() || "";
      const matchesSearch = !q || name.includes(q) || email.includes(q) || country.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [selectedOpening?.applications, applicantStatusFilter, applicantSearch]);

  // Filtered applicants for global "All Apps" modal
  const filteredAllApps = useMemo(() => {
    return allApps.filter((app) => {
      const matchesOpening =
        allAppsOpeningFilter === "all" || app.jobOpeningId === allAppsOpeningFilter;
      const matchesStatus =
        allAppsStatusFilter === "all" || app.status === allAppsStatusFilter;
      const q = allAppsSearch.toLowerCase().trim();
      const name = app.applicant?.fullName?.toLowerCase() || "";
      const email = app.applicant?.email?.toLowerCase() || "";
      const opening = app.openingTitle?.toLowerCase() || "";
      const partner = app.partnerName?.toLowerCase() || "";
      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        opening.includes(q) ||
        partner.includes(q);
      return matchesOpening && matchesStatus && matchesSearch;
    });
  }, [allApps, allAppsOpeningFilter, allAppsStatusFilter, allAppsSearch]);

  // Applicant Card Renderer
  const renderApplicantCard = (
    app: AdminJobApplicationItem,
    showOpeningInfo: boolean = false
  ) => {
    const isExpanded = expandedAppIds.has(app._id);
    const initials = (app.applicant?.fullName || "A")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const formattedDate = app.submittedAt
      ? new Date(app.submittedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Recently";

    return (
      <div
        key={app._id}
        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition space-y-3"
      >
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {app.applicant?.avatarUrl ? (
              <img
                src={app.applicant.avatarUrl}
                alt={app.applicant.fullName || "Candidate"}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#000666]/10 text-[#000666] font-bold text-sm flex items-center justify-center shrink-0 border border-[#000666]/20">
                {initials}
              </div>
            )}

            {/* Candidate Name & Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {app.applicant?.fullName || "Candidate"}
                </h4>
                {app.applicant?.country && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <HiOutlineMapPin className="w-3 h-3 text-slate-400" />
                    {app.applicant.country}
                  </span>
                )}
              </div>

              {/* In All-Apps modal, show opening title & partner */}
              {showOpeningInfo && (
                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700">
                    {app.openingTitle || "Job Opening"}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span>{app.partnerName || "Partner"}</span>
                </div>
              )}

              {/* Applied Date */}
              <div className="text-xs text-slate-400">Applied on {formattedDate}</div>
            </div>
          </div>

          {/* Status Badge & CV Link */}
          <div className="flex items-center sm:items-end flex-wrap gap-2 self-start sm:self-auto sm:flex-col">
            {getAppStatusBadge(app.status)}
            {app.cvUrl && (
              <a
                href={app.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#000666] bg-[#000666]/5 hover:bg-[#000666]/10 border border-[#000666]/20 rounded-lg transition"
              >
                <span>View CV / Resume</span>
                <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Contact Info Row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs">
          {app.applicant?.email && (
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <HiOutlineEnvelope className="w-4 h-4 text-slate-400 shrink-0" />
              <a
                href={`mailto:${app.applicant.email}`}
                className="hover:underline text-slate-800"
              >
                {app.applicant.email}
              </a>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(app.applicant!.email!, `email-${app._id}`)
                }
                className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                title="Copy email"
              >
                {copiedKey === `email-${app._id}` ? (
                  <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <HiOutlineClipboard className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {app.applicant?.phone && (
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <HiOutlinePhone className="w-4 h-4 text-slate-400 shrink-0" />
              <a
                href={`tel:${app.applicant.phone}`}
                className="hover:underline text-slate-800"
              >
                {app.applicant.phone}
              </a>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(app.applicant!.phone!, `phone-${app._id}`)
                }
                className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                title="Copy phone"
              >
                {copiedKey === `phone-${app._id}` ? (
                  <HiOutlineClipboardDocumentCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <HiOutlineClipboard className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Toggle details button */}
          <button
            type="button"
            onClick={() => toggleAppExpanded(app._id)}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <span>{isExpanded ? "Hide Details" : "View Details"}</span>
            {isExpanded ? (
              <HiOutlineChevronUp className="w-3.5 h-3.5" />
            ) : (
              <HiOutlineChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Details Drawer */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in-50 duration-150 text-xs">
            {/* Cover Note */}
            {app.coverNote && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">
                  Candidate Cover Note
                </span>
                <p className="text-slate-600 italic whitespace-pre-wrap leading-relaxed">
                  "{app.coverNote}"
                </p>
              </div>
            )}

            {/* Requirement Responses (Q&A) */}
            {app.responses && app.responses.length > 0 && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  Responses to Job Requirements
                </span>
                <div className="space-y-2">
                  {app.responses.map((resp, i) => (
                    <div
                      key={i}
                      className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1"
                    >
                      <div className="font-medium text-slate-800 text-xs">
                        Q: {resp.requirement}
                      </div>
                      <div className="text-slate-600 text-xs pl-2 border-l-2 border-[#000666]/30">
                        {resp.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Info (if scheduled) */}
            {app.interviewScheduledAt && (
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl space-y-1.5 text-sky-950">
                <div className="font-bold text-sky-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <HiOutlineVideoCamera className="w-4 h-4 text-sky-700" />
                  <span>Interview Scheduled</span>
                </div>
                <div className="text-xs">
                  <strong>Date & Time:</strong>{" "}
                  {new Date(app.interviewScheduledAt).toLocaleString()}
                </div>
                {app.interviewFormat && (
                  <div className="text-xs">
                    <strong>Format:</strong> {app.interviewFormat}
                  </div>
                )}
                {app.interviewLink && (
                  <div className="text-xs">
                    <strong>Meeting Link:</strong>{" "}
                    <a
                      href={app.interviewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 underline font-medium break-all"
                    >
                      {app.interviewLink}
                    </a>
                  </div>
                )}
                {app.interviewLocation && (
                  <div className="text-xs">
                    <strong>Location:</strong> {app.interviewLocation}
                  </div>
                )}
              </div>
            )}

            {/* Partner Notes */}
            {app.partnerNotes && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1 text-amber-950">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] block">
                  Partner Review Notes
                </span>
                <p className="text-xs text-amber-900/90 whitespace-pre-wrap leading-relaxed">
                  {app.partnerNotes}
                </p>
              </div>
            )}

            {/* Academic & Skills Profile from Application */}
            {app.profile && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                  <HiOutlineAcademicCap className="w-4 h-4 text-slate-500" />
                  <span>Candidate Profile Snapshot</span>
                </span>

                {/* Academic info */}
                {app.profile.academic && (
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Academic: </span>
                    {[
                      app.profile.academic.qualification,
                      app.profile.academic.fieldOfStudy,
                      app.profile.academic.institution,
                      app.profile.academic.gradYear
                        ? `Class of ${app.profile.academic.gradYear}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "Information provided in application"}
                  </div>
                )}

                {/* Skills tags */}
                {app.profile.skills && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.isArray(app.profile.skills.tools) &&
                      app.profile.skills.tools.map((tool: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                        >
                          {tool}
                        </span>
                      ))}
                    {Array.isArray(app.profile.skills.relevantSkills) &&
                      app.profile.skills.relevantSkills.map((sk: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-medium text-sky-800"
                        >
                          {sk}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-[#000666]">Job Openings Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review partner openings, establish verification criteria, and view candidate applications.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAllApps}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition cursor-pointer shadow-xs"
          >
            <HiOutlineUsers className="w-4 h-4" />
            <span>View All Applicants ({stats.totalApps})</span>
          </button>
          <button
            onClick={fetchOpenings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Openings
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">
            Pending Review
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
            Declared Open
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.open}</div>
        </div>
        <div
          onClick={handleOpenAllApps}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-[#000666]/40 hover:shadow-md transition cursor-pointer group"
          title="Click to view all candidate applications"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Candidate Applications
            </div>
            <span className="text-[11px] font-semibold text-[#000666] opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
              View All &rarr;
            </span>
          </div>
          <div className="text-2xl font-bold text-[#000666] mt-1">{stats.totalApps}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search openings"
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
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {opening.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                    <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium">
                      {opening.partner?.name || "Partner Organisation"}
                    </span>
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
                  <span>
                    {opening.slots} {opening.slots === 1 ? "Slot" : "Slots"}
                  </span>
                </div>

                {/* Application Count & Quick Action */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div>
                    Applications received:{" "}
                    <strong className="text-slate-800">{opening.applicationCount || 0}</strong>
                  </div>
                  {(opening.applicationCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenReview(opening, "applicants")}
                      className="text-xs font-semibold text-[#000666] hover:text-[#000666]/80 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <HiOutlineUsers className="w-3.5 h-3.5" />
                      <span>View Applicants</span>
                    </button>
                  )}
                </div>

                {/* Requirements Summary */}
                {((opening.requirements && opening.requirements.length > 0) ||
                  (opening.adminRequirements && opening.adminRequirements.length > 0)) && (
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span className="font-semibold text-slate-700">Rules & Requirements: </span>
                    {(opening.requirements?.length || 0) +
                      (opening.adminRequirements?.length || 0)}{" "}
                    specified
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleOpenReview(opening, "details")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    opening.status === "pending_review"
                      ? "bg-[#000666] text-white hover:bg-[#000666]/90 shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <HiOutlineDocumentText className="w-4 h-4" />
                  {opening.status === "pending_review"
                    ? "Review & Declare Open"
                    : "View Details & Rules"}
                </button>

                {(opening.applicationCount || 0) > 0 && (
                  <button
                    onClick={() => handleOpenReview(opening, "applicants")}
                    className="py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-[#000666]/5 hover:bg-[#000666]/10 text-[#000666] border border-[#000666]/20 cursor-pointer whitespace-nowrap"
                    title="View candidate applications"
                  >
                    <HiOutlineUsers className="w-4 h-4" />
                    <span>Applicants ({opening.applicationCount})</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Opening Modal (Details & Applicants Tabs) */}
      {selectedOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-200 shrink-0">
              <div className="space-y-1">
                <div className="mb-0.5">{getStatusBadge(selectedOpening.status)}</div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {selectedOpening.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Organisation:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {selectedOpening.partner?.name || "Partner Organisation"}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpening(null)}
                className="p-1.5 sm:p-2 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 sm:px-6 bg-slate-50/60 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab("details")}
                className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  modalTab === "details"
                    ? "border-[#000666] text-[#000666]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                <span>Overview & Rules</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("applicants")}
                className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  modalTab === "applicants"
                    ? "border-[#000666] text-[#000666]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <HiOutlineUsers className="w-4 h-4" />
                <span>Applicants</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    modalTab === "applicants"
                      ? "bg-[#000666] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {selectedOpening.applications?.length ??
                    (selectedOpening.applicationCount || 0)}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            {modalLoading ? (
              <div className="py-20 text-center text-slate-500 text-sm flex-1">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Loading opening details and applicants...
                </p>
              </div>
            ) : modalTab === "details" ? (
              /* TAB 1: DETAILS & VERIFICATION RULES */
              <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 text-sm flex-1 overscroll-contain">
                {/* Job Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">
                      Work Mode
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedOpening.workMode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">
                      Location
                    </span>
                    <span
                      className="font-semibold text-slate-800 mt-0.5 block truncate"
                      title={selectedOpening.location || "Remote"}
                    >
                      {selectedOpening.location || "Remote"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">
                      Positions Available
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedOpening.slots}{" "}
                      {selectedOpening.slots === 1 ? "Slot" : "Slots"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {selectedOpening.description && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Role Description
                    </label>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
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
                    <ul className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {selectedOpening.requirements.map((req, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                      No specific requirements listed by partner.
                    </p>
                  )}
                </div>

                {/* Admin Defined Requirements / Rules */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-[#000666] uppercase tracking-wider block">
                    Admin Rules & Requirements
                  </label>

                  {adminRequirements.length > 0 && (
                    <ul className="space-y-1.5">
                      {adminRequirements.map((rule, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-950 px-3 py-2 rounded-xl"
                        >
                          <span className="flex-1 font-medium break-words">{rule}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminRule(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer shrink-0"
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
                      placeholder="Add an admin rule or prerequisite..."
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAdminRule();
                        }
                      }}
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]"
                    />
                    <button
                      type="button"
                      onClick={handleAddAdminRule}
                      className="px-3.5 py-2 text-xs font-bold bg-[#000666] text-white rounded-lg hover:bg-[#000666]/90 active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition"
                    >
                      <HiOutlinePlus className="w-3.5 h-3.5" />
                      <span>Add Rule</span>
                    </button>
                  </div>
                </div>

                {/* Admin Notes / Rejection Feedback */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Notes & Feedback
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter administrative notes, review remarks, or partner guidance..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666] leading-relaxed resize-none"
                  />
                </div>

                {/* Feedback status message */}
                {feedbackMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
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
            ) : (
              /* TAB 2: APPLICANTS VIEWER */
              <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-2 border-b border-slate-100">
                  <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search applicant name, email, or country..."
                      value={applicantSearch}
                      onChange={(e) => setApplicantSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] focus:bg-white transition"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: "all", label: "All" },
                      { id: "submitted", label: "Submitted" },
                      { id: "shortlisted", label: "Shortlisted" },
                      { id: "interview_scheduled", label: "Interview" },
                      { id: "not_selected", label: "Not Selected" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setApplicantStatusFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          applicantStatusFilter === tab.id
                            ? "bg-[#000666] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Applicants List */}
                {modalApplicants.length === 0 ? (
                  <div className="py-14 text-center">
                    <HiOutlineUsers className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800 mt-2">
                      {selectedOpening.applications && selectedOpening.applications.length > 0
                        ? "No applicants match your search or filter"
                        : "No Applications Received Yet"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {selectedOpening.applications && selectedOpening.applications.length > 0
                        ? "Try clearing your search query or switching status filters."
                        : "Candidates who apply for this job opening will be listed here with their contact info, CV, and answers."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Showing {modalApplicants.length} candidate{" "}
                      {modalApplicants.length === 1 ? "application" : "applications"}
                    </div>
                    {modalApplicants.map((app) => renderApplicantCard(app, false))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 border-t border-slate-200 shrink-0">
              {modalTab === "details" && selectedOpening.status === "pending_review" ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={!!submittingAction}
                    onClick={() => handleReviewSubmit("approve")}
                    className="w-full sm:w-auto order-1 sm:order-3 px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] rounded-xl sm:rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                  >
                    {submittingAction === "approve" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <HiOutlineCheck className="w-4 h-4" />
                        <span>Approve & Declare Open</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 order-2 sm:order-1 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedOpening(null)}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 bg-white sm:bg-slate-100 hover:bg-slate-200 border sm:border-transparent border-slate-200 rounded-xl sm:rounded-lg transition cursor-pointer text-center whitespace-nowrap"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      disabled={!!submittingAction}
                      onClick={() => handleReviewSubmit("reject")}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl sm:rounded-lg transition disabled:opacity-50 cursor-pointer text-center whitespace-nowrap"
                    >
                      {submittingAction === "reject" ? "Rejecting..." : "Reject Opening"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {modalTab === "applicants" && (
                    <button
                      type="button"
                      onClick={() => setModalTab("details")}
                      className="text-xs font-semibold text-[#000666] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      &larr; View Opening Rules
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOpening(null)}
                    className="ml-auto w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 bg-white sm:bg-slate-100 hover:bg-slate-200 border sm:border-transparent border-slate-200 rounded-xl sm:rounded-lg transition cursor-pointer text-center"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global "All Candidate Applications" Modal */}
      {allAppsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug flex items-center gap-2">
                  <HiOutlineUsers className="w-5 h-5 text-[#000666]" />
                  <span>All Candidate Applications</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overview of all candidates who have applied across all job openings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllAppsModalOpen(false)}
                className="p-1.5 sm:p-2 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Filters Row */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between shrink-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by candidate, email, role, or partner..."
                  value={allAppsSearch}
                  onChange={(e) => setAllAppsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] transition"
                />
              </div>

              {/* Opening Dropdown & Status Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={allAppsOpeningFilter}
                  onChange={(e) => setAllAppsOpeningFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] text-slate-700"
                >
                  <option value="all">All Job Openings</option>
                  {openings.map((op) => (
                    <option key={op._id} value={op._id}>
                      {op.title} ({op.partner?.name || "Partner"})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: "all", label: "All" },
                    { id: "submitted", label: "Submitted" },
                    { id: "shortlisted", label: "Shortlisted" },
                    { id: "interview_scheduled", label: "Interview" },
                    { id: "not_selected", label: "Not Selected" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAllAppsStatusFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        allAppsStatusFilter === tab.id
                          ? "bg-[#000666] text-white"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            {allAppsLoading ? (
              <div className="py-20 text-center text-slate-500 text-sm flex-1">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Loading candidate applications...
                </p>
              </div>
            ) : filteredAllApps.length === 0 ? (
              <div className="py-20 text-center flex-1">
                <HiOutlineUsers className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 mt-2">
                  No Candidate Applications Found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {allAppsSearch || allAppsOpeningFilter !== "all" || allAppsStatusFilter !== "all"
                    ? "No candidate applications match the chosen filters or search query."
                    : "No candidates have applied to any job openings yet."}
                </p>
              </div>
            ) : (
              <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredAllApps.length} of {allApps.length} total applications
                </div>
                {filteredAllApps.map((app) => renderApplicantCard(app, true))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setAllAppsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
