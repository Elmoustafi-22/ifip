"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { 
  HiOutlineCalendar,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineClock,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
  HiOutlineLink,
  HiOutlineCheckCircle,
  HiOutlineChevronRight
} from "react-icons/hi2";
import { 
  getAdminSchedule,
  createAdminSession,
  updateAdminSession,
  deleteAdminSession,
  togglePublishSession,
  bulkPublishScheduleWeek,
  getLMSModules,
  ProgrammeSession,
  LMSModule
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

const SESSION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  orientation: { label: "Orientation", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  live_class: { label: "Live Class", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  async_module: { label: "Async Module", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  breakout: { label: "Breakout Session", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  assessment: { label: "Assessment", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  other: { label: "Other Session", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

export default function AdminSchedulePage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [sessions, setSessions] = useState<ProgrammeSession[]>([]);
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ProgrammeSession | null>(null);

  const [title, setTitle] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionType, setSessionType] = useState<any>("live_class");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<any>("zoom");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isPublished, setIsPublished] = useState(true);
  const [sessionCohortId, setSessionCohortId] = useState("");
  const [order, setOrder] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const filterParams = selectedCohortId && selectedCohortId !== "unassigned" 
        ? { cohortId: selectedCohortId }
        : undefined;

      const [scheduleData, modulesData] = await Promise.all([
        getAdminSchedule(filterParams),
        getLMSModules()
      ]);
      setSessions(scheduleData);
      setModules(modulesData);
    } catch (err) {
      console.error("Failed to load schedule sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCohortId]);

  const handleOpenCreate = (targetWeek?: number) => {
    setEditingSession(null);
    setTitle("");
    setWeekNumber(targetWeek || 1);
    
    // Default session date to current or upcoming date formatted for datetime-local input
    const now = new Date();
    now.setMinutes(0);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSessionDate(localIso);

    setSessionType("live_class");
    setDescription("");
    setModuleId("");
    setMeetingUrl("");
    setMeetingPlatform("zoom");
    setDurationMinutes(60);
    setIsPublished(true);
    setOrder(0);
    setSessionCohortId(selectedCohortId && selectedCohortId !== "unassigned" ? selectedCohortId : "");
    setModalOpen(true);
  };

  const handleOpenEdit = (sess: ProgrammeSession) => {
    setEditingSession(sess);
    setTitle(sess.title);
    setWeekNumber(sess.weekNumber);

    const d = new Date(sess.sessionDate);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSessionDate(localIso);

    setSessionType(sess.sessionType);
    setDescription(sess.description || "");
    setModuleId(sess.moduleId?._id || sess.moduleId || "");
    setMeetingUrl(sess.meetingUrl || "");
    setMeetingPlatform(sess.meetingPlatform || "zoom");
    setDurationMinutes(sess.durationMinutes || 60);
    setIsPublished(sess.isPublished);
    setOrder(sess.order || 0);
    setSessionCohortId(sess.cohortId?._id || sess.cohortId || "");
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await deleteAdminSession(id);
      fetchData();
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Failed to delete session.");
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      await togglePublishSession(id);
      fetchData();
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
      alert("Failed to update status.");
    }
  };

  const handleBulkPublish = async (week: number, publish: boolean) => {
    try {
      await bulkPublishScheduleWeek(
        week, 
        publish, 
        selectedCohortId && selectedCohortId !== "unassigned" ? selectedCohortId : undefined
      );
      fetchData();
    } catch (err) {
      console.error("Failed to bulk update week:", err);
      alert("Failed to bulk update week.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const payload: Partial<ProgrammeSession> = {
      title,
      weekNumber: Number(weekNumber),
      sessionDate: new Date(sessionDate).toISOString(),
      sessionType,
      description: description || undefined,
      moduleId: moduleId || undefined,
      meetingUrl: meetingUrl || undefined,
      meetingPlatform,
      durationMinutes: Number(durationMinutes),
      isPublished,
      order: Number(order),
      cohortId: sessionCohortId || undefined
    };

    try {
      if (editingSession) {
        await updateAdminSession(editingSession._id, payload);
      } else {
        await createAdminSession(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save session:", err);
      alert("Failed to save programme session.");
    } finally {
      setSubmitting(false);
    }
  };

  // Group sessions by weekNumber (e.g. Week 1, Week 2, Week 3, Week 4)
  const weeks = [1, 2, 3, 4];
  const sessionsByWeek: Record<number, ProgrammeSession[]> = { 1: [], 2: [], 3: [], 4: [] };
  
  sessions.forEach(sess => {
    const w = sess.weekNumber || 1;
    if (!sessionsByWeek[w]) sessionsByWeek[w] = [];
    sessionsByWeek[w].push(sess);
  });

  // Also catch any weeks beyond 4 if present
  Object.keys(sessionsByWeek).forEach(k => {
    const num = Number(k);
    if (!weeks.includes(num)) weeks.push(num);
  });
  weeks.sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading programme timetable...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
              &larr; Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
            <HiOutlineCalendar className="w-8 h-8 text-[#FF9800] shrink-0" />
            <span>Programme Timetable & Calendar Manager</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Schedule live Zoom lectures, orientation, async study blocks, and knowledge checks by week.
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0 mt-2 md:mt-0 flex gap-3">
          <button
            onClick={() => handleOpenCreate()}
            className="w-full md:w-auto bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4 text-[#FF9800]" />
            Add Session
          </button>
        </div>
      </div>

      {/* Weekly Schedule View */}
      <div className="space-y-8">
        {weeks.map((weekNum) => {
          const weekSessions = sessionsByWeek[weekNum] || [];
          const publishedCount = weekSessions.filter(s => s.isPublished).length;

          return (
            <div 
              key={weekNum}
              className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Week Header */}
              <div className="bg-slate-50 border-b border-[#E7E2D8] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#000666] text-white flex items-center justify-center font-black text-sm">
                    {weekNum}
                  </span>
                  <div>
                    <h3 className="font-bold text-[#000666] text-base">
                      Week {weekNum} Schedule
                    </h3>
                    <p className="text-xs text-slate-500">
                      {weekSessions.length} total events • {publishedCount} published to participants
                    </p>
                  </div>
                </div>

                {/* Week Actions */}
                <div className="flex items-center gap-2">
                  {weekSessions.length > 0 && (
                    <>
                      {publishedCount < weekSessions.length && (
                        <button
                          onClick={() => handleBulkPublish(weekNum, true)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <HiOutlineEye className="w-3.5 h-3.5" /> Publish All
                        </button>
                      )}
                      {publishedCount > 0 && (
                        <button
                          onClick={() => handleBulkPublish(weekNum, false)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <HiOutlineEyeSlash className="w-3.5 h-3.5" /> Unpublish All
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => handleOpenCreate(weekNum)}
                    className="text-xs font-bold text-[#000666] hover:bg-[#000666]/5 border border-[#000666]/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-3.5 h-3.5 text-[#FF9800]" /> Add Event
                  </button>
                </div>
              </div>

              {/* Sessions List */}
              <div className="divide-y divide-slate-100">
                {weekSessions.length === 0 ? (
                  <div className="px-6 py-10 text-center text-slate-400 text-xs">
                    <p>No sessions scheduled for Week {weekNum}.</p>
                    <button
                      onClick={() => handleOpenCreate(weekNum)}
                      className="mt-2 text-sky-600 hover:underline font-bold"
                    >
                      + Schedule a session
                    </button>
                  </div>
                ) : (
                  weekSessions.map((sess) => {
                    const cfg = SESSION_TYPE_CONFIG[sess.sessionType] || SESSION_TYPE_CONFIG.other;
                    const dateObj = new Date(sess.sessionDate);
                    const formattedDate = dateObj.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });
                    const formattedTime = dateObj.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div 
                        key={sess._id} 
                        className={`p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                          !sess.isPublished ? "bg-slate-50/70 opacity-75" : "hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Date & Title */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="w-24 shrink-0 text-center bg-slate-100 rounded-xl p-2.5 border border-slate-200">
                            <span className="block text-[11px] font-bold uppercase text-slate-400">
                              {dateObj.toLocaleDateString("en-GB", { weekday: "short" })}
                            </span>
                            <span className="block text-base font-black text-[#000666]">
                              {dateObj.getDate()} {dateObj.toLocaleDateString("en-GB", { month: "short" })}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                              {formattedTime}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                              {!sess.isPublished && (
                                <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                  Draft / Hidden
                                </span>
                              )}
                              {sess.cohortId ? (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {sess.cohortId.name || "Cohort"}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  All Cohorts
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-[#000666] text-sm">
                              {sess.title}
                            </h4>

                            {sess.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">
                                {sess.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <HiOutlineClock className="w-3.5 h-3.5" />
                                {sess.durationMinutes || 60} mins
                              </span>

                              {sess.meetingUrl && (
                                <a 
                                  href={sess.meetingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <HiOutlineVideoCamera className="w-3.5 h-3.5" />
                                  {sess.meetingPlatform?.toUpperCase() || "MEETING"} LINK &rarr;
                                </a>
                              )}

                              {sess.moduleId && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <HiOutlineBookOpen className="w-3.5 h-3.5" />
                                  Linked: {(sess.moduleId as any).title || "Module"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                          <button
                            onClick={() => handleTogglePublish(sess._id)}
                            title={sess.isPublished ? "Unpublish from participant view" : "Publish to participant view"}
                            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                              sess.isPublished 
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                                : "border-slate-200 text-slate-600 bg-slate-100 hover:bg-slate-200"
                            }`}
                          >
                            {sess.isPublished ? (
                              <>
                                <HiOutlineEye className="w-4 h-4" /> Published
                              </>
                            ) : (
                              <>
                                <HiOutlineEyeSlash className="w-4 h-4" /> Draft
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenEdit(sess)}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg border border-sky-200 text-xs font-bold"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(sess._id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-200 text-xs font-bold"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <HiOutlineCalendar className="w-5 h-5 text-[#FF9800]" /> 
                {editingSession ? "Edit Timetable Session" : "Add Programme Session"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Live Class: Islamic Social Finance Structuring"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Week Number *
                  </label>
                  <select
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-bold"
                  >
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                    <option value={3}>Week 3</option>
                    <option value={4}>Week 4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Session Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Session Type *
                  </label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-medium"
                  >
                    <option value="orientation">Orientation</option>
                    <option value="live_class">Live Class (Zoom / Meet)</option>
                    <option value="async_module">Async Module Study</option>
                    <option value="breakout">Breakout / Group Work</option>
                    <option value="assessment">Knowledge Check / Assessment</option>
                    <option value="other">Other Activity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                  Description / Instructions for Participants
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline key agenda points, prerequisites, or preparation instructions..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs h-16 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Meeting Platform & Link
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={meetingPlatform}
                      onChange={(e) => setMeetingPlatform(e.target.value)}
                      className="w-1/3 px-2 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Meet</option>
                      <option value="teams">Teams</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none text-xs bg-white font-mono"
                    min={15}
                    step={15}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Link to LMS Coursework Module (Optional)
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-medium"
                  >
                    <option value="">-- No Module Linked --</option>
                    {modules.map((m) => (
                      <option key={m._id} value={m._id}>
                        #{m.order}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Assigned Cohort (Optional)
                  </label>
                  <select
                    value={sessionCohortId}
                    onChange={(e) => setSessionCohortId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-medium"
                  >
                    <option value="">Global (All Cohorts)</option>
                    {cohorts.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-[#000666] focus:ring-[#FF9800]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Publish immediately to participants
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
                  >
                    {submitting ? "Saving..." : (editingSession ? "Save Changes" : "Create Session")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
