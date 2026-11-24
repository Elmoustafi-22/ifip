"use client";

import { useEffect, useRef, useState } from "react";
import { createReminderJob, getReminderJob, type ReminderJobResult } from "@/lib/api/services";
import { getAccessToken } from "@/lib/api/client";
import { jwtDecode } from "jwt-decode";

const storageKey = "ifip.reminder-job.v1";
type Payload = Parameters<typeof createReminderJob>[0];

export function useReminderJob() {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<ReminderJobResult | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<Payload | null>(null);
  const [hasPendingPayload, setHasPendingPayload] = useState(false);
  const key = useRef(storageKey);
  const [missing, setMissing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [canRetrySubmission, setCanRetrySubmission] = useState(false);
  useEffect(() => {
    try {
      key.current = `${storageKey}.${jwtDecode<{ sub: string }>(getAccessToken() || "").sub}`;
      const saved = JSON.parse(sessionStorage.getItem(key.current) || "null");
      if (saved?.jobId) {
        setJobId(saved.jobId);
        if (saved.payload && Date.now() - saved.savedAt < 60 * 60_000) {
          pending.current = saved.payload;
          setHasPendingPayload(true);
          setCanRetrySubmission(true);
        }
      }
    } catch { /* No session or no valid saved draft. */ }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await getReminderJob(jobId);
        if (stopped) return;
        setJob(result);
        setMissing(false);
        setError("");
        setCanRetrySubmission(false);
        pending.current = null;
        setHasPendingPayload(false);
        sessionStorage.setItem(key.current, JSON.stringify({ jobId }));
        if (result.status === "completed" || result.status === "interrupted") {
          pending.current = null;
          return;
        }
      } catch (failure) {
        if (stopped) return;
        const missing = failure instanceof Error && "status" in failure && failure.status === 404;
        setMissing(missing);
        setError(missing
          ? "No saved send request was found yet. Checking will continue. If submission failed, retry the same request in the composer. Records are kept for seven days."
          : "Unable to check sending progress. Checking will resume automatically. Avoid starting another send.");
      }
      if (!stopped) timer = setTimeout(() => void poll(), 3000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [jobId]);

  const start = async (input: Omit<Payload, "requestId">) => {
    const payload = pending.current ?? { ...input, requestId: crypto.randomUUID() };
    pending.current = payload;
    setHasPendingPayload(true);
    sessionStorage.setItem(key.current, JSON.stringify({ jobId: payload.requestId, payload, savedAt: Date.now() }));
    setJobId(payload.requestId);
    try {
      await createReminderJob(payload);
      setCanRetrySubmission(false);
      setError("");
    } catch (failure) {
      const rejected = failure instanceof Error && "status" in failure && [400, 401, 403].includes(Number(failure.status));
      if (rejected) {
        pending.current = null;
        setHasPendingPayload(false);
        setJobId("");
        sessionStorage.removeItem(key.current);
        throw failure;
      }
      setCanRetrySubmission(true);
      throw new Error("Unable to confirm submission. Progress is being checked. Retrying uses the same request and original message, so it will not create another job.");
    }
  };
  const dismiss = () => {
    sessionStorage.removeItem(key.current);
    pending.current = null;
    setHasPendingPayload(false);
    setJobId(""); setJob(null); setError(""); setCanRetrySubmission(false);
  };
  const retry = async () => {
    if (!pending.current || retrying) return;
    setRetrying(true);
    try { await start(pending.current); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to confirm submission."); }
    finally { setRetrying(false); }
  };
  return { jobId, job, error, start, dismiss, retry, retrying,
    canRetry: canRetrySubmission && !job, canDismissMissing: missing && !hasPendingPayload,
    blocked: !!jobId && (!canRetrySubmission || !!job) };
}
