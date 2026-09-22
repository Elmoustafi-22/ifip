"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineBriefcase,
  HiOutlineMapPin,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineVideoCamera,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineChevronDown,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUser,
  HiOutlineAcademicCap,
} from "react-icons/hi2";
import {
  getPartnerJobOpeningById,
  getJobOpeningApplications,
  reviewJobApplication,
  scheduleJobInterview,
  JobOpeningItem,
  JobApplicantRecord,
} from "@/lib/api/partner";

export default function JobOpeningApplicationsReviewPage() {
  const params = useParams();
  const router = useRouter();
  const openingId = params.id as string;

  const [opening, setOpening] = useState<JobOpeningItem | null>(null);
  const [applications, setApplications] = useState<JobApplicantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Review / Schedule Modal State
  const [activeApp, setActiveApp] = useState<JobApplicantRecord | null>(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplicantRecord | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewFormat, setInterviewFormat] = useState<"Video" | "Call" | "In-person">("Video");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [schedulingSubmitting, setSchedulingSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [openingData, appsData] = await Promise.all([
        getPartnerJobOpeningById(openingId),
        getJobOpeningApplications(openingId),
      ]);
      setOpening(openingData);
      setApplications(appsData.applications || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openingId) {
      fetchData();
    }
  }, [openingId]);

  const filteredApps = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const submitted = applications.filter((a) => a.status === "submitted").length;
    const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
    const interviewScheduled = applications.filter((a) => a.status === "interview_scheduled").length;
    const notSelected = applications.filter((a) => a.status === "not_selected").length;
    return { total, submitted, shortlisted, interviewScheduled, notSelected };
  }, [applications]);

  const handleReviewAction = async (appId: string, action: "shortlisted" | "not_selected") => {
    try {
      await reviewJobApplication(openingId, appId, action);
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, status: action } : app))
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update application status.");
    }
  };

  const handleOpenInterviewModal = (app: JobApplicantRecord) => {
    setActiveApp(app);
    setInterviewDate(
      app.interviewScheduledAt
        ? new Date(app.interviewScheduledAt).toISOString().slice(0, 16)
        : ""
    );
    setInterviewFormat(app.interviewFormat || "Video");
    setInterviewLink(app.interviewLink || "");
    setInterviewLocation(app.interviewLocation || "");
    setScheduleError("");
    setInterviewModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp) return;
    if (!interviewDate) {
      setScheduleError("Interview date and time are required.");
      return;
    }
    if (interviewFormat === "Video" && !interviewLink.trim()) {
      setScheduleError("Meeting link is required for video interviews.");
      return;
    }
    if (interviewFormat === "In-person" && !interviewLocation.trim()) {
      setScheduleError("Location is required for in-person interviews.");
      return;
    }

    setSchedulingSubmitting(true);
    setScheduleError("");

    try {
      await scheduleJobInterview(openingId, activeApp._id, {
        interviewScheduledAt: interviewDate,
        interviewFormat,
        interviewLink: interviewLink.trim() || undefined,
        interviewLocation: interviewLocation.trim() || undefined,
      });

      setApplications((prev) =>
        prev.map((app) =>
          app._id === activeApp._id
            ? {
                ...app,
                status: "interview_scheduled",
                interviewScheduledAt: interviewDate,
                interviewFormat,
                interviewLink: interviewLink.trim() || undefined,
                interviewLocation: interviewLocation.trim() || undefined,
              }
            : app
        )
      );

      setInterviewModalOpen(false);
      setActiveApp(null);
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || "Failed to schedule interview.");
    } finally {
      setSchedulingSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Submitted &bull; Pending Review
          </span>
        );
      case "shortlisted":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Shortlisted
          </span>
        );
      case "interview_scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Interview Scheduled
          </span>
        );
      case "not_selected":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not Selected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
        <p className="text-sm text-slate-500 mt-3 font-medium">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link & Header */}
      <div>
        <Link
          href="/partner-portal/openings"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#000666] transition mb-2"
        >
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
          Back to Job Openings
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-[#000666]">
              {opening?.title || "Job Opening"} &bull; Candidate Applications
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-1">
              <span>Work Mode: <strong className="text-slate-700">{opening?.workMode}</strong></span>
              {opening?.location && <span>&bull; Location: <strong className="text-slate-700">{opening.location}</strong></span>}
              <span>&bull; Slots: <strong className="text-slate-700">{opening?.slots}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Received</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting Review</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.submitted}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.shortlisted}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Interviews</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.interviewScheduled}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "all", label: `All (${stats.total})` },
          { id: "submitted", label: `Pending (${stats.submitted})` },
          { id: "shortlisted", label: `Shortlisted (${stats.shortlisted})` },
          { id: "interview_scheduled", label: `Interviews (${stats.interviewScheduled})` },
          { id: "not_selected", label: `Not Selected (${stats.notSelected})` },
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

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
          <HiOutlineDocumentText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Applications in this Tab</h3>
          <p className="text-xs text-slate-500">
            {statusFilter === "all"
              ? "No participants have submitted an application for this job opening yet."
              : "No candidates currently have this status."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const isContactVisible = ["shortlisted", "interview_scheduled"].includes(app.status);
            return (
              <div
                key={app._id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition"
              >
                {/* Header: Candidate Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedApplicant(app)}
                      className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-[#000666]/20 transition cursor-pointer"
                      title="View applicant details"
                    >
                      {app.applicant?.avatarUrl ? (
                        <img
                          src={app.applicant.avatarUrl}
                          alt={app.applicant?.fullName || "Candidate"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {app.applicant?.fullName
                            ? app.applicant.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            : "CD"}
                        </span>
                      )}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedApplicant(app)}
                        className="text-base font-bold text-slate-900 hover:text-[#000666] hover:underline leading-snug text-left cursor-pointer transition-colors block"
                        title="Click to view applicant details"
                      >
                        {app.applicant?.fullName || "Verified Participant"}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {app.applicant?.country && <span>{app.applicant.country}</span>}
                        <span>&bull;</span>
                        <span>
                          Applied on{" "}
                          {new Date(app.submittedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Contact info (unlocked when shortlisted or interview scheduled) */}
                {isContactVisible && (app.applicant?.email || app.applicant?.phone) && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs flex flex-wrap gap-4 text-emerald-950">
                    <span className="font-bold text-emerald-800">Candidate Contacts (Unlocked):</span>
                    {app.applicant?.email && (
                      <a
                        href={`mailto:${app.applicant.email}`}
                        className="flex items-center gap-1 text-emerald-800 hover:underline"
                      >
                        <HiOutlineEnvelope className="w-3.5 h-3.5" />
                        {app.applicant.email}
                      </a>
                    )}
                    {app.applicant?.phone && (
                      <span className="flex items-center gap-1 text-emerald-800">
                        <HiOutlinePhone className="w-3.5 h-3.5" />
                        {app.applicant.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Interview Details Box (if scheduled) */}
                {app.status === "interview_scheduled" && app.interviewScheduledAt && (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-950 space-y-1">
                    <div className="font-bold text-purple-900 flex items-center gap-1.5">
                      <HiOutlineCalendar className="w-4 h-4 text-purple-700" />
                      Interview Scheduled:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        Date & Time:{" "}
                        <strong className="text-purple-900">
                          {new Date(app.interviewScheduledAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </div>
                      <div>
                        Format: <strong className="text-purple-900">{app.interviewFormat}</strong>
                      </div>
                      {app.interviewLink && (
                        <div className="sm:col-span-2">
                          Link:{" "}
                          <a
                            href={app.interviewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline text-purple-800 break-all"
                          >
                            {app.interviewLink}
                          </a>
                        </div>
                      )}
                      {app.interviewLocation && (
                        <div className="sm:col-span-2">
                          Location: <strong className="text-purple-900">{app.interviewLocation}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cover Note */}
                {app.coverNote && (
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block">
                      Candidate Note
                    </span>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                      {app.coverNote}
                    </p>
                  </div>
                )}

                {/* Requirement Responses */}
                {app.responses && app.responses.length > 0 && (
                  <div className="text-xs space-y-1.5">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block">
                      Requirement Responses
                    </span>
                    <div className="space-y-2">
                      {app.responses.map((resp, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                          <div className="font-semibold text-slate-800 text-xs">
                            Q: {resp.requirement}
                          </div>
                          <div className="text-slate-600 text-xs pl-2 border-l-2 border-slate-300">
                            {resp.answer || "No response provided."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions & CV Link */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedApplicant(app)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition cursor-pointer"
                    >
                      <HiOutlineUser className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Details</span>
                    </button>

                    <a
                      href={app.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-[#000666] transition"
                    >
                      <HiOutlineDocumentText className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Resume</span>
                      <HiOutlineArrowTopRightOnSquare className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>

                  {/* Review Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {app.status !== "shortlisted" && app.status !== "interview_scheduled" && (
                      <button
                        onClick={() => handleReviewAction(app._id, "shortlisted")}
                        className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer text-center"
                      >
                        Shortlist Candidate
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenInterviewModal(app)}
                      className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center"
                    >
                      <HiOutlineCalendar className="w-3.5 h-3.5" />
                      <span>{app.status === "interview_scheduled" ? "Reschedule Interview" : "Schedule Interview"}</span>
                    </button>

                    {app.status !== "not_selected" && (
                      <button
                        onClick={() => handleReviewAction(app._id, "not_selected")}
                        className="w-full sm:w-auto px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer text-center"
                      >
                        Not Selected
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Applicant Details Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-[#000666] flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedApplicant.applicant?.fullName
                    ? selectedApplicant.applicant.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "AP"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    {selectedApplicant.applicant?.fullName || "Candidate"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(selectedApplicant.status)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplicant(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Country</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedApplicant.applicant?.country || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Applied On</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(selectedApplicant.submittedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate Profile</span>
                  <Link
                    href={`/partner-portal/interns/${selectedApplicant.userId}`}
                    target="_blank"
                    className="text-xs font-semibold text-[#000666] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View Full Profile</span>
                    <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Contact Information */}
              {["shortlisted", "interview_scheduled"].includes(selectedApplicant.status) ? (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                    Contact Information (Unlocked)
                  </span>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-emerald-950">
                    {selectedApplicant.applicant?.email && (
                      <a href={`mailto:${selectedApplicant.applicant.email}`} className="flex items-center gap-1.5 hover:underline">
                        <HiOutlineEnvelope className="w-4 h-4 text-emerald-700" />
                        <span>{selectedApplicant.applicant.email}</span>
                      </a>
                    )}
                    {selectedApplicant.applicant?.phone && (
                      <a href={`tel:${selectedApplicant.applicant.phone}`} className="flex items-center gap-1.5 hover:underline">
                        <HiOutlinePhone className="w-4 h-4 text-emerald-700" />
                        <span>{selectedApplicant.applicant.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                  <strong className="text-slate-700">Contact Policy:</strong> Direct candidate phone and email will be made accessible once you shortlist the candidate or schedule an interview.
                </div>
              )}

              {/* Academic Background */}
              {selectedApplicant.profile?.academic && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <HiOutlineAcademicCap className="w-4 h-4 text-slate-500" />
                    <span>Academic &amp; Educational Background</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Institution / University</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApplicant.profile.academic.university || selectedApplicant.profile.academic.institution || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Field of Study</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApplicant.profile.academic.fieldOfStudy || selectedApplicant.profile.academic.major || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Degree / Qualification</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApplicant.profile.academic.degree || selectedApplicant.profile.academic.qualification || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Graduation Year</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApplicant.profile.academic.graduationYear || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills & Program Interests */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Skills &amp; Focus Domains
                </span>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  {selectedApplicant.profile?.skills?.tools && selectedApplicant.profile.skills.tools.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Tools &amp; Platforms</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApplicant.profile.skills.tools.map((t: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedApplicant.profile?.skills?.languages && selectedApplicant.profile.skills.languages.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Languages</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApplicant.profile.skills.languages.map((l: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedApplicant.programInterests || selectedApplicant.profile?.programInterest) && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Islamic Finance Interests</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(selectedApplicant.programInterests) ? selectedApplicant.programInterests : Array.isArray(selectedApplicant.profile?.programInterest) ? selectedApplicant.profile.programInterest : []).map((area: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate Note (Specific to this job opening, if provided) */}
              {selectedApplicant.coverNote && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Candidate Note
                  </span>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedApplicant.coverNote}
                  </div>
                </div>
              )}

              {/* Requirement Answers */}
              {selectedApplicant.responses && selectedApplicant.responses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Job Requirement Responses
                  </span>
                  <div className="space-y-2">
                    {selectedApplicant.responses.map((resp, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="font-semibold text-slate-800">{resp.requirement}</div>
                        <div className="text-slate-600 pl-2.5 border-l-2 border-slate-300">
                          {resp.answer || "No response provided."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Resume
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <HiOutlineDocumentText className="w-5 h-5 text-slate-500" />
                    <span>Candidate Resume</span>
                  </div>
                  <a
                    href={selectedApplicant.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition"
                  >
                    <span>Open Resume</span>
                    <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedApplicant(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition cursor-pointer text-center"
              >
                Close
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedApplicant.status !== "shortlisted" && selectedApplicant.status !== "interview_scheduled" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReviewAction(selectedApplicant._id, "shortlisted");
                      setSelectedApplicant(prev => prev ? { ...prev, status: "shortlisted" } : null);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer text-center"
                  >
                    Shortlist Candidate
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const app = selectedApplicant;
                    setSelectedApplicant(null);
                    handleOpenInterviewModal(app);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition cursor-pointer text-center flex items-center gap-1.5"
                >
                  <HiOutlineCalendar className="w-3.5 h-3.5" />
                  <span>{selectedApplicant.status === "interview_scheduled" ? "Reschedule Interview" : "Schedule Interview"}</span>
                </button>

                {selectedApplicant.status !== "not_selected" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReviewAction(selectedApplicant._id, "not_selected");
                      setSelectedApplicant(prev => prev ? { ...prev, status: "not_selected" } : null);
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer text-center"
                  >
                    Not Selected
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {interviewModalOpen && activeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Schedule Candidate Interview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: <strong className="text-slate-700">{activeApp.applicant?.fullName || "Candidate"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInterviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              {scheduleError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {scheduleError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Date and Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Interview Format <span className="text-rose-500">*</span>
                </label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]"
                >
                  <option value="Video">Video Call (Google Meet, Teams, Zoom)</option>
                  <option value="Call">Phone Call</option>
                  <option value="In-person">In-person</option>
                </select>
              </div>

              {interviewFormat === "Video" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Meeting Link <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://meet.google.com/xyz or Zoom link"
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]"
                  />
                </div>
              )}

              {interviewFormat === "In-person" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Office Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full address of interview venue"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]"
                  />
                </div>
              )}

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                The candidate will receive an email and in-app notification with these interview details.
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInterviewModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-600 bg-white sm:bg-slate-100 hover:bg-slate-200 border sm:border-transparent border-slate-200 rounded-xl sm:rounded-lg font-semibold cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 font-bold text-white bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] rounded-xl sm:rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
                >
                  {schedulingSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    "Confirm & Send Notice"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
