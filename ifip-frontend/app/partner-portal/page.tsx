"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineBriefcase,
  HiOutlineArrowRight,
  HiOutlineVideoCamera,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheck,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getPartnerMe,
  getPartnerTasks,
  logJobInterviewOutcome,
  logOutcome,
  PartnerMeResponse,
  PartnerInterviewTask,
} from "@/lib/api/partner";

export default function PartnerOverviewPage() {
  const [data, setData] = useState<PartnerMeResponse | null>(null);
  const [tasks, setTasks] = useState<PartnerInterviewTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Outcome Modal State
  const [activeTask, setActiveTask] = useState<PartnerInterviewTask | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"offer_extended" | "not_selected" | "completed">("offer_extended");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [outcomeError, setOutcomeError] = useState("");

  const loadDashboard = async () => {
    try {
      const [meRes, tasksRes] = await Promise.all([
        getPartnerMe(),
        getPartnerTasks().catch(() => ({ tasks: { interviews: [], pendingInterviewsCount: 0, pendingReviewCount: 0 } })),
      ]);
      setData(meRes);
      setTasks(tasksRes.tasks?.interviews || []);
    } catch (err) {
      console.error("Failed to load partner overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOpenOutcomeModal = (
    task: PartnerInterviewTask,
    defaultOutcome: "offer_extended" | "not_selected" | "completed" = "offer_extended"
  ) => {
    setActiveTask(task);
    setSelectedOutcome(defaultOutcome);
    setOutcomeNotes(task.partnerNotes || "");
    setOutcomeError("");
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    setSubmittingOutcome(true);
    setOutcomeError("");

    try {
      if (activeTask.type === "job_application") {
        await logJobInterviewOutcome(
          activeTask.sourceId,
          activeTask.id,
          selectedOutcome,
          outcomeNotes.trim() || undefined
        );
      } else {
        const placementOutcome = selectedOutcome === "not_selected" ? "not_selected" : "offer_extended";
        await logOutcome(activeTask.id, placementOutcome);
      }
      setActiveTask(null);
      await loadDashboard();
    } catch (err: any) {
      setOutcomeError(err?.response?.data?.message || "Failed to record interview outcome.");
    } finally {
      setSubmittingOutcome(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200/60 rounded-xl border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200/60 rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-56 bg-slate-200/60 rounded-xl border border-slate-200" />
      </div>
    );
  }

  const org = data?.org;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          {org?.logoUrl ? (
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-50 p-2 border border-slate-200 shrink-0">
              <Image
                src={org.logoUrl}
                alt={org.name}
                fill
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xl text-[#000666] shrink-0">
              {org?.name?.charAt(0) || "P"}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#000666] tracking-tight">{org?.name}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Partner Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl line-clamp-2">
              {org?.description || "Partner portal for candidate selection, interviews, and placements."}
            </p>
          </div>
        </div>

        <Link
          href="/partner-portal/interns"
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-medium text-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <span>Browse Candidate Pool</span>
          <HiOutlineArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Pool</span>
            <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
              <HiOutlineUsers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#000666] mt-2">{stats?.availableInterns ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Available for selection</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scheduled Interviews</span>
            <div className="w-8 h-8 rounded bg-slate-50 text-[#000666] border border-slate-200 flex items-center justify-center">
              <HiOutlineCalendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#000666] mt-2">{stats?.scheduledInterviews ?? tasks.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending completion / outcome</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</span>
            <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
              <HiOutlineClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{stats?.pendingRequests ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Under IFIP review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Slots Remaining</span>
            <div className="w-8 h-8 rounded bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
              <HiOutlineBriefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#000666] mt-2">{stats?.slotsRemaining ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Of {org?.activeSlots ?? 5} allocated slots</p>
        </div>
      </div>

      {/* Pending Tasks & Scheduled Interviews Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#000666]">Pending Interviews &amp; Action Items</h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                {tasks.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review scheduled meetings, conduct interviews, and record hiring decisions.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Link
              href="/partner-portal/placements"
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Placements Desk
            </Link>
            <Link
              href="/partner-portal/openings"
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Job Openings
            </Link>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No scheduled interviews or pending actions at this time.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const formattedDate = new Date(task.interviewDate).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div
                  key={`${task.type}-${task.id}`}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Candidate and Role Details */}
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-[#000666] font-semibold text-xs flex items-center justify-center shrink-0">
                      {task.candidateName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {task.candidateName}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 rounded">
                          {task.type === "job_application" ? "Job Opening" : "Placement Match"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {task.role} {task.department ? `• ${task.department}` : ""}
                      </p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 flex-wrap gap-y-1">
                        <span>{task.candidateEmail}</span>
                        {task.candidatePhone && <span>• {task.candidatePhone}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Details & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 self-start md:self-auto">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-slate-800 flex items-center md:justify-end space-x-1.5">
                        <HiOutlineCalendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {task.isOverdue ? (
                          <span className="text-amber-800 font-medium">Interview Concluded &bull; Decision Required</span>
                        ) : (
                          <span className="text-slate-400">Scheduled</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!task.isOverdue && task.interviewLink && (
                        <a
                          href={task.interviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                        >
                          <HiOutlineVideoCamera className="w-3.5 h-3.5 text-slate-500" />
                          <span>Join</span>
                          <HiOutlineArrowTopRightOnSquare className="w-3 h-3 text-slate-400" />
                        </a>
                      )}

                      {task.isOverdue ? (
                        <>
                          <button
                            onClick={() => handleOpenOutcomeModal(task, "offer_extended")}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-medium transition cursor-pointer shadow-xs"
                          >
                            <HiOutlineCheck className="w-3.5 h-3.5" />
                            <span>Extend Offer</span>
                          </button>
                          <button
                            onClick={() => handleOpenOutcomeModal(task, "not_selected")}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer"
                          >
                            <span>Decline</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenOutcomeModal(task, "offer_extended")}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-medium transition cursor-pointer"
                        >
                          <HiOutlineCheck className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Outcome Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Interview Outcome</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: <strong className="text-slate-800">{activeTask.candidateName}</strong> ({activeTask.role})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="space-y-4 text-xs">
              {outcomeError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {outcomeError}
                </div>
              )}

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Select Final Outcome</label>
                
                <label className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                  selectedOutcome === "offer_extended" ? "border-[#000666] bg-slate-50/70" : "border-slate-200 hover:bg-slate-50/40"
                }`}>
                  <input
                    type="radio"
                    name="outcome"
                    value="offer_extended"
                    checked={selectedOutcome === "offer_extended"}
                    onChange={() => setSelectedOutcome("offer_extended")}
                    className="mt-0.5 text-[#000666] focus:ring-[#000666]"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">Offer Extended</span>
                    <span className="text-[11px] text-slate-500">Placement confirmed; candidate and admins will be notified.</span>
                  </div>
                </label>

                <label className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                  selectedOutcome === "not_selected" ? "border-slate-800 bg-slate-50/70" : "border-slate-200 hover:bg-slate-50/40"
                }`}>
                  <input
                    type="radio"
                    name="outcome"
                    value="not_selected"
                    checked={selectedOutcome === "not_selected"}
                    onChange={() => setSelectedOutcome("not_selected")}
                    className="mt-0.5 text-slate-800 focus:ring-slate-800"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">Not Selected</span>
                    <span className="text-[11px] text-slate-500">Conclude application without extending an offer.</span>
                  </div>
                </label>

                {activeTask.type === "job_application" && (
                  <label className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedOutcome === "completed" ? "border-slate-800 bg-slate-50/70" : "border-slate-200 hover:bg-slate-50/40"
                  }`}>
                    <input
                      type="radio"
                      name="outcome"
                      value="completed"
                      checked={selectedOutcome === "completed"}
                      onChange={() => setSelectedOutcome("completed")}
                      className="mt-0.5 text-slate-800 focus:ring-slate-800"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Interview Conducted (Decision Pending)</span>
                      <span className="text-[11px] text-slate-500">Mark interview as completed while reviewing final decision.</span>
                    </div>
                  </label>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Evaluation / Private Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Internal notes on candidate performance..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#000666] focus:border-[#000666]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutcome}
                  className="px-4 py-2 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-medium transition disabled:opacity-50"
                >
                  {submittingOutcome ? "Saving..." : selectedOutcome === "offer_extended" ? "Confirm & Extend Offer" : "Confirm Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
