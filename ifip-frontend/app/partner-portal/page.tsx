"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiOutlineArrowRight,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineUsers,
  HiOutlineVideoCamera,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getPartnerMe,
  getPartnerTasks,
  logJobInterviewOutcome,
  logOutcome,
  type PartnerMeResponse,
  type PartnerInterviewTask,
} from "@/lib/api/partner";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";
const button = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold motion-safe:transition-colors ${focus}`;
const secondary = `${button} border border-[#aebdd0] bg-white text-[#101f3f] hover:bg-[#eef4fa]`;
const primary = `${button} bg-[#101f3f] text-white hover:bg-[#24395f] disabled:opacity-60`;
const surface = "rounded-2xl border border-[#cbd8e8] bg-white";
const interviewsHeading = "partner-interviews";

const interviewDateOptions = {
  weekday: "short", day: "numeric", month: "short", hour: "numeric",
  minute: "2-digit", hour12: true, timeZoneName: "short",
} satisfies Intl.DateTimeFormatOptions;

type Outcome = "offer_extended" | "not_selected" | "completed";

const outcomes = [
  { value: "offer_extended", title: "Offer extended", description: "Record an offer for this candidate." },
  { value: "not_selected", title: "Not selected", description: "Close the interview without extending an offer." },
  { value: "completed", title: "Interview completed, decision pending", description: "Record that the interview took place and decide later." },
] satisfies { value: Outcome; title: string; description: string }[];

function InterviewList({ title, items, onOutcome, needsDecision = false }: {
  title: string;
  items: PartnerInterviewTask[];
  onOutcome: (task: PartnerInterviewTask) => void;
  needsDecision?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-[#dce5ef]">
      <h3 className="flex items-center gap-2 bg-[#f8fbfe] px-4 py-3 font-sans text-sm font-semibold sm:px-6">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${needsDecision ? "bg-amber-100 text-amber-900" : "bg-[#e1f1fb] text-[#12617e]"}`}>{items.length}</span>
      </h3>
      <ul className="divide-y divide-[#dce5ef]">
        {items.map((task) => (
          <li key={`${task.type}-${task.id}`} className="grid min-w-0 gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e1f1fb] text-sm font-semibold text-[#12617e]">
                {task.candidateName.charAt(0)}
              </span>
              <div className="min-w-0 wrap-anywhere">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h4 className="font-sans text-sm font-bold">{task.candidateName}</h4>
                  <span className="rounded-md bg-[#eef4fa] px-2 py-0.5 text-xs font-medium text-[#394d69]">
                    {task.type === "job_application" ? "Job opening" : "Placement match"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#394d69]">{task.role}{task.department ? ` · ${task.department}` : ""}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs leading-relaxed text-[#465a74]">
                  <span>{task.candidateEmail}</span>
                  {task.candidatePhone && <span>{task.candidatePhone}</span>}
                </p>
              </div>
            </div>

            <div className="min-w-0 space-y-2.5 sm:w-64">
              <div className="flex items-start gap-2 text-sm">
                <HiOutlineCalendar aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#12617e]" />
                <div className="min-w-0 wrap-anywhere">
                  <time dateTime={task.interviewDate} className="font-semibold">
                    {new Date(task.interviewDate).toLocaleString("en-GB", interviewDateOptions)}
                  </time>
                  <p className="text-xs leading-relaxed text-[#465a74]">
                    {task.interviewFormat}{task.interviewLocation ? ` · ${task.interviewLocation}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!task.isOverdue && task.interviewLink && (
                  <a href={task.interviewLink} target="_blank" rel="noopener noreferrer"
                    aria-label={`Join interview with ${task.candidateName} (opens in a new tab)`} className={secondary}>
                    <HiOutlineVideoCamera aria-hidden="true" className="size-4" />
                    Join
                    <HiOutlineArrowTopRightOnSquare aria-hidden="true" className="size-3" />
                  </a>
                )}
                <button type="button" className={secondary}
                  aria-label={`Record outcome for ${task.candidateName}`}
                  onClick={() => onOutcome(task)}>
                  Record outcome
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PartnerOverviewPage() {
  const [data, setData] = useState<PartnerMeResponse | null>(null);
  const [tasks, setTasks] = useState<PartnerInterviewTask[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [interviewsError, setInterviewsError] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTask, setActiveTask] = useState<PartnerInterviewTask | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);
  const [outcomeError, setOutcomeError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const queueHeading = useRef<HTMLHeadingElement>(null);
  const dashboardRequest = useRef(0);

  function loadDashboard() {
    const request = ++dashboardRequest.current;
    return Promise.allSettled([getPartnerMe(), getPartnerTasks()]).then(([overview, interviews]) => {
      if (request !== dashboardRequest.current) return;
      if (overview.status === "fulfilled") setData(overview.value);
      if (interviews.status === "fulfilled") setTasks(interviews.value.tasks.interviews);
      setOverviewError(overview.status === "rejected");
      setInterviewsError(interviews.status === "rejected");
      setLoading(false);
    });
  }

  useEffect(() => { void loadDashboard(); }, []);

  useEffect(() => {
    if (activeTask && !dialog.current?.open) dialog.current?.showModal();
  }, [activeTask]);

  function retryDashboard() {
    setLoading(true);
    void loadDashboard();
  }

  function openOutcome(task: PartnerInterviewTask) {
    setActiveTask(task);
    setSelectedOutcome(null);
    setOutcomeNotes(task.partnerNotes || "");
    setOutcomeError("");
    setStatus("");
  }

  function closeOutcome() {
    dialog.current?.close();
    setActiveTask(null);
  }

  async function saveOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTask || !selectedOutcome || submittingOutcome) return;
    setSubmittingOutcome(true);
    setOutcomeError("");

    try {
      if (activeTask.type === "job_application") {
        await logJobInterviewOutcome(activeTask.sourceId, activeTask.id, selectedOutcome, outcomeNotes.trim() || undefined);
      } else {
        await logOutcome(activeTask.id, selectedOutcome === "not_selected" ? "not_selected" : "offer_extended");
      }

      closeOutcome();
      setStatus("Interview outcome recorded.");
      await loadDashboard();
      queueHeading.current?.focus();
    } catch (error) {
      setOutcomeError(error instanceof Error && error.message ? error.message : "Could not record the outcome. Try again.");
    } finally {
      setSubmittingOutcome(false);
    }
  }

  if (loading && !data && !tasks) {
    return (
      <div role="status" className="space-y-5">
        <span className="sr-only">Loading partner overview</span>
        <div aria-hidden="true" className="h-52 rounded-2xl bg-[#dce8f3] motion-safe:animate-pulse" />
        <div aria-hidden="true" className="h-28 rounded-2xl bg-[#e4edf5] motion-safe:animate-pulse" />
      </div>
    );
  }

  const org = data?.org;
  const stats = data?.stats;
  const needsDecision = tasks?.filter((task) => task.isOverdue) ?? [];
  const upcoming = tasks?.filter((task) => !task.isOverdue) ?? [];
  const metrics = [
    { label: "Candidate pool", value: stats?.availableInterns, icon: HiOutlineUsers, hint: "Available for selection" },
    { label: "Scheduled interviews", value: stats?.scheduledInterviews, icon: HiOutlineCalendar, hint: "Awaiting completion or outcome" },
    { label: "Confirmed hires", value: stats?.confirmedHires, icon: HiOutlineCheck, hint: "Recorded by IFIP" },
    { label: "Pending requests", value: stats?.pendingRequests, icon: HiOutlineClock, hint: "Under IFIP review" },
    { label: "Slots remaining", value: stats?.slotsRemaining, icon: HiOutlineBriefcase, hint: org ? `Of ${org.activeSlots} allocated slots` : "Allocated by IFIP" },
  ];

  return (
    <div className="space-y-6 text-[#101f3f]">
      <section aria-labelledby="partner-overview-title" className="relative isolate overflow-hidden rounded-2xl bg-[#101f3f] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -end-36 -top-60 -z-10 hidden size-[34rem] rounded-full border border-[#5eabcf]/25 shadow-[0_0_0_28px_#5eabcf12,0_0_0_60px_#5eabcf0d] md:block" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-3 flex items-center gap-2.5 text-xs font-semibold text-[#cce9fa]">
              {org?.logoUrl ? (
                <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image src={org.logoUrl} alt="" fill sizes="36px" className="object-contain p-1" />
                </span>
              ) : (
                <HiOutlineBriefcase aria-hidden="true" className="size-4 shrink-0" />
              )}
              {org ? "Partner overview" : "IFIP partner portal"}
            </div>
            <h1 id="partner-overview-title" className="wrap-anywhere font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight text-white">
              {org?.name || "Partner overview"}
            </h1>
            <p className="mt-2 max-w-[60ch] wrap-anywhere text-sm leading-relaxed text-[#d1e0f1]">
              {org?.description || "Review interviews, find candidates, and manage placements."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {needsDecision.length > 0 && (
              <a href={`#${interviewsHeading}`} className={`${button} bg-[#e1f1fb] text-[#101f3f] hover:bg-white focus-visible:outline-white`}>
                {needsDecision.length === 1 ? "Review 1 decision" : `Review ${needsDecision.length} decisions`}
                <HiOutlineArrowRight aria-hidden="true" className="size-4" />
              </a>
            )}
            <Link href="/partner-portal/interns" className={`${button} focus-visible:outline-white ${needsDecision.length > 0 ? "border border-white/35 text-white hover:bg-white/10" : "bg-[#e1f1fb] text-[#101f3f] hover:bg-white"}`}>
              Browse candidate pool <HiOutlineArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {overviewError && (
        <div className={`${surface} flex flex-wrap items-center justify-between gap-3 p-4 text-sm`}>
          <p role="alert">{data ? "Could not refresh the overview. Showing the previous totals." : "Could not load organization details or totals."}</p>
          <button type="button" className={secondary} disabled={loading} onClick={retryDashboard}>{loading ? "Retrying…" : "Try again"}</button>
        </div>
      )}

      {stats && (
        <dl aria-label="Recruitment summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#cbd8e8] bg-[#dce5ef] sm:grid-cols-3 xl:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon, hint }, index) => (
            <div key={label} className={`min-w-0 bg-white p-4 ${index === metrics.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <Icon aria-hidden="true" className="mb-2 size-5 text-[#12617e]" />
              <dt className="text-sm font-semibold leading-snug text-[#263b59]">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {value ?? <span aria-label="Unavailable">—</span>}
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-[#465a74]">{hint}</dd>
            </div>
          ))}
        </dl>
      )}

      <section aria-labelledby={interviewsHeading} className={surface}>
        <header className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6">
          <div>
            <h2 id={interviewsHeading} ref={queueHeading} tabIndex={-1} className="scroll-mt-20 font-display text-2xl text-[#101f3f]">
              Interview queue
            </h2>
            <p className="mt-1 text-sm text-[#465a74]">Review meetings and record interview outcomes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/partner-portal/placements" className={secondary}>Placements</Link>
            <Link href="/partner-portal/openings" className={secondary}>Job openings</Link>
          </div>
        </header>
        <p role="status" className={status ? "mx-4 mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 sm:mx-6" : "sr-only"}>{status}</p>

        {interviewsError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dce5ef] bg-amber-50 px-4 py-3 sm:px-6">
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <HiOutlineExclamationCircle aria-hidden="true" className="size-5 shrink-0" />
              {tasks ? "Could not refresh interviews. Showing the previous list." : "Could not load interviews."}
            </p>
            <button type="button" className={secondary} disabled={loading} onClick={retryDashboard}>{loading ? "Retrying…" : "Try again"}</button>
          </div>
        )}

        {tasks?.length === 0 && !interviewsError ? (
          <div className="border-t border-[#dce5ef] px-4 py-9 text-center sm:px-6">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-[#e1f1fb] text-[#12617e]">
              <HiOutlineClipboardDocumentList aria-hidden="true" className="size-6" />
            </span>
            <h3 className="font-sans text-base font-semibold">No interviews to review</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-[#465a74]">
              Scheduled interviews and interviews awaiting an outcome will appear here.
            </p>
          </div>
        ) : (
          <>
            <InterviewList title="Decision required" items={needsDecision} onOutcome={openOutcome} needsDecision />
            <InterviewList title="Upcoming" items={upcoming} onOutcome={openOutcome} />
          </>
        )}
      </section>

      {activeTask && (
        <dialog ref={dialog} onCancel={(event) => {
          event.preventDefault();
          if (!submittingOutcome) closeOutcome();
        }}
          aria-labelledby="partner-outcome-title" aria-describedby="partner-outcome-candidate"
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overscroll-contain rounded-2xl border border-[#cbd8e8] bg-white p-4 text-[#101f3f] shadow-xl backdrop:bg-[#101f3f]/60 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 wrap-anywhere">
              <h2 id="partner-outcome-title" className="font-display text-2xl">Record interview outcome</h2>
              <p id="partner-outcome-candidate" className="mt-1 text-sm text-[#465a74]">{activeTask.candidateName} · {activeTask.role}</p>
            </div>
            <button type="button" aria-label="Close outcome dialog" disabled={submittingOutcome} onClick={closeOutcome}
              className={`grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[#eef4fa] ${focus}`}>
              <HiOutlineXMark aria-hidden="true" className="size-5" />
            </button>
          </div>

          <form onSubmit={saveOutcome} className="mt-4 space-y-4">
            {outcomeError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{outcomeError}</p>}
            <fieldset disabled={submittingOutcome} className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">Outcome</legend>
              {outcomes.filter(({ value }) => value !== "completed" || activeTask.type === "job_application").map(({ value, title, description }) => (
                <label key={value} className="flex items-start gap-3 rounded-lg border border-[#91a4bd] p-3 text-sm has-checked:border-[#12617e] has-checked:bg-[#eef4fa]">
                  <input type="radio" name="outcome" value={value} checked={selectedOutcome === value}
                    onChange={() => setSelectedOutcome(value)} className={`mt-0.5 size-4 shrink-0 accent-[#12617e] ${focus}`} />
                  <span><span className="block font-semibold">{title}</span><span className="text-xs leading-relaxed text-[#465a74]">{description}</span></span>
                </label>
              ))}
            </fieldset>

            {activeTask.type === "job_application" && (
              <div>
                <label htmlFor="partner-outcome-notes" className="text-sm font-semibold">Private notes <span className="font-normal text-[#465a74]">(optional)</span></label>
                <textarea id="partner-outcome-notes" rows={3} value={outcomeNotes} disabled={submittingOutcome}
                  onChange={(event) => setOutcomeNotes(event.target.value)}
                  className={`mt-1.5 block w-full rounded-lg border border-[#91a4bd] px-3 py-2 text-base ${focus}`} />
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#dce5ef] pt-4">
              <button type="button" disabled={submittingOutcome} className={secondary} onClick={closeOutcome}>Cancel</button>
              <button type="submit" disabled={submittingOutcome || !selectedOutcome} className={primary}>
                {submittingOutcome ? "Saving…" : selectedOutcome === "offer_extended" ? "Confirm and extend offer" : "Save outcome"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
