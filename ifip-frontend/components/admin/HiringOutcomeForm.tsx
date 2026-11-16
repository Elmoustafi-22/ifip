"use client";

import { useId, useState } from "react";
import { isAxiosError } from "axios";
import { hiringOutcomeLabels, recordHiringOutcome, type HiringOutcome } from "@/lib/api/services";

export default function HiringOutcomeForm({ kind, id, outcome, hireOnly = false, onSave }: {
  kind: "placements" | "job-applications";
  id: string;
  outcome?: HiringOutcome;
  hireOnly?: boolean;
  onSave: (outcome: HiringOutcome) => void;
}) {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<HiringOutcome["status"]>(outcome?.status ?? "selected");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (saving || !note.trim()) return;
    setSaving(true);
    setError("");
    try {
      onSave(await recordHiringOutcome(kind, id, {
        status: hireOnly ? "hire_confirmed" : status,
        note,
        previousRecordedAt: outcome?.recordedAt ?? null,
      }));
      setNote("");
      setEditing(false);
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message || "Could not save the outcome." : "Could not save the outcome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      <p role="status" className="font-semibold text-slate-700">{outcome && hiringOutcomeLabels[outcome.status]}</p>
      {editing ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          {hireOnly ? <p className="font-medium">Confirm hire</p> : <>
            <label htmlFor={`${fieldId}-status`} className="block font-medium">Hiring outcome</label>
            <select id={`${fieldId}-status`} className="mt-1 block w-full rounded border border-slate-300 p-2" value={status} disabled={saving}
              onChange={event => setStatus(event.target.value as HiringOutcome["status"])}>
              {Object.entries(hiringOutcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </>}
          {(hireOnly || status === "hire_confirmed") && <p>The company will see this hire confirmed in its dashboard.</p>}
          <label className="block font-medium">Confirmation note
            <textarea className="mt-1 block w-full rounded border border-slate-300 p-2" rows={2} value={note} maxLength={500}
              disabled={saving} onChange={event => setNote(event.target.value)} />
          </label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving || !note.trim()} onClick={save}
              className="rounded bg-[#000666] px-3 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save outcome"}</button>
            <button type="button" disabled={saving} onClick={() => setEditing(false)} className="px-2 py-2">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="font-semibold text-[#000666] underline" onClick={() => {
          setStatus(outcome?.status ?? "selected");
          setNote("");
          setError("");
          setEditing(true);
        }}>{hireOnly ? "Confirm hire" : outcome ? "Edit hiring outcome" : "Record hiring outcome"}</button>
      )}
    </div>
  );
}
