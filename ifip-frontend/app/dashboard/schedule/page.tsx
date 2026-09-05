"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
  HiOutlineArrowDownTray,
  HiOutlineCheckCircle,
  HiOutlineListBullet,
  HiOutlineSquares2X2,
  HiOutlineSparkles,
  HiOutlineInformationCircle,
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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Header Section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9800] block mb-1">
            Cohort Timetable & Calendar
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight">
            Programme Schedule
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Weekly live lectures, break-out labs, async units, and deadlines across the 4-week fellowship.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "timeline"
                ? "bg-white text-[#000666] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineSquares2X2 className="w-4 h-4" />
            Weekly View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "list"
                ? "bg-white text-[#000666] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineListBullet className="w-4 h-4" />
            Full Agenda
          </button>
        </div>
      </div>

      {/* Week Selector Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setSelectedWeek("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedWeek === "all"
              ? "bg-[#000666] text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All 4 Weeks
        </button>
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedWeek === w
                ? "bg-[#000666] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* TIMELINE / WEEKLY VIEW */}
      {viewMode === "timeline" && (
        <div className="space-y-8">
          {(selectedWeek === "all" ? weeks : [selectedWeek as number]).map(weekNum => {
            const weekSessions = sessionsByWeek[weekNum] || [];

            return (
              <div 
                key={weekNum}
                className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Week Banner */}
                <div className="bg-slate-50/80 border-b border-[#E7E2D8] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#000666] text-white flex items-center justify-center font-black text-sm">
                      {weekNum}
                    </span>
                    <div>
                      <h3 className="font-bold text-[#000666] text-base">
                        Week {weekNum}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {weekSessions.length} Scheduled Sessions & Activities
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

                      const formattedDate = dateObj.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      });
                      const formattedTime = dateObj.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div 
                          key={sess._id}
                          className={`p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
                            isPast ? "bg-slate-50/50 opacity-80" : "hover:bg-slate-50/50"
                          }`}
                        >
                          {/* Left: Date + Details */}
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {/* Date Badge */}
                            <div className={`w-24 shrink-0 text-center rounded-2xl p-3 border ${
                              isUpcoming 
                                ? "bg-white border-[#000666]/20 shadow-sm" 
                                : "bg-slate-100 border-slate-200"
                            }`}>
                              <span className="block text-[11px] font-bold uppercase text-slate-400">
                                {dateObj.toLocaleDateString("en-GB", { weekday: "short" })}
                              </span>
                              <span className="block text-xl font-black text-[#000666]">
                                {dateObj.getDate()} {dateObj.toLocaleDateString("en-GB", { month: "short" })}
                              </span>
                              <span className="block text-xs font-mono font-bold text-[#FF9800] mt-0.5">
                                {formattedTime}
                              </span>
                            </div>

                            {/* Session Information */}
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                  <HiOutlineClock className="w-3.5 h-3.5" />
                                  {sess.durationMinutes || 60} mins
                                </span>
                              </div>

                              <h4 className="text-base font-bold text-[#000666] leading-snug">
                                {sess.title}
                              </h4>

                              {sess.description && (
                                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                                  {sess.description}
                                </p>
                              )}

                              {/* Linked Module Link */}
                              {sess.moduleId && (
                                <div className="pt-1">
                                  <Link
                                    href={`/dashboard/modules/${(sess.moduleId as any)._id || sess.moduleId}/outline`}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200"
                                  >
                                    <HiOutlineBookOpen className="w-3.5 h-3.5 text-[#FF9800]" />
                                    <span>Coursework: {(sess.moduleId as any).title || "View Outline"} &rarr;</span>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-end md:self-center shrink-0 w-full sm:w-auto">
                            {sess.meetingUrl ? (
                              <a
                                href={sess.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold tracking-wider uppercase px-5 py-3 rounded-xl shadow-sm transition-all text-center"
                              >
                                <HiOutlineVideoCamera className="w-4 h-4 text-[#FF9800]" />
                                <span>Join {sess.meetingPlatform?.toUpperCase() || "Live"}</span>
                              </a>
                            ) : null}

                            <button
                              onClick={() => downloadIcs(sess)}
                              title="Add to Google/Apple/Outlook Calendar"
                              className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-3 rounded-xl transition-colors shadow-sm"
                            >
                              <HiOutlineArrowDownTray className="w-4 h-4 text-slate-500" />
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
        <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No sessions scheduled.
            </div>
          ) : (
            filteredSessions.map(sess => {
              const cfg = SESSION_TYPE_CONFIG[sess.sessionType] || SESSION_TYPE_CONFIG.other;
              const dateObj = new Date(sess.sessionDate);

              return (
                <div key={sess._id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-[#000666] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      W{sess.weekNumber}
                    </span>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-bold text-[#000666]">
                          {dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at {dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
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

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {sess.meetingUrl && (
                      <a
                        href={sess.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#000666] bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1"
                      >
                        <HiOutlineVideoCamera className="w-4 h-4 text-[#FF9800]" />
                        Join
                      </a>
                    )}
                    <button
                      onClick={() => downloadIcs(sess)}
                      className="text-xs font-bold text-slate-600 hover:text-[#000666] border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-1"
                    >
                      <HiOutlineArrowDownTray className="w-3.5 h-3.5" /> .ics
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
