"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearConfirmedCohortWaitlist,
  getCohortWaitlistStatus,
  resendCohortWaitlist,
  type CohortWaitlistStatus,
} from "@/lib/api/services";

const button = "min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-[#000666] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
const statusLabels = [
  ["pending", "Pending"],
  ["queued", "Queued"],
  ["sending", "Sending"],
  ["sent", "Sent"],
  ["failed", "Failed"],
] as const;

export default function CohortWaitlistControls({ cohortId, onCleared }: {
  cohortId: string;
  onCleared: () => void;
}) {
  const [counts, setCounts] = useState<CohortWaitlistStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [includeSent, setIncludeSent] = useState(false);
  const [action, setAction] = useState<"send" | "clear" | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(() => {
    const request = ++latestRequest.current;
    return getCohortWaitlistStatus(cohortId).then(
      data => {
        if (request !== latestRequest.current) return;
        setCounts(data);
        setStatusError(false);
      },
      () => {
        if (request === latestRequest.current) setStatusError(true);
      },
    );
  }, [cohortId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inProgress = Boolean(counts && counts.queued + counts.sending > 0);
  useEffect(() => {
    if (!inProgress || action) return;
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [inProgress, action, refresh]);

  async function run(nextAction: "send" | "clear") {
    if (action) return;
    setAction(nextAction);
    setNotice(null);
    try {
      if (nextAction === "send") {
        const { queued } = await resendCohortWaitlist(cohortId, includeSent);
        setIncludeSent(false);
        setNotice({ text: queued ? `Queued ${queued} ${queued === 1 ? "email" : "emails"}.` : "No new emails were queued." });
      } else {
        const { cleared } = await clearConfirmedCohortWaitlist(cohortId);
        setNotice({ text: `Cleared ${cleared} confirmed ${cleared === 1 ? "recipient" : "recipients"} from the waitlist.` });
        onCleared();
      }
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "The waitlist action failed. Try again.", error: true });
    } finally {
      await refresh();
      setAction(null);
    }
  }

  const canSend = counts && (counts.pending + counts.failed > 0 || (includeSent && counts.readyToClear > 0));

  return (
    <section aria-labelledby="cohort-waitlist-heading" className="space-y-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
      <h3 id="cohort-waitlist-heading" className="font-bold text-[#000666]">Waitlist notification</h3>
      <p>Recipients joined before the registration opening date. Emails use the saved cohort dates.</p>
      <div role="status" aria-atomic="true">
        {counts ? (
          <dl className="flex flex-wrap gap-x-4 gap-y-1">
            {statusLabels.map(([key, label]) => (
              <div key={key} className="flex gap-1"><dt>{label}</dt><dd className="font-semibold">{counts[key]}</dd></div>
            ))}
          </dl>
        ) : !statusError && <p>Loading delivery status…</p>}
      </div>
      {statusError && <p role="alert" className="text-red-700">Could not load delivery status. Refresh to try again.</p>}
      {counts && counts.readyToClear > 0 && (
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={includeSent} onChange={event => setIncludeSent(event.target.checked)} disabled={Boolean(action) || inProgress} />
          Include recipients whose email was already sent
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={Boolean(action) || statusError || !canSend} onClick={() => void run("send")}>
          {action === "send" ? "Queueing…" : "Send or resend email"}
        </button>
        <button type="button" className={button} disabled={Boolean(action)} onClick={() => void refresh()}>Refresh status</button>
      </div>
      <p>Sent means the email provider accepted the message. Clearing removes those recipients from the active waitlist. Failed emails stay on the list.</p>
      <button type="button" className={button} disabled={Boolean(action) || statusError || !counts?.readyToClear} onClick={() => void run("clear")}>
        {action === "clear" ? "Clearing…" : `Clear confirmed recipients${counts?.readyToClear ? ` (${counts.readyToClear})` : ""}`}
      </button>
      {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-red-700" : "text-emerald-700"}>{notice.text}</p>}
    </section>
  );
}
