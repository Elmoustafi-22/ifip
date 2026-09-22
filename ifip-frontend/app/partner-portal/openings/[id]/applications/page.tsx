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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <HiOutlineClock className="w-3.5 h-3.5 text-blue-600" />
            Submitted &bull; Pending Review
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <HiOutlineCalendar className="w-3.5 h-3.5 text-purple-600" />
            Interview Scheduled
          </span>
        );
      case "not_selected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase">Total Received</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs font-medium text-blue-700 uppercase">Awaiting Review</div>
          <div className="text-xl font-bold text-blue-900 mt-1">{stats.submitted}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs font-medium text-emerald-700 uppercase">Shortlisted</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{stats.shortlisted}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="text-xs font-medium text-purple-700 uppercase">Interviews</div>
          <div className="text-xl font-bold text-purple-900 mt-1">{stats.interviewScheduled}</div>
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
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden shrink-0">
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
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {app.applicant?.fullName || "Verified Participant"}
                      </h3>
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
                  <a
                    href={app.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#000666] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition"
                  >
                    <HiOutlineDocumentText className="w-4 h-4" />
                    View Tailored CV
                    <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                  </a>

                  {/* Review Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {app.status !== "shortlisted" && app.status !== "interview_scheduled" && (
                      <button
                        onClick={() => handleReviewAction(app._id, "shortlisted")}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                      >
                        Shortlist Candidate
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenInterviewModal(app)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <HiOutlineCalendar className="w-3.5 h-3.5" />
                      {app.status === "interview_scheduled" ? "Reschedule Interview" : "Schedule Interview"}
                    </button>

                    {app.status !== "not_selected" && (
                      <button
                        onClick={() => handleReviewAction(app._id, "not_selected")}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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

      {/* Schedule Interview Modal */}
      {interviewModalOpen && activeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Schedule Candidate Interview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: <strong>{activeApp.applicant?.fullName || "Candidate"}</strong>
                </p>
              </div>
              <button
                onClick={() => setInterviewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              {scheduleError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Interview Format <span className="text-rose-500">*</span>
                </label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                </div>
              )}

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                The candidate will receive an email and in-app notification with these interview details.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInterviewModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingSubmitting}
                  className="px-4 py-2 font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {schedulingSubmitting ? "Sending..." : "Confirm & Send Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
