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
  HiOutlineVideoCamera,
  HiOutlineMapPin,
  HiOutlineLink,
  HiOutlineArrowTopRightOnSquare,
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
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
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
      await logInterview(
        activeInterviewPlacement._id,
        interviewDate,
        interviewFormat,
        interviewLink.trim() || undefined,
        interviewLocation.trim() || undefined
      );
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000666] tracking-tight">
            Confirmed Placements &amp; Interviews
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage matched candidates, schedule interviews, and log offer outcomes. Contact details are unlocked for all approved placements.
          </p>
        </div>
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
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-[#000666] font-bold text-lg flex items-center justify-center border border-slate-200 shrink-0">
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
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={statusStep >= 1 ? "text-emerald-700 font-semibold" : "text-slate-400 font-medium"}>
                        1. Matched
                      </span>
                      <span className="text-slate-300">&rarr;</span>
                      <span className={statusStep >= 2 ? "text-emerald-700 font-semibold" : "text-slate-400 font-medium"}>
                        2. Interviewing
                      </span>
                      <span className="text-slate-300">&rarr;</span>
                      <span className={statusStep >= 3 ? "text-emerald-700 font-semibold" : "text-slate-400 font-medium"}>
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
                      <div className="flex items-center space-x-2 text-slate-700">
                        <HiOutlineEnvelope className="w-4 h-4 shrink-0 text-slate-400" />
                        <a href={`mailto:${p.intern.email}`} className="text-[#000666] hover:underline truncate font-semibold">
                          {p.intern.email}
                        </a>
                      </div>
                    )}
                    {p.intern?.phone && (
                      <div className="flex items-center space-x-2 text-slate-700">
                        <HiOutlinePhone className="w-4 h-4 shrink-0 text-slate-400" />
                        <a href={`tel:${p.intern.phone}`} className="text-[#000666] hover:underline font-semibold">
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
                        <div className="space-y-1.5">
                          <p className="text-slate-800 font-bold flex items-center space-x-1.5 text-xs">
                            <HiOutlineCalendar className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{new Date(p.interviewScheduledAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                          </p>
                          <p className="text-slate-500 text-[11px]">Format: <strong className="text-slate-800">{p.interviewFormat}</strong></p>
                          
                          {p.interviewLink && (
                            <div className="pt-1">
                              <a
                                href={p.interviewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-[#000666] bg-blue-50/70 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors truncate max-w-full"
                              >
                                <HiOutlineVideoCamera className="w-3.5 h-3.5 shrink-0 text-[#000666]" />
                                <span className="truncate">Join / Open Meeting</span>
                                <HiOutlineArrowTopRightOnSquare className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          )}

                          {p.interviewLocation && (
                            <p className="text-[11px] text-slate-600 flex items-start space-x-1 pt-0.5">
                              <HiOutlineMapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                              <span className="line-clamp-2">{p.interviewLocation}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-xs">No interview scheduled yet.</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActiveInterviewPlacement(p);
                        setInterviewDate(p.interviewScheduledAt ? new Date(p.interviewScheduledAt).toISOString().slice(0, 16) : "");
                        setInterviewFormat(p.interviewFormat || "Video");
                        setInterviewLink(p.interviewLink || "");
                        setInterviewLocation(p.interviewLocation || "");
                      }}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-semibold text-xs shadow-xs transition-colors w-fit cursor-pointer"
                    >
                      <HiOutlineCalendar className="w-3.5 h-3.5" />
                      <span>{p.interviewScheduledAt ? "Reschedule / Edit Link" : "Log Interview Details"}</span>
                    </button>
                  </div>

                  {/* Outcome & Private Notes */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                        Outcome &amp; Internal Notes
                      </span>
                      {p.partnerOutcome ? (
                        <span className={`inline-flex items-center space-x-1.5 text-xs font-semibold ${
                          p.partnerOutcome === "offer_extended"
                            ? "text-emerald-700"
                            : "text-slate-600"
                        }`}>
                          <HiOutlineCheck className="w-3.5 h-3.5" />
                          <span>{p.partnerOutcome === "offer_extended" ? "Placement Confirmed" : "Not Selected"}</span>
                        </span>
                      ) : (
                        <p className="text-slate-400 italic text-xs">Outcome pending interview.</p>
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
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                        <span>Log Outcome</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveNotesPlacement(p);
                          setNotesText(p.partnerNotes || "");
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineCalendar className="w-5 h-5 text-[#000666]" />
                <span>Log Interview Details</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveInterviewPlacement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Format</label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
                >
                  <option value="Video">Video Call (Google Meet / Zoom / Teams)</option>
                  <option value="Call">Phone Call</option>
                  <option value="In-person">In-Person</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Link <span className="text-slate-400 font-normal">(e.g. Google Meet, Zoom, Teams)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineLink className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Participants will receive this link via email and can join directly from their dashboard.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Additional Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineMapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder={interviewFormat === "In-person" ? "e.g. Office Address, Floor number, Security check-in..." : "e.g. Passcode or dial-in number if applicable..."}
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666] resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveInterviewPlacement(null)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInterview}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {submittingInterview ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Interview Schedule"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Outcome Modal */}
      {activeOutcomePlacement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineCheckCircle className="w-5 h-5 text-[#000666]" />
                <span>Record Interview Outcome</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveOutcomePlacement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Result / Decision</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-[#000666]">
                    <input
                      type="radio"
                      name="outcome"
                      value="offer_extended"
                      checked={outcome === "offer_extended"}
                      onChange={() => setOutcome("offer_extended")}
                      className="text-[#000666] focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#000666] block">Placement Confirmed</span>
                      <span className="text-[11px] text-slate-500 block">Candidate selected and confirmed for placement with your organization.</span>
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

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveOutcomePlacement(null)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutcome}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {submittingOutcome ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    "Record Decision"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Private Notes Modal */}
      {activeNotesPlacement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlinePencilSquare className="w-5 h-5 text-[#000666]" />
                <span>Private Placement Notes</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveNotesPlacement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666] resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveNotesPlacement(null)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {savingNotes ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Notes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
