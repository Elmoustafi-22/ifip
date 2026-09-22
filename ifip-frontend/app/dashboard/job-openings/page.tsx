"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineClock,
  HiOutlineArrowRight,
  HiOutlineXMark,
  HiOutlineArrowUpTray,
  HiOutlineCalendar,
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineInformationCircle,
} from "react-icons/hi2";
import {
  getParticipantJobOpenings,
  checkJobEligibility,
  applyToJobOpening,
  uploadJobCv,
  ParticipantJobOpening,
  TaskEligibilityStatus,
} from "@/lib/api/services";

export default function ParticipantJobOpeningsPage() {
  const [openings, setOpenings] = useState<ParticipantJobOpening[]>([]);
  const [eligibility, setEligibility] = useState<TaskEligibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [workModeFilter, setWorkModeFilter] = useState<string>("all");

  // Apply Modal State
  const [activeOpening, setActiveOpening] = useState<ParticipantJobOpening | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [uploadedCvUrl, setUploadedCvUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [coverNote, setCoverNote] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submittingApp, setSubmittingApp] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  // Ineligible notice modal
  const [ineligibleModalOpen, setIneligibleModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [openingsRes, eligibilityRes] = await Promise.allSettled([
        getParticipantJobOpenings(),
        checkJobEligibility(),
      ]);
      if (openingsRes.status === "fulfilled") {
        setOpenings(openingsRes.value?.openings || []);
      }
      if (eligibilityRes.status === "fulfilled") {
        setEligibility(eligibilityRes.value);
      }
    } catch (err) {
      console.error("Failed to load job openings or eligibility:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOpenings = useMemo(() => {
    if (workModeFilter === "all") return openings;
    return openings.filter((op) => op.workMode === workModeFilter);
  }, [openings, workModeFilter]);

  const handleOpenApplyModal = (op: ParticipantJobOpening) => {
    if (!eligibility?.eligible) {
      setIneligibleModalOpen(true);
      return;
    }

    setActiveOpening(op);
    setCvFile(null);
    setUploadedCvUrl("");
    setUploadedFileName("");
    setCoverNote("");
    setResponses({});
    setApplyError("");
    setApplySuccess(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["pdf", "doc", "docx"].includes(ext || "")) {
      setApplyError("Please select a valid PDF or Word document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setApplyError("File size exceeds 10MB limit.");
      return;
    }

    setCvFile(file);
    setCvUploading(true);
    setApplyError("");

    try {
      const res = await uploadJobCv(file);
      setUploadedCvUrl(res.cvUrl);
      setUploadedFileName(res.fileName || file.name);
    } catch (err: any) {
      setApplyError(err?.response?.data?.message || "Failed to upload CV. Please try again.");
      setCvFile(null);
    } finally {
      setCvUploading(false);
    }
  };

  const handleResponseChange = (req: string, value: string) => {
    setResponses((prev) => ({ ...prev, [req]: value }));
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOpening) return;

    if (!uploadedCvUrl) {
      setApplyError("Please upload your tailored CV before submitting.");
      return;
    }

    // Check that all requirements have answers
    const allReqs = activeOpening.allRequirements || [
      ...(activeOpening.requirements || []),
      ...(activeOpening.adminRequirements || []),
    ];

    const formattedResponses = allReqs.map((req) => ({
      requirement: req,
      answer: (responses[req] || "").trim(),
    }));

    setSubmittingApp(true);
    setApplyError("");

    try {
      await applyToJobOpening(activeOpening._id, {
        cvUrl: uploadedCvUrl,
        coverNote: coverNote.trim() || undefined,
        responses: formattedResponses,
      });

      setApplySuccess(true);
      // Refresh list to update hasApplied status
      fetchData();
    } catch (err: any) {
      setApplyError(err?.response?.data?.message || "Failed to submit application.");
    } finally {
      setSubmittingApp(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
        <p className="text-sm text-slate-500 mt-3 font-medium">Checking openings and task status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-[#000666]">Placement Job Openings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verified internship and placement positions announced by partner organisations.
          </p>
        </div>
      </div>

      {/* Task Completion Eligibility Banner */}
      {eligibility && (
        <div>
          {eligibility.eligible ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900">
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="font-bold block text-emerald-950">
                  Coursework Task Verification Complete
                </strong>
                All your available module practical tasks are completed and approved. You are eligible to apply for any open job position below.
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 text-amber-950">
              <div className="flex items-start gap-3">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="font-bold block text-amber-900">
                    Action Required: Pending Module Tasks
                  </strong>
                  You have <strong>{eligibility.incompleteTasks.length}</strong> pending practical task(s). All required module tasks must be completed and approved before your job applications can be accepted.
                </div>
              </div>

              {/* List of pending tasks */}
              <div className="bg-white/80 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                  Pending Coursework Tasks to Complete:
                </div>
                <ul className="space-y-1">
                  {eligibility.incompleteTasks.map((t, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-slate-700">
                      <span>
                        &bull; {t.weekNumber ? `Week ${t.weekNumber}: ` : ""}
                        <strong>{t.moduleTitle}</strong>
                        {t.taskTitle ? ` — ${t.taskTitle}` : ""}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                        {t.submissionStatus === "needs_resubmission" ? "Needs Revision" : "Pending Submission"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Link
                  href="/dashboard/modules"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#000666] text-white text-xs font-bold rounded-lg hover:bg-[#000666]/90 transition"
                >
                  Go to Modules & Complete Tasks
                  <HiOutlineArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Modes" },
            { id: "Remote", label: "Remote" },
            { id: "Hybrid", label: "Hybrid" },
            { id: "On-site", label: "On-site" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setWorkModeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                workModeFilter === tab.id
                  ? "bg-[#000666] text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredOpenings.length} {filteredOpenings.length === 1 ? "opening" : "openings"}
        </div>
      </div>

      {/* Openings Grid */}
      {filteredOpenings.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
          <HiOutlineBriefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Openings Available Currently</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {workModeFilter !== "all"
              ? `There are currently no active openings for work mode "${workModeFilter}".`
              : "Partner organisations have not announced any new placement positions at this time. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpenings.map((op) => {
            const hasApplied = op.hasApplied;
            const app = op.existingApplication;
            const allReqs = op.allRequirements || [
              ...(op.requirements || []),
              ...(op.adminRequirements || []),
            ];

            return (
              <div
                key={op._id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition gap-4"
              >
                <div className="space-y-3">
                  {/* Status (Only when applied) */}
                  {hasApplied && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                        Applied &bull; {app?.status === "interview_scheduled" ? "Interview Scheduled" : app?.status === "shortlisted" ? "Shortlisted" : "Under Review"}
                      </span>
                    </div>
                  )}

                  {/* Title & Partner */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{op.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium">{op.partner?.name || "Partner Organisation"}</span>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{op.workMode}</span>
                    {op.location && (
                      <>
                        <span className="text-slate-300">&bull;</span>
                        <span>{op.location}</span>
                      </>
                    )}
                    <span className="text-slate-300">&bull;</span>
                    <span>{op.slots} {op.slots === 1 ? "Position" : "Positions"}</span>
                  </div>

                  {/* Description preview */}
                  {op.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {op.description}
                    </p>
                  )}

                  {/* Requirements summary */}
                  {allReqs.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                      <div className="font-semibold text-slate-700">Key Requirements:</div>
                      <ul className="space-y-1 text-slate-600">
                        {allReqs.slice(0, 3).map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <span className="line-clamp-1">{r}</span>
                          </li>
                        ))}
                        {allReqs.length > 3 && (
                          <li className="text-[11px] text-slate-400 italic">
                            +{allReqs.length - 3} more requirement(s) in application
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Interview Alert Box if scheduled */}
                  {app?.status === "interview_scheduled" && app?.interviewScheduledAt && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-950 space-y-1">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        <HiOutlineCalendar className="w-4 h-4 text-purple-700" />
                        Your Interview is Scheduled!
                      </div>
                      <div className="text-slate-700">
                        Date:{" "}
                        <strong className="text-purple-900">
                          {new Date(app.interviewScheduledAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>{" "}
                        ({app.interviewFormat})
                      </div>
                      {app.interviewLink && (
                        <div>
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
                        <div>Location: <strong className="text-purple-900">{app.interviewLocation}</strong></div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-100">
                  {hasApplied ? (
                    <button
                      disabled
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                      Application Submitted
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenApplyModal(op)}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-[#000666] text-white hover:bg-[#000666]/90 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      Apply for Position
                      <HiOutlineArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ineligible Warning Modal */}
      {ineligibleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 text-amber-800">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <HiOutlineExclamationTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Complete Your Pending Tasks to Apply
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  To ensure all candidates meet partner quality standards, all currently available coursework tasks must be completed and verified before submitting applications.
                </p>
              </div>
            </div>

            {eligibility?.incompleteTasks && eligibility.incompleteTasks.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
                <span className="font-bold text-slate-700 block">Pending Tasks:</span>
                <ul className="space-y-1 text-slate-600">
                  {eligibility.incompleteTasks.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">&bull;</span>
                      <span>{t.weekNumber ? `Week ${t.weekNumber}: ` : ""}<strong>{t.moduleTitle}</strong></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIneligibleModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl sm:rounded-lg cursor-pointer text-center"
              >
                Close
              </button>
              <Link
                href="/dashboard/modules"
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-xl sm:rounded-lg cursor-pointer text-center"
              >
                Go to Modules
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {activeOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 sm:px-6 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Apply for {activeOpening.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisation:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {activeOpening.partner?.name || "Partner Organisation"}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOpening(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {applySuccess ? (
              <div className="px-5 sm:px-6 py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <HiOutlineCheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Application Submitted Successfully
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your application and tailored CV have been transmitted to{" "}
                  <strong>{activeOpening.partner?.name || "the partner organisation"}</strong>. You will receive an email and dashboard notification if selected for an interview.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveOpening(null)}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-[#000666] rounded-xl sm:rounded-lg hover:bg-[#000666]/90 cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 text-xs flex-1 overscroll-contain">
                  {applyError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                      {applyError}
                    </div>
                  )}

                  {/* Tailored CV Upload */}
                  <div className="space-y-2 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 uppercase tracking-wider block">
                      Upload Tailored CV <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-slate-500 text-[11px] leading-snug">
                      Upload a CV tailored to this position's specific focus areas (PDF or Word, max 10MB).
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl sm:rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs">
                        <HiOutlineArrowUpTray className="w-4 h-4 text-slate-500" />
                        <span>{cvUploading ? "Uploading..." : "Choose File"}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          disabled={cvUploading}
                          className="hidden"
                        />
                      </label>

                      {uploadedFileName && (
                        <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5 truncate max-w-xs">
                          <HiOutlineCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{uploadedFileName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements Questionnaire */}
                  {((activeOpening.allRequirements && activeOpening.allRequirements.length > 0) ||
                    (activeOpening.requirements && activeOpening.requirements.length > 0) ||
                    (activeOpening.adminRequirements && activeOpening.adminRequirements.length > 0)) && (
                    <div className="space-y-3 pt-2">
                      <div className="border-b border-slate-200 pb-1">
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider">
                          Specific Role Requirements
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Please provide your response or relevant experience for each requirement.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {(
                          activeOpening.allRequirements || [
                            ...(activeOpening.requirements || []),
                            ...(activeOpening.adminRequirements || []),
                          ]
                        ).map((req, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="font-semibold text-slate-700 block">
                              {idx + 1}. {req}
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Detail your experience, coursework, or qualifications relevant to this requirement..."
                              value={responses[req] || ""}
                              onChange={(e) => handleResponseChange(req, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666] leading-relaxed resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Cover Note */}
                  <div className="space-y-1 pt-2">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block">
                      Additional Cover Note (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Introduce yourself to the hiring team and explain why you are interested in this position..."
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666] leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 border-t border-slate-200 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveOpening(null)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-600 bg-white sm:bg-slate-100 hover:bg-slate-200 border sm:border-transparent border-slate-200 rounded-xl sm:rounded-lg font-semibold transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApp || cvUploading || !uploadedCvUrl}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 font-bold text-white bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] rounded-xl sm:rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
                  >
                    {submittingApp ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
