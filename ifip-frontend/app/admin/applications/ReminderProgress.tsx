import type { ReminderJobResult } from "@/lib/api/services";

export default function ReminderProgress({ job, error, onDismiss, onRetry, retrying, canDismissMissing }: {
  job: ReminderJobResult | null; error: string; onDismiss: () => void;
  onRetry?: () => void; retrying: boolean; canDismissMissing: boolean;
}) {
  const finished = job?.status === "completed" || job?.status === "interrupted";
  return <section aria-label="Reminder sending progress" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-900">
    <div role="status" aria-live="polite">
      <p className="font-semibold">{job?.status === "completed" ? "Reminder processing complete" : job?.status === "interrupted" ? "Reminder processing interrupted" : "Reminder sending progress"}</p>
      {job && <p>{job.results.length} of {job.total} processed · {job.message}</p>}
      {job?.status === "queued" && <p>Waiting to start. Sending continues in the background.</p>}
      {job?.status === "interrupted" && <p>Some outcomes could not be confirmed. Review reminder history before sending again.</p>}
      {!job && !error && <p>Checking the saved send request…</p>}
      {error && <p>{error}</p>}
    </div>
    {job?.results.some(item => item.status !== "accepted") && <details className="mt-2">
      <summary>View failed and skipped recipients</summary>
      <ul>{job.results.filter(item => item.status !== "accepted").map(item => <li key={item.applicantId}>Applicant {item.applicantId}: {item.reason}</li>)}</ul>
    </details>}
    {onRetry && <button type="button" disabled={retrying} className="mt-3 rounded-lg border border-slate-400 px-3 py-2" onClick={onRetry}>{retrying ? "Checking submission…" : "Retry original send request"}</button>}
    {canDismissMissing && <p>The saved request cannot be recovered here. Review applicant reminder history before starting another send.</p>}
    {(finished || canDismissMissing) && <button type="button" className="mt-3 rounded-lg border border-slate-400 px-3 py-2" onClick={onDismiss}>Refresh applicants and dismiss</button>}
  </section>;
}
