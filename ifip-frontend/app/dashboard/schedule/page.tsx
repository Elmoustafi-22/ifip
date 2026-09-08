"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineClock,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
  HiOutlineArrowDownTray,
  HiOutlineListBullet,
  HiOutlineSquares2X2,
  HiOutlineArrowRight
} from "react-icons/hi2";
import { getParticipantSchedule, ProgrammeSession } from "@/lib/api/services";

const SESSION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  orientation: { label: "Orientation", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  live_class: { label: "Live Class", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  async_module: { label: "Async Study", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  breakout: { label: "Breakout", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  assessment: { label: "Knowledge Check", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  other: { label: "Event", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

export default function ParticipantSchedulePage() {
  const [sessions, setSessions] = useState<ProgrammeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getParticipantSchedule();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load participant schedule:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Helper to generate .ics file for calendar export
  const downloadIcs = (session: ProgrammeSession) => {
    const startDate = new Date(session.sessionDate);
    const duration = session.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const formatIcsDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//IFIP Programme//Timetable//EN",
      "BEGIN:VEVENT",
      `UID:${session._id}@ifip.nextif.org`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${(session.description || "").replace(/\n/g, "\\n")}`,
      session.meetingUrl ? `LOCATION:${session.meetingUrl}` : "",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const now = new Date();

  // Group by week
  const weeks = [1, 2, 3, 4];
  const sessionsByWeek: Record<number, ProgrammeSession[]> = { 1: [], 2: [], 3: [], 4: [] };
  sessions.forEach(sess => {
    const w = sess.weekNumber || 1;
    if (!sessionsByWeek[w]) sessionsByWeek[w] = [];
    sessionsByWeek[w].push(sess);
  });

  const filteredSessions = selectedWeek === "all"
    ? sessions
    : sessions.filter(s => s.weekNumber === selectedWeek);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading programme timetable...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#000666]/60 block mb-1">
            Cohort Timetable &amp; Calendar
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight">
            Programme Schedule
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Weekly live lectures, break-out labs, async units, and deadlines across the 4-week fellowship.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "timeline"
                ? "bg-white text-[#000666] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineSquares2X2 className="w-4 h-4" />
            Weekly View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "list"
                ? "bg-white text-[#000666] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineListBullet className="w-4 h-4" />
            Full Agenda
          </button>
        </div>
      </div>

      {/* Week Selector Filters - Clean Single-Row Scrollable Tab Strip on Mobile */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedWeek("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
            selectedWeek === "all"
              ? "bg-[#000666] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All 4 Weeks
        </button>
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
              selectedWeek === w
                ? "bg-[#000666] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* TIMELINE / WEEKLY VIEW */}
      {viewMode === "timeline" && (
        <div className="space-y-6 sm:space-y-8">
          {(selectedWeek === "all" ? weeks : [selectedWeek as number]).map(weekNum => {
            const weekSessions = sessionsByWeek[weekNum] || [];

            return (
              <div 
                key={weekNum}
                className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Week Banner */}
                <div className="bg-slate-50/70 border-b border-[#E7E2D8] px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#000666] text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                      {weekNum}
                    </span>
                    <div>
                      <h3 className="font-bold text-[#000666] text-sm sm:text-base leading-tight">
                        Week {weekNum}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {weekSessions.length} Scheduled {weekSessions.length === 1 ? "Session" : "Sessions"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Cards */}
                <div className="divide-y divide-slate-100">
                  {weekSessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No live sessions or deadlines currently published for Week {weekNum}.
                    </div>
                  ) : (
                    weekSessions.map(sess => {
                      const cfg = SESSION_TYPE_CONFIG[sess.sessionType] || SESSION_TYPE_CONFIG.other;
                      const dateObj = new Date(sess.sessionDate);
                      const isPast = dateObj.getTime() < now.getTime() - 2 * 3600 * 1000;
                      const isUpcoming = dateObj.getTime() >= now.getTime();

                      const formattedTime = dateObj.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div 
                          key={sess._id}
                          className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 transition-all ${
                            isPast ? "bg-slate-50/40 opacity-80" : "hover:bg-slate-50/40"
                          }`}
                        >
                          {/* Left: Date + Details */}
                          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 min-w-0 flex-1 w-full">
                            {/* Mobile Date Header (Visible only on mobile) */}
                            <div className="sm:hidden flex items-center gap-2 flex-wrap w-full">
                              <span className="text-xs font-bold text-[#000666] bg-[#000666]/5 px-2.5 py-1 rounded-md">
                                {dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} • {formattedTime}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                <HiOutlineClock className="w-3.5 h-3.5" />
                                {sess.durationMinutes || 60} mins
                              </span>
                            </div>

                            {/* Desktop Date Tile (Hidden on mobile) */}
                            <div className={`hidden sm:block w-20 shrink-0 text-center rounded-xl p-2.5 border ${
                              isUpcoming 
                                ? "bg-white border-[#000666]/15 shadow-2xs" 
                                : "bg-slate-100 border-slate-200"
                            }`}>
                              <span className="block text-[10px] font-bold uppercase text-slate-400">
                                {dateObj.toLocaleDateString("en-GB", { weekday: "short" })}
                              </span>
                              <span className="block text-lg font-black text-[#000666]">
                                {dateObj.getDate()} {dateObj.toLocaleDateString("en-GB", { month: "short" })}
                              </span>
                              <span className="block text-xs font-mono font-bold text-[#000666]/80 mt-0.5">
                                {formattedTime}
                              </span>
                            </div>

                            {/* Session Information */}
                            <div className="space-y-1.5 min-w-0 flex-1 w-full">
                              {/* Desktop Badges Row */}
                              <div className="hidden sm:flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                  <HiOutlineClock className="w-3.5 h-3.5" />
                                  {sess.durationMinutes || 60} mins
                                </span>
                              </div>

                              <h4 className="text-sm sm:text-base font-bold text-[#000666] leading-snug break-words">
                                {sess.title}
                              </h4>

                              {sess.description && (
                                <p className="text-xs text-slate-500 leading-relaxed max-w-xl break-words line-clamp-2 sm:line-clamp-3">
                                  {sess.description}
                                </p>
                              )}

                              {/* Linked Module Link */}
                              {sess.moduleId && (
                                <div className="pt-0.5">
                                  <Link
                                    href={`/dashboard/modules/${(sess.moduleId as any)._id || sess.moduleId}/outline`}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#000666] hover:underline bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
                                  >
                                    <HiOutlineBookOpen className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Coursework: {(sess.moduleId as any).title || "View Outline"}</span>
                                    <HiOutlineArrowRight className="w-3 h-3 text-slate-400" />
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto shrink-0 justify-end">
                            {sess.meetingUrl ? (
                              <a
                                href={sess.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-xl shadow-2xs transition-all text-center"
                              >
                                <HiOutlineVideoCamera className="w-4 h-4" />
                                <span>Join {sess.meetingPlatform?.toUpperCase() || "Live"}</span>
                              </a>
                            ) : null}

                            <button
                              onClick={() => downloadIcs(sess)}
                              title="Add to Google/Apple/Outlook Calendar"
                              className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors shadow-2xs"
                            >
                              <HiOutlineArrowDownTray className="w-4 h-4 text-slate-400" />
                              <span className="hidden sm:inline">Add to Calendar</span>
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
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No sessions scheduled.
            </div>
          ) : (
            filteredSessions.map(sess => {
              const cfg = SESSION_TYPE_CONFIG[sess.sessionType] || SESSION_TYPE_CONFIG.other;
              const dateObj = new Date(sess.sessionDate);

              return (
                <div key={sess._id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/40">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-lg bg-[#000666]/5 text-[#000666] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      W{sess.weekNumber}
                    </span>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-bold text-[#000666]">
                          {dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#000666]">
                        {sess.title}
                      </h4>
                      {sess.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {sess.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto shrink-0 justify-end">
                    {sess.meetingUrl && (
                      <a
                        href={sess.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <HiOutlineVideoCamera className="w-3.5 h-3.5" />
                        Join
                      </a>
                    )}
                    <button
                      onClick={() => downloadIcs(sess)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#000666] border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <HiOutlineArrowDownTray className="w-3.5 h-3.5 text-slate-400" /> .ics
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
