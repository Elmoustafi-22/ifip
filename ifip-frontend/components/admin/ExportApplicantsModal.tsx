"use client";

import { useState, useEffect } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineXMark,
  HiOutlineFunnel,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup,
  HiOutlineCreditCard,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineGlobeAlt,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { Cohort, downloadApplicantsCSV, ExportApplicantsParams } from "@/lib/api/services";

interface ExportApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohorts?: Cohort[];
  initialParams?: Partial<ExportApplicantsParams>;
  title?: string;
}

const TRACK_OPTIONS = [
  "Software Engineering",
  "Product Design (UI/UX)",
  "Data Analysis & Science",
  "Product Management",
  "Cybersecurity & Cloud",
  "AI & Machine Learning",
  "DevOps & Infrastructure",
  "Digital Marketing & Growth",
];

const STEP_OPTIONS = [
  { num: 1, label: "Step 1: Email Verified" },
  { num: 2, label: "Step 2: Personal Information" },
  { num: 3, label: "Step 3: Academic Background" },
  { num: 4, label: "Step 4: Program Interest" },
  { num: 5, label: "Step 5: Skills & Availability" },
  { num: 6, label: "Step 6: Review & Checkout" },
];

export default function ExportApplicantsModal({
  isOpen,
  onClose,
  cohorts = [],
  initialParams = {},
  title = "Export Applicants Insights CSV",
}: ExportApplicantsModalProps) {
  const [type, setType] = useState<"all" | "paid" | "unpaid">(initialParams.type || "all");
  const [cohortId, setCohortId] = useState<string>(initialParams.cohortId || "");
  const [status, setStatus] = useState<string>(initialParams.status || "");
  const [step, setStep] = useState<string>(initialParams.step !== undefined ? String(initialParams.step) : "");
  const [hasPaymentAttempt, setHasPaymentAttempt] = useState<"true" | "false" | "all">(
    initialParams.hasPaymentAttempt || "all"
  );
  const [paymentStatus, setPaymentStatus] = useState<string>(initialParams.paymentStatus || "");
  const [programInterest, setProgramInterest] = useState<string>(initialParams.programInterest || "");
  const [country, setCountry] = useState<string>(initialParams.country || "");
  const [search, setSearch] = useState<string>(initialParams.search || "");
  const [startDate, setStartDate] = useState<string>(initialParams.startDate || "");
  const [endDate, setEndDate] = useState<string>(initialParams.endDate || "");
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setType(initialParams.type || "all");
      setCohortId(initialParams.cohortId || "");
      setStatus(initialParams.status || "");
      setStep(initialParams.step !== undefined ? String(initialParams.step) : "");
      setHasPaymentAttempt(initialParams.hasPaymentAttempt || "all");
      setPaymentStatus(initialParams.paymentStatus || "");
      setProgramInterest(initialParams.programInterest || "");
      setCountry(initialParams.country || "");
      setSearch(initialParams.search || "");
      setStartDate(initialParams.startDate || "");
      setEndDate(initialParams.endDate || "");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, initialParams]);

  if (!isOpen) return null;

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownloading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const params: ExportApplicantsParams = {
        type,
        cohortId: cohortId || undefined,
        status: status || undefined,
        step: step ? parseInt(step, 10) : undefined,
        hasPaymentAttempt: hasPaymentAttempt !== "all" ? hasPaymentAttempt : undefined,
        paymentStatus: paymentStatus || undefined,
        programInterest: programInterest || undefined,
        country: country.trim() || undefined,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      await downloadApplicantsCSV(params);
      setSuccessMsg("CSV exported and downloaded successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Export applicants CSV error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to generate CSV export.");
    } finally {
      setDownloading(false);
    }
  };

  const handleResetFilters = () => {
    setCohortId("");
    setStatus("");
    setStep("");
    setHasPaymentAttempt("all");
    setPaymentStatus("");
    setProgramInterest("");
    setCountry("");
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-6 text-white flex items-start justify-between relative shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-sky-400/20">
              <HiOutlineArrowDownTray className="w-3.5 h-3.5" /> CSV Data Export
            </div>
            <h2 className="text-xl font-bold font-serif tracking-tight text-white">{title}</h2>
            <p className="text-slate-300 text-xs mt-1">
              Select target applicant group and configure filters before downloading the spreadsheet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleDownload} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Group Selector (Cards) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              1. Choose Target Applicant Group
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option: All */}
              <button
                type="button"
                onClick={() => setType("all")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  type === "all"
                    ? "border-sky-600 bg-sky-50/50 text-slate-900 ring-2 ring-sky-500/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <HiOutlineUserGroup className="w-4 h-4" />
                  </span>
                  {type === "all" && <HiOutlineCheckCircle className="w-5 h-5 text-sky-600" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">All Applicants</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Paid + In-Funnel candidates</div>
                </div>
              </button>

              {/* Option: Paid Only */}
              <button
                type="button"
                onClick={() => setType("paid")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  type === "paid"
                    ? "border-emerald-600 bg-emerald-50/50 text-slate-900 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <HiOutlineCreditCard className="w-4 h-4" />
                  </span>
                  {type === "paid" && <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Paid Applicants</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Enrolled / Admitted participants</div>
                </div>
              </button>

              {/* Option: Unpaid Only */}
              <button
                type="button"
                onClick={() => setType("unpaid")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  type === "unpaid"
                    ? "border-amber-600 bg-amber-50/50 text-slate-900 ring-2 ring-amber-500/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <HiOutlineClock className="w-4 h-4" />
                  </span>
                  {type === "unpaid" && <HiOutlineCheckCircle className="w-5 h-5 text-amber-600" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Unpaid / Funnel</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">In-progress / Abandoned steps</div>
                </div>
              </button>
            </div>
          </div>

          {/* Filter Parameters Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <HiOutlineFunnel className="w-4 h-4 text-slate-400" /> 2. Refine Filter Criteria (Optional)
              </label>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Cohort Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Cohort</label>
                <select
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Global (All Cohorts)</option>
                  <option value="unassigned">Awaiting Cohort Assignment</option>
                  {cohorts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Track Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Program Track / Specialization</label>
                <select
                  value={programInterest}
                  onChange={(e) => setProgramInterest(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">All Tracks & Programs</option>
                  {TRACK_OPTIONS.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional: Funnel Step (if type is unpaid or all) */}
              {(type === "unpaid" || type === "all") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration Funnel Stage</label>
                  <select
                    value={step}
                    onChange={(e) => setStep(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">All Funnel Steps (1-6)</option>
                    {STEP_OPTIONS.map((s) => (
                      <option key={s.num} value={s.num}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional: Admission Status (if type is paid or all) */}
              {(type === "paid" || type === "all") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Admission Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="payment_confirmed">Paid, Awaiting Cohort Assignment</option>
                    <option value="active">Active Participant (In Training)</option>
                    <option value="completed">Curriculum Completed</option>
                    <option value="placement_ready">Placement Ready</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
              )}

              {/* Conditional: Payment Attempt Status (if type is unpaid or all) */}
              {(type === "unpaid" || type === "all") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Checkout Attempt Status</label>
                  <select
                    value={hasPaymentAttempt}
                    onChange={(e) => setHasPaymentAttempt(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">All Payment States</option>
                    <option value="true">Attempted Payment (Initiated Checkout)</option>
                    <option value="false">Never Attempted Payment</option>
                  </select>
                </div>
              )}

              {/* Country Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Nigeria, Ghana, United Kingdom"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Date Range: From */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Created / Submitted From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Date Range: To */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Created / Submitted To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Keyword / Search */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Term</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, email, or phone..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <HiOutlineCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <HiOutlineSparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Exports 35+ data points including identity, academics, tracks, and payment logs.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <HiOutlineArrowDownTray className="w-4 h-4" />
                  <span>Download Insights CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
