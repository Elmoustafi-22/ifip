"use client";

import { useEffect, useState } from "react";
import { getRegistrationNotice, removeRegistrationNotice, saveRegistrationNotice } from "@/lib/api/services";

const suggestedMessage = "Applications are temporarily paused due to high traffic.";

function nextLagosMidnight() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(tomorrow);
  return `${local}T00:00`;
}

export default function RegistrationNoticeForm() {
  const [message, setMessage] = useState(suggestedMessage);
  const [expiry, setExpiry] = useState(nextLagosMidnight);
  const [savedExpiry, setSavedExpiry] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getRegistrationNotice().then((notice) => {
      if (!notice) return;
      setMessage(notice.message);
      setExpiry(new Date(Date.parse(notice.expiresAt) + 60 * 60 * 1000).toISOString().slice(0, 16));
      setSavedExpiry(notice.expiresAt);
    }).catch(() => setFeedback("Unable to load the current notice. Try refreshing the page."));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFeedback("");
    try {
      const saved = await saveRegistrationNotice({ message: message.trim(), expiresAt: new Date(`${expiry}:00+01:00`).toISOString() });
      setSavedExpiry(saved.expiresAt);
      setFeedback("Registration notice saved. It will disappear automatically at the expiry time.");
    } catch { setFeedback("Unable to save the notice. Check the expiry time and try again."); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true); setFeedback("");
    try { await removeRegistrationNotice(); setSavedExpiry(""); setFeedback("Registration notice removed."); }
    catch { setFeedback("Unable to remove the notice. Try again."); }
    finally { setBusy(false); }
  };

  return <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="registration-notice-title">
    <h2 id="registration-notice-title" className="text-base font-bold text-[#000666]">Registration notice</h2>
    <p className="text-sm text-slate-600">Pause new applications and display a notice. The page adds the time remaining automatically. Existing applicants can still verify their email and continue. Times use Lagos time (WAT).</p>
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800" htmlFor="registration-notice-message">Message</label>
      <textarea id="registration-notice-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={280} required rows={3} className="w-full rounded-lg border border-slate-400 p-3 text-base" />
      <label className="block text-sm font-semibold text-slate-800" htmlFor="registration-notice-expiry">End time (Lagos)</label>
      <input id="registration-notice-expiry" type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} required className="w-full rounded-lg border border-slate-400 p-3 text-base" />
      <button disabled={busy} type="submit" className="rounded-lg bg-[#000666] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Publish notice"}</button>
    </form>
    {savedExpiry && <p className="text-sm text-slate-700">Visible until {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(savedExpiry))} WAT.</p>}
    {savedExpiry && <button disabled={busy} type="button" onClick={remove} className="text-sm font-semibold text-[#000666] underline disabled:opacity-50">Remove notice now</button>}
    {feedback && <p role="status" className="text-sm text-slate-800">{feedback}</p>}
  </section>;
}
