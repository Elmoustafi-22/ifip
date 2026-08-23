"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  HiOutlineArrowsRightLeft,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineCheckCircle,
  HiOutlineCheck,
  HiOutlineBuildingOffice2,
  HiOutlineXMark,
  HiOutlinePencilSquare,
} from "react-icons/hi2";
import {
  getMyPlacements,
  logInterview,
  logOutcome,
  savePlacementNotes,
  PartnerPlacementItem,
} from "@/lib/api/partner";

export default function MyPlacementsPage() {
  const [placements, setPlacements] = useState<PartnerPlacementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [activeInterviewPlacement, setActiveInterviewPlacement] = useState<PartnerPlacementItem | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewFormat, setInterviewFormat] = useState<"Video" | "Call" | "In-person">("Video");
  const [submittingInterview, setSubmittingInterview] = useState(false);

  const [activeOutcomePlacement, setActiveOutcomePlacement] = useState<PartnerPlacementItem | null>(null);
  const [outcome, setOutcome] = useState<"offer_extended" | "not_selected">("offer_extended");
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  const [activeNotesPlacement, setActiveNotesPlacement] = useState<PartnerPlacementItem | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchPlacements = async () => {
    try {
      const res = await getMyPlacements();
      setPlacements(res.placements || []);
    } catch (err) {
      console.error("Failed to load placements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, []);

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterviewPlacement) return;
    setSubmittingInterview(true);
    try {
      await logInterview(activeInterviewPlacement._id, interviewDate, interviewFormat);
      setActiveInterviewPlacement(null);
      await fetchPlacements();
    } catch (err) {
      console.error("Failed to log interview:", err);
    } finally {
      setSubmittingInterview(false);
    }
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOutcomePlacement) return;
    setSubmittingOutcome(true);
    try {
      await logOutcome(activeOutcomePlacement._id, outcome);
      setActiveOutcomePlacement(null);
      await fetchPlacements();
    } catch (err) {
      console.error("Failed to log outcome:", err);
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotesPlacement) return;
    setSavingNotes(true);
    try {
      await savePlacementNotes(activeNotesPlacement._id, notesText);
      setActiveNotesPlacement(null);
      await fetchPlacements();
    } catch (err) {
      console.error("Failed to save placement notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <HiOutlineArrowsRightLeft className="w-6 h-6 text-emerald-600" />
          <span>Confirmed Placements &amp; Interview Tracker</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage matched candidates, schedule interviews, and log offer outcomes. Contact details are unlocked for all approved placements.
        </p>
      </div>

      {/* Placements Roster */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : placements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <HiOutlineBuildingOffice2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Placements Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Once IFIP admissions approves your candidate interest requests, confirmed placements will appear here with unlocked contact details.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {placements.map((p) => {
            const statusStep = p.status === "placed" ? 3 : p.status === "interviewing" ? 2 : 1;

            return (
              <div
                key={p._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Candidate Header & Pipeline */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-4">
                    {p.intern?.avatarUrl ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0">
                        <Image src={p.intern.avatarUrl} alt={p.intern.fullName || ""} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-emerald-400 font-bold text-lg flex items-center justify-center border border-slate-700 shrink-0">
                        {p.intern?.fullName?.charAt(0) || "C"}
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{p.intern?.fullName || "Candidate"}</h2>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Matched on: {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Status Pipeline Progress Bar */}
                  <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold">
                      <span className={`px-2 py-0.5 rounded-md ${statusStep >= 1 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "text-slate-400"}`}>
                        1. Matched
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className={`px-2 py-0.5 rounded-md ${statusStep >= 2 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "text-slate-400"}`}>
                        2. Interviewing
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className={`px-2 py-0.5 rounded-md ${statusStep >= 3 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "text-slate-400"}`}>
                        3. Placed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details & Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Unlocked Contact Info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                      Unlocked Contact Details
                    </span>
                    {p.intern?.email && (
                      <div className="flex items-center space-x-2 text-emerald-800">
                        <HiOutlineEnvelope className="w-4 h-4 shrink-0 text-emerald-600" />
                        <a href={`mailto:${p.intern.email}`} className="hover:underline truncate font-bold">
                          {p.intern.email}
                        </a>
                      </div>
                    )}
                    {p.intern?.phone && (
                      <div className="flex items-center space-x-2 text-emerald-800">
                        <HiOutlinePhone className="w-4 h-4 shrink-0 text-emerald-600" />
                        <a href={`tel:${p.intern.phone}`} className="hover:underline font-bold">
                          {p.intern.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Interview Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                        Interview Schedule
                      </span>
                      {p.interviewScheduledAt ? (
                        <div className="space-y-1">
                          <p className="text-slate-800 font-bold flex items-center space-x-1.5">
                            <HiOutlineCalendar className="w-4 h-4 text-amber-600" />
                            <span>{new Date(p.interviewScheduledAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                          </p>
                          <p className="text-slate-500 text-[11px]">Format: <strong className="text-slate-800">{p.interviewFormat}</strong></p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No interview scheduled yet.</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActiveInterviewPlacement(p);
                        setInterviewDate(p.interviewScheduledAt ? new Date(p.interviewScheduledAt).toISOString().slice(0, 16) : "");
                        setInterviewFormat(p.interviewFormat || "Video");
                      }}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors w-fit cursor-pointer"
                    >
                      <HiOutlineCalendar className="w-3.5 h-3.5" />
                      <span>{p.interviewScheduledAt ? "Reschedule Interview" : "Log Interview Details"}</span>
                    </button>
                  </div>

                  {/* Outcome & Private Notes */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                        Outcome &amp; Internal Notes
                      </span>
                      {p.partnerOutcome ? (
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          p.partnerOutcome === "offer_extended"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-200 text-slate-700 border border-slate-300"
                        }`}>
                          <HiOutlineCheck className="w-3.5 h-3.5" />
                          <span>{p.partnerOutcome === "offer_extended" ? "Offer Extended" : "Not Selected"}</span>
                        </span>
                      ) : (
                        <p className="text-slate-400 italic">Outcome pending interview.</p>
                      )}

                      {p.partnerNotes && (
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 mt-2 line-clamp-2">
                          Note: {p.partnerNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2.5 mt-3 flex-wrap gap-y-2">
                      <button
                        onClick={() => {
                          setActiveOutcomePlacement(p);
                          setOutcome(p.partnerOutcome || "offer_extended");
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                        <span>Log Outcome</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveNotesPlacement(p);
                          setNotesText(p.partnerNotes || "");
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <HiOutlinePencilSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Private Notes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Interview Modal */}
      {activeInterviewPlacement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineCalendar className="w-5 h-5 text-emerald-600" />
                <span>Log Interview Details</span>
              </h2>
              <button onClick={() => setActiveInterviewPlacement(null)} className="text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Format</label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="Video">Video Call (Google Meet / Zoom / Teams)</option>
                  <option value="Call">Phone Call</option>
                  <option value="In-person">In-Person</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveInterviewPlacement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInterview}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingInterview ? "Saving..." : "Save Interview Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Outcome Modal */}
      {activeOutcomePlacement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Record Interview Outcome</span>
              </h2>
              <button onClick={() => setActiveOutcomePlacement(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Result / Decision</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500">
                    <input
                      type="radio"
                      name="outcome"
                      value="offer_extended"
                      checked={outcome === "offer_extended"}
                      onChange={() => setOutcome("offer_extended")}
                      className="text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-800 block">Offer Extended</span>
                      <span className="text-[11px] text-slate-500 block">Candidate selected for placement position.</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-rose-400">
                    <input
                      type="radio"
                      name="outcome"
                      value="not_selected"
                      checked={outcome === "not_selected"}
                      onChange={() => setOutcome("not_selected")}
                      className="text-rose-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Not Selected</span>
                      <span className="text-[11px] text-slate-500 block">Candidate will be returned to the active pool.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveOutcomePlacement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutcome}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingOutcome ? "Recording..." : "Record Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Private Notes Modal */}
      {activeNotesPlacement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlinePencilSquare className="w-5 h-5 text-emerald-600" />
                <span>Private Placement Notes</span>
              </h2>
              <button onClick={() => setActiveNotesPlacement(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Notes (Visible only to your organisation)
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter internal comments or interview feedback..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveNotesPlacement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
