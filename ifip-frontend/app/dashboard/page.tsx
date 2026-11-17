"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBookOpen,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineDocumentArrowUp,
  HiOutlineFolderOpen,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlineVideoCamera,
} from "react-icons/hi2";
import { getUpcomingSessions, getLMSModules, type ProgrammeSession, type LMSModule } from "@/lib/api/services";
import { useDashboard } from "./dashboard-context";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";
const button = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold motion-safe:transition-colors ${focus}`;
const outline = `${button} border border-[#aebdd0] bg-white text-[#101f3f] hover:bg-[#eef4fa] disabled:opacity-60`;
const heroAction = `${button} bg-[#e1f1fb] text-[#101f3f] hover:bg-white focus-visible:outline-white`;
const panel = "min-w-0 rounded-2xl border border-[#cbd8e8] bg-white";
const hero = "relative isolate overflow-hidden rounded-2xl bg-[#101f3f] p-5 text-white sm:p-7";
const links = [
  { href: "/dashboard/assessments", label: "Assessments", detail: "Quizzes, simulations, and module checkpoints.", icon: HiOutlineClipboardDocumentCheck },
  { href: "/dashboard/placement", label: "Placement", detail: "Track your placement and interview activity.", icon: HiOutlineBriefcase },
  { href: "/dashboard/resources", label: "Resources", detail: "Find reference materials and reading packs.", icon: HiOutlineFolderOpen },
];

function HeroPattern() {
  return <div aria-hidden="true" className="pointer-events-none absolute -end-48 -top-64 -z-10 hidden size-[34rem] rounded-full border border-[#5eabcf]/25 shadow-[0_0_0_28px_#5eabcf12,0_0_0_60px_#5eabcf0d] sm:block" />;
}

function Retry({ message, busy, onRetry }: { message: string; busy: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
      <p role="alert">{message}</p>
      <button className={outline} type="button" disabled={busy} onClick={onRetry}>{busy ? "Retrying…" : "Try again"}</button>
    </div>
  );
}

function UpcomingSessions({ sessions, failed, loading, onRetry }: {
  sessions: ProgrammeSession[] | null;
  failed: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <section aria-labelledby="participant-sessions" className={panel}>
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
        <div>
          <h2 id="participant-sessions" className="font-display text-2xl">Upcoming sessions</h2>
          <p className="mt-1 text-sm text-[#465a74]">Live sessions from your cohort timetable.</p>
        </div>
        <Link href="/dashboard/schedule" className={outline}>
          Full timetable <HiOutlineArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </header>

      {failed && <div className="px-4 pb-4 sm:px-6"><Retry message={sessions ? "Could not refresh sessions. Showing the previous list." : "Could not load upcoming sessions."} busy={loading} onRetry={onRetry} /></div>}
      {sessions === null && !failed && <p role="status" className="border-t border-[#dce5ef] px-4 py-5 text-sm text-[#465a74] sm:px-6">Loading upcoming sessions…</p>}
      {sessions?.length === 0 && !failed && (
        <div className="flex items-start gap-3 border-t border-[#dce5ef] px-4 py-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1f1fb] text-[#12617e]"><HiOutlineCalendar aria-hidden="true" className="size-5" /></span>
          <div><p className="text-sm font-semibold">No upcoming sessions</p><p className="mt-1 text-sm text-[#465a74]">Check the full timetable for later dates.</p></div>
        </div>
      )}
      {sessions && sessions.length > 0 && (
        <ul className="divide-y divide-[#dce5ef] border-t border-[#dce5ef]">
          {sessions.map((session) => {
            const date = new Date(session.sessionDate);
            const dateLabel = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
            const timeLabel = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
            return (
              <li key={session._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 flex-[1_1_12rem] items-start gap-3">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1f1fb] text-[#12617e]"><HiOutlineCalendar className="size-5" /></span>
                  <div className="min-w-0 wrap-anywhere">
                    <h3 className="font-sans text-sm font-bold">{session.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs leading-relaxed text-[#465a74]">
                      <time dateTime={session.sessionDate}>{dateLabel} · {timeLabel}</time>
                      <span>{session.durationMinutes || 60} min</span>
                    </div>
                  </div>
                </div>
                {session.meetingUrl ? (
                  <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className={outline} aria-label={`Join ${session.title} (opens in a new tab)`}>
                    <HiOutlineVideoCamera aria-hidden="true" className="size-4" /> Join <HiOutlineArrowTopRightOnSquare aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  <span className="rounded-md bg-[#eef4fa] px-2 py-1 text-xs font-medium text-[#394d69]">Scheduled</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function DashboardHome() {
  const { profile, isLaunched, cohortStartLabel } = useDashboard();
  const cohortName = profile.cohort?.name;
  const [modules, setModules] = useState<LMSModule[] | null>(null);
  const [sessions, setSessions] = useState<ProgrammeSession[] | null>(null);
  const [modulesError, setModulesError] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  function loadOverview() {
    const request = ++requestId.current;
    return Promise.allSettled([getLMSModules(), getUpcomingSessions()]).then(([coursework, schedule]) => {
      if (request !== requestId.current) return;
      if (coursework.status === "fulfilled") setModules(coursework.value);
      if (schedule.status === "fulfilled") setSessions(schedule.value);
      setModulesError(coursework.status === "rejected");
      setSessionsError(schedule.status === "rejected");
      setLoading(false);
    });
  }

  useEffect(() => { if (isLaunched) void loadOverview(); }, [isLaunched]);

  function retryOverview() {
    setLoading(true);
    void loadOverview();
  }

  if (!isLaunched) {
    return (
      <section aria-labelledby="training-welcome" className={`${hero} mx-auto w-full max-w-3xl sm:p-9`}>
        <HeroPattern />
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d1e0f1]">
          <HiOutlineLockClosed aria-hidden="true" className="size-4" /> Training access pending
        </div>
        <h1 id="training-welcome" className="font-display text-[clamp(2rem,5vw,3rem)] leading-tight text-white">Welcome to IFIP</h1>
        <p className="mt-3 max-w-[55ch] wrap-anywhere text-sm leading-relaxed text-[#d1e0f1]">
          {cohortName ? `Training modules and assessments for ${cohortName} are currently locked.` : "Your training details will appear here once your cohort is assigned."}
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-4 sm:max-w-sm">
          <HiOutlineCalendar aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#cce9fa]" />
          <div><p className="text-xs text-[#d1e0f1]">Training start</p><p className="mt-1 text-lg font-semibold">{cohortStartLabel ?? "To be announced"}</p></div>
        </div>
      </section>
    );
  }

  const currentModule = modules?.find((module) => module.status === "in_progress" && !module.isLocked)
    ?? modules?.find((module) => (module.status === "not_started" || module.status === "unlocked") && !module.isLocked);
  const completed = modules?.filter((module) => module.status === "completed").length ?? 0;
  const assessments = modules?.filter((module) => module.assessmentId) ?? [];
  const passed = assessments.filter((module) => module.assessmentStatus === "passed").length;
  const total = modules?.length ?? 0;
  const available = modules?.filter((module) => module.status !== "locked" && !module.isLocked).length ?? 0;
  const courseworkAction = currentModule
    ? currentModule.status === "in_progress" ? "Continue learning" : "Start module"
    : "View modules";

  return (
    <div className="space-y-5 text-[#101f3f] sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-[#12617e]">{cohortName ?? "Learning overview"}</p>
          <h1 className="wrap-anywhere font-display text-[clamp(1.875rem,4vw,2.65rem)] leading-tight tracking-tight">Welcome, {profile.fullName || "participant"}</h1>
        </div>
        <Link href="/dashboard/settings" className={`${outline} max-lg:hidden`}><HiOutlineUser aria-hidden="true" className="size-4" /> Profile</Link>
      </header>

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section aria-labelledby="participant-coursework" className={hero}>
          <HeroPattern />
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#cce9fa]">
            <HiOutlineBookOpen aria-hidden="true" className="size-4" />
            {currentModule?.weekNumber ? `Coursework · Week ${currentModule.weekNumber}` : "Coursework"}
          </div>
          <h2 id="participant-coursework" className="wrap-anywhere font-display text-2xl leading-tight text-white sm:text-3xl">
            {currentModule?.title ?? (total > 0 && completed === total ? "Coursework complete" : "Your learning modules")}
          </h2>
          <p className="mt-2 max-w-[60ch] wrap-anywhere text-sm leading-relaxed text-[#d1e0f1]">
            {currentModule?.description || (modules?.length === 0 ? "No modules are available for your cohort yet." : "Open the module list to see your coursework and materials.")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link href={currentModule ? `/dashboard/modules/${currentModule._id}` : "/dashboard/modules"} className={heroAction}>
              {courseworkAction} <HiOutlineArrowRight aria-hidden="true" className="size-4" />
            </Link>
            {cohortStartLabel && <p className="flex items-center gap-2 text-xs text-[#d1e0f1]"><HiOutlineCalendar aria-hidden="true" className="size-4" /> Cohort start · {cohortStartLabel}</p>}
          </div>
        </section>

        <section aria-labelledby="participant-progress" className={`${panel} p-4 sm:p-6`}>
          <h2 id="participant-progress" className="font-display text-2xl">Learning progress</h2>
          {modulesError && <div className="mt-3"><Retry message={modules ? "Could not refresh progress. Showing the previous totals." : "Could not load learning progress."} busy={loading} onRetry={retryOverview} /></div>}
          {modules === null && !modulesError && <p role="status" className="mt-3 text-sm text-[#465a74]">Loading coursework…</p>}
          {modules && (
            <>
              <label htmlFor="participant-module-progress" className="mt-4 flex flex-wrap items-baseline justify-between gap-1 text-sm font-semibold">
                Modules completed <span className="tabular-nums">{completed} of {total}</span>
              </label>
              <progress id="participant-module-progress" value={completed} max={total || 1}
                className="mt-2 block h-2.5 w-full overflow-hidden rounded-full bg-[#e1eaf4] accent-[#12617e] [&::-webkit-progress-bar]:bg-[#e1eaf4] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#12617e] [&::-moz-progress-bar]:bg-[#12617e]" />
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[#dce5ef] pt-3">
                <div><dt className="text-xs text-[#465a74]">Modules unlocked</dt><dd className="mt-1 text-base font-semibold tabular-nums">{available} of {total}</dd></div>
                <div><dt className="text-xs text-[#465a74]">Assessments passed</dt><dd className="mt-1 text-base font-semibold tabular-nums">{passed} of {assessments.length}</dd></div>
              </dl>
            </>
          )}
        </section>
      </div>

      {!profile.cvUrl && (
        <section aria-labelledby="participant-documents" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100"><HiOutlineDocumentArrowUp aria-hidden="true" className="size-5" /></span>
            <div><h2 id="participant-documents" className="font-sans text-sm font-bold">Upload your CV</h2><p className="mt-1 text-sm">Add your latest CV to your participant profile as a PDF.</p></div>
          </div>
          <Link href="/dashboard/settings#documents" className={outline}>Open documents <HiOutlineArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
      )}

      <UpcomingSessions sessions={sessions} failed={sessionsError} loading={loading} onRetry={retryOverview} />

      <section aria-labelledby="participant-shortcuts">
        <h2 id="participant-shortcuts" className="mb-3 font-display text-2xl">Program tools</h2>
        <ul className={`${panel} grid divide-y divide-[#dce5ef] sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
          {links.map(({ href, label, detail, icon: Icon }) => (
            <li key={href} className="min-w-0">
              <Link href={href} className={`group flex h-full min-w-0 items-start gap-3 rounded-xl p-4 hover:bg-[#f8fbfe] sm:flex-col ${focus}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1f1fb] text-[#12617e]"><Icon aria-hidden="true" className="size-5" /></span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-bold">{label} <HiOutlineArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#12617e]" /></h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#465a74]">{detail}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
