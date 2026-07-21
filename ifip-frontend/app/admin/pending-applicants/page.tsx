"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineCreditCard,
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePaperClip,
  HiOutlineShare,
  HiOutlineBuildingLibrary,
  HiOutlineMapPin,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlinePaperAirplane,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa";
import {
  getPendingApplicants,
  sendPendingApplicantReminder,
  PendingApplicant,
  PendingApplicantsSummary,
  GetPendingApplicantsParams,
} from "@/lib/api/services";

const STEP_LABELS: Record<number, string> = {
  1: "Email Verified",
  2: "Personal Profile",
  3: "Academic Background",
  4: "Program Interest",
  5: "Skills & Experience",
  6: "Motivation & Goals",
  7: "Levy & Review",
};

export default function PendingApplicantsPage() {
  const [applicants, setApplicants] = useState<PendingApplicant[]>([]);
  const [summary, setSummary] = useState<PendingApplicantsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [step, setStep] = useState<string>("");
  const [hasPaymentAttempt, setHasPaymentAttempt] = useState<"all" | "true" | "false">("all");
  const [expiringSoon, setExpiringSoon] = useState(false);

  // Drawer & Modal State
  const [selectedApplicant, setSelectedApplicant] = useState<PendingApplicant | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "payments">("details");

  // Email Modal State
  const [emailModalApplicant, setEmailModalApplicant] = useState<PendingApplicant | null>(null);
  const [emailTemplateKey, setEmailTemplateKey] = useState<string>("expiration_reminder");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeResumeLink, setIncludeResumeLink] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchApplicants = async (overrideParams: Partial<GetPendingApplicantsParams> = {}) => {
    setLoading(true);
    try {
      const params: GetPendingApplicantsParams = {
        page,
        limit: 25,
        search: search.trim() || undefined,
        country: country || undefined,
        step: step ? parseInt(step, 10) : undefined,
        hasPaymentAttempt: hasPaymentAttempt !== "all" ? hasPaymentAttempt : undefined,
        expiringSoon: expiringSoon ? "true" : undefined,
        ...overrideParams,
      };

      const data = await getPendingApplicants(params);
      setApplicants(data.applicants);
      setSummary(data.summary);
      setTotal(data.total);
      setPages(data.pages);

      if (selectedApplicant) {
        const updated = data.applicants.find((a) => a._id === selectedApplicant._id);
        if (updated) setSelectedApplicant(updated);
      }
    } catch (err: any) {
      console.error("Failed to load pending applicants:", err);
      showToast("Failed to fetch pending applicants.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchApplicants();
    });
  }, [page, country, step, hasPaymentAttempt, expiringSoon]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplicants({ page: 1 });
  };

  const handleClearFilters = () => {
    setSearch("");
    setCountry("");
    setStep("");
    setHasPaymentAttempt("all");
    setExpiringSoon(false);
    setPage(1);
    fetchApplicants({
      search: undefined,
      country: undefined,
      step: undefined,
      hasPaymentAttempt: undefined,
      expiringSoon: undefined,
      page: 1,
    });
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to load templates into Email Modal
  const loadEmailTemplate = (key: string, applicant: PendingApplicant) => {
    setEmailTemplateKey(key);
    const firstName = applicant.fullName ? applicant.fullName.trim().split(" ")[0] : "Applicant";
    const daysText = applicant.daysLeft > 0 ? `${applicant.daysLeft} days` : `${applicant.hoursLeft} hours`;
    const stageName = STEP_LABELS[applicant.currentStep] || "Registration";

    if (key === "expiration_reminder") {
      setEmailSubject(`Reminder: Complete Your IFIP Application (${daysText} remaining)`);
      setEmailBody(
        `Hello ${firstName},\n\nWe noticed you started your application for the Islamic Finance Internship Program (IFIP) and reached Step ${applicant.currentStep} (${stageName}).\n\nYour saved registration draft will expire in ${daysText}. After this period, unsubmitted details are automatically purged for data security.\n\nIf you plan to complete your application, please resume your registration before the deadline.`
      );
      setIncludeResumeLink(true);
    } else if (key === "assistance_inquiry") {
      setEmailSubject(`IFIP Admissions: Do you need assistance completing your application?`);
      setEmailBody(
        `Hello ${firstName},\n\nThank you for your interest in the Islamic Finance Internship Program (IFIP).\n\nWe noticed that you paused your application at Step ${applicant.currentStep} (${stageName}). We wanted to check in and see if you encountered any technical difficulties or have questions regarding the program tracks or application process.\n\nPlease reply directly to this email if you need any support from our admissions team.`
      );
      setIncludeResumeLink(true);
    } else if (key === "payment_assistance") {
      setEmailSubject(`IFIP Admissions: Commitment Levy Payment Support`);
      setEmailBody(
        `Hello ${firstName},\n\nWe noticed you completed your profile and reached Step 7 (Levy Payment & Final Review) for the Islamic Finance Internship Program (IFIP).\n\nIf you are experiencing any issues with your payment transaction or have questions regarding accepted payment options, please let us know so we can assist you.`
      );
      setIncludeResumeLink(true);
    } else if (key === "custom") {
      setEmailSubject(`Update regarding your IFIP Application`);
      setEmailBody(`Hello ${firstName},\n\n`);
      setIncludeResumeLink(true);
    }
  };

  const openEmailModal = (applicant: PendingApplicant) => {
    setEmailModalApplicant(applicant);
    loadEmailTemplate("expiration_reminder", applicant);
  };

  const handleSendCustomEmail = async () => {
    if (!emailModalApplicant || sendingEmail) return;
    if (!emailSubject.trim()) {
      showToast("Please enter an email subject line.", "error");
      return;
    }
    if (!emailBody.trim()) {
      showToast("Please enter an email message body.", "error");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await sendPendingApplicantReminder(emailModalApplicant._id, {
        subject: emailSubject,
        message: emailBody,
        includeResumeLink,
      });
      showToast(res.message || `Email sent successfully to ${emailModalApplicant.email}`, "success");
      setEmailModalApplicant(null);
    } catch (err: any) {
      console.error("Send custom email error:", err);
      showToast(err.response?.data?.message || "Failed to send email.", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const formatWhatsAppUrl = (applicant: PendingApplicant) => {
    const rawPhone = applicant.phone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const firstName = applicant.fullName ? applicant.fullName.split(" ")[0] : "there";
    const daysText = applicant.daysLeft > 0 ? `${applicant.daysLeft} days` : `${applicant.hoursLeft} hours`;
    const message = `Hi ${firstName}, this is IFIP Admissions following up on your application. We noticed you reached Step ${applicant.currentStep} (${STEP_LABELS[applicant.currentStep] || "Registration"}). Your application link expires in ${daysText}. Let us know if you need any assistance!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getExpiryBadge = (applicant: PendingApplicant) => {
    if (applicant.hoursLeft <= 24) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {applicant.hoursLeft <= 0 ? "Expiring Soon!" : `${applicant.hoursLeft}h left`}
        </span>
      );
    }
    if (applicant.daysLeft <= 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {applicant.daysLeft}d {applicant.hoursLeft % 24}h left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {applicant.daysLeft}d left
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-red-900 text-white border-red-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <HiOutlineXCircle className="w-5 h-5 text-red-400" />
          )}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 p-5 sm:p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold tracking-wide uppercase">
            <HiOutlineSparkles className="w-3.5 h-3.5 text-sky-400" /> Admissions Outreach & Pipeline
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif tracking-tight">Pending Applicants Tracker</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Monitor non-paid applicants who have not completed checkout. Inspect full form responses, review payment attempt logs, and compose custom message templates or reminders to contact candidates.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => fetchApplicants()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition backdrop-blur-sm border border-white/10"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg sm:text-xl shrink-0">
            <HiOutlineUser className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pending</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{summary?.totalPending ?? total}</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Unpaid applicant records</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg sm:text-xl shrink-0">
            <HiOutlineCreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attempted Payment</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-0.5">{summary?.attemptedPaymentCount ?? 0}</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{summary?.noAttemptCount ?? 0} never attempted</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold text-lg sm:text-xl shrink-0">
            <HiOutlineExclamationTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiring &lt; 24h</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600 mt-0.5">{summary?.expiringSoonCount ?? 0}</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">High urgency follow-up</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg sm:text-xl shrink-0">
            <HiOutlineMapPin className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Countries Represented</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{summary?.distinctCountries?.length ?? 0}</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Global applicant pool</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 transition"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
          >
            <HiOutlineMagnifyingGlass className="w-4 h-4" /> Search
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium mr-1 text-xs">
              <HiOutlineFunnel className="w-3.5 h-3.5 text-slate-400" /> Filter:
            </div>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Countries ({summary?.distinctCountries?.length || 0})</option>
              {summary?.distinctCountries?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={step}
              onChange={(e) => setStep(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Form Steps (1-7)</option>
              {Object.entries(STEP_LABELS).map(([num, label]) => {
                const stepCount = summary?.stepBreakdown?.[parseInt(num)] || 0;
                return (
                  <option key={num} value={num}>
                    Step {num}: {label} ({stepCount})
                  </option>
                );
              })}
            </select>

            <select
              value={hasPaymentAttempt}
              onChange={(e) => setHasPaymentAttempt(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Payment Attempts</option>
              <option value="true">Attempted Payment (Checkout Initiated)</option>
              <option value="false">Never Attempted Payment</option>
            </select>

            <button
              type="button"
              onClick={() => setExpiringSoon(!expiringSoon)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                expiringSoon
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <HiOutlineClock className="w-4 h-4" /> Expiring &lt;24h Only
            </button>
          </div>

          {(search || country || step || hasPaymentAttempt !== "all" || expiringSoon) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1 self-end sm:self-auto"
            >
              <HiOutlineXMark className="w-4 h-4" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Applicants Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <HiOutlineArrowPath className="w-8 h-8 animate-spin mx-auto text-sky-600" />
            <p className="text-sm font-medium">Loading pending applicants data...</p>
          </div>
        ) : applicants.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <HiOutlineUser className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">No pending applicants found</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                No unpaid applicant records match your current filter parameters or search criteria.
              </p>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] font-bold tracking-wider uppercase">
                    <th className="py-3.5 px-4 pl-6">Applicant Name & Email</th>
                    <th className="py-3.5 px-4">Country & Phone</th>
                    <th className="py-3.5 px-4">Form Stage Completed</th>
                    <th className="py-3.5 px-4">Time Left (TTL)</th>
                    <th className="py-3.5 px-4">Payment Attempts</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Direct Outreach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {applicants.map((applicant) => (
                    <tr
                      key={applicant._id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => {
                        setSelectedApplicant(applicant);
                        setActiveTab("details");
                      }}
                    >
                      <td className="py-4 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {(applicant.fullName || applicant.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {applicant.fullName || "Name Not Set"}
                              {applicant.emailVerified && (
                                <HiOutlineCheckCircle
                                  className="w-4 h-4 text-emerald-500 shrink-0"
                                  title="Email Verified"
                                />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{applicant.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-800">{applicant.country || "Unspecified"}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {applicant.phone || "No phone entered"}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              Step {applicant.currentStep}/7
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              {STEP_LABELS[applicant.currentStep] || "Registration"}
                            </span>
                          </div>
                          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full transition-all"
                              style={{ width: `${(applicant.currentStep / 7) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">{getExpiryBadge(applicant)}</td>

                      <td className="py-4 px-4">
                        {applicant.paymentAttemptsCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <HiOutlineCreditCard className="w-3.5 h-3.5 text-amber-600" />
                            {applicant.paymentAttemptsCount} Attempt
                            {applicant.paymentAttemptsCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            No attempts
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {applicant.phone && (
                            <a
                              href={`tel:${applicant.phone}`}
                              title="Call Phone Number"
                              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <HiOutlinePhone className="w-4.5 h-4.5" />
                            </a>
                          )}
                          {applicant.phone && (
                            <a
                              href={formatWhatsAppUrl(applicant)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open WhatsApp Reminder"
                              className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <FaWhatsapp className="w-4.5 h-4.5 text-emerald-600" />
                            </a>
                          )}
                          <button
                            onClick={() => openEmailModal(applicant)}
                            title="Compose Custom Email / Select Template"
                            className="p-2 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                          >
                            <HiOutlineEnvelope className="w-4.5 h-4.5 text-sky-700" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplicant(applicant);
                              setActiveTab("details");
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition ml-1"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE STACKED CARDS VIEW (shown on screens < 768px) */}
            <div className="block md:hidden p-3.5 bg-slate-100/70 space-y-3.5">
              {applicants.map((applicant) => (
                <div
                  key={applicant._id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all space-y-3 relative overflow-hidden"
                  onClick={() => {
                    setSelectedApplicant(applicant);
                    setActiveTab("details");
                  }}
                >
                  {/* Top Color Accent Strip Demarcating Card Boundary */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400 opacity-90" />

                  {/* Top Row: Avatar, Name (with truncation & checkmark) & Expiry Badge */}
                  <div className="flex items-start justify-between gap-3 pt-0.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {(applicant.fullName || applicant.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 leading-snug">
                          <span className="truncate">{applicant.fullName || "Name Not Set"}</span>
                          {applicant.emailVerified && (
                            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" title="Email Verified" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                          {applicant.email}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">{getExpiryBadge(applicant)}</div>
                  </div>

                  {/* Middle Row: Country/Phone & Status Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{applicant.country || "Unspecified"}</span>
                      {applicant.phone && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({applicant.phone})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                        Step {applicant.currentStep}/7
                      </span>

                      {applicant.paymentAttemptsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <HiOutlineCreditCard className="w-3 h-3 text-amber-600" />
                          {applicant.paymentAttemptsCount} Attempt{applicant.paymentAttemptsCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                          No attempts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Outreach Toolbar & Inspect Profile */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {applicant.phone && (
                        <a
                          href={`tel:${applicant.phone}`}
                          title="Call Phone Number"
                          className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200/80 transition"
                        >
                          <HiOutlinePhone className="w-4 h-4" />
                        </a>
                      )}
                      {applicant.phone && (
                        <a
                          href={formatWhatsAppUrl(applicant)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Reminder"
                          className="p-2 text-slate-600 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200/80 transition"
                        >
                          <FaWhatsapp className="w-4 h-4 text-emerald-600" />
                        </a>
                      )}
                      <button
                        onClick={() => openEmailModal(applicant)}
                        title="Compose Email"
                        className="p-2 text-slate-600 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-200/80 transition"
                      >
                        <HiOutlineEnvelope className="w-4 h-4 text-sky-700" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedApplicant(applicant);
                        setActiveTab("details");
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-sky-900 text-white rounded-xl shadow-xs transition"
                    >
                      Inspect Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {pages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div>
              Showing Page {page} of {pages} ({total} total applicants)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOM EMAIL COMPOSER MODAL */}
      {emailModalApplicant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                  <HiOutlineEnvelope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Compose Email to Candidate</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-[320px]">
                    To: {emailModalApplicant.fullName || "Applicant"} &lt;{emailModalApplicant.email}&gt;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalApplicant(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 text-xs">
              {/* Template Selector Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Select Email Template / Purpose
                </label>
                <select
                  value={emailTemplateKey}
                  onChange={(e) => loadEmailTemplate(e.target.value, emailModalApplicant)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                >
                  <option value="expiration_reminder">⏰ 1. Expiration Notice & Registration Reminder</option>
                  <option value="assistance_inquiry">❓ 2. Registration Assistance / Issue Check-in</option>
                  <option value="payment_assistance">💳 3. Commitment Levy Payment Support</option>
                  <option value="custom">✏️ 4. Custom Message (Blank Canvas)</option>
                </select>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                />
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Email Message Body
                </label>
                <textarea
                  rows={7}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your message content here..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs leading-relaxed"
                />
              </div>

              {/* Toggle to include Resume Button */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="includeResumeLink"
                  checked={includeResumeLink}
                  onChange={(e) => setIncludeResumeLink(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <label htmlFor="includeResumeLink" className="font-semibold text-slate-700 cursor-pointer text-xs">
                  Include direct &quot;Resume Application Now&quot; action button link
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setEmailModalApplicant(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomEmail}
                disabled={sendingEmail}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition shadow-sm flex items-center gap-2 text-xs"
              >
                {sendingEmail ? (
                  <>
                    <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> Sending Email...
                  </>
                ) : (
                  <>
                    <HiOutlinePaperAirplane className="w-4 h-4" /> Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLICANT FULL DETAILS SLIDE-OVER DRAWER */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase">
                    Step {selectedApplicant.currentStep}/7 Completed
                  </span>
                  {getExpiryBadge(selectedApplicant)}
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-serif">{selectedApplicant.fullName || "Unnamed Applicant"}</h2>
                <p className="text-xs text-slate-400 font-mono truncate max-w-[280px] sm:max-w-none">{selectedApplicant.email}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <HiOutlineXMark className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Action Bar inside Drawer */}
            <div className="bg-slate-50 p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Outreach Tools:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedApplicant.phone && (
                  <a
                    href={`tel:${selectedApplicant.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                  >
                    <HiOutlinePhone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {selectedApplicant.phone && (
                  <a
                    href={formatWhatsAppUrl(selectedApplicant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    <FaWhatsapp className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                <button
                  onClick={() => openEmailModal(selectedApplicant)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                >
                  <HiOutlineEnvelope className="w-3.5 h-3.5" /> Compose Email
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-white text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-3 border-b-2 text-center transition ${
                  activeTab === "details"
                    ? "border-sky-600 text-sky-600 font-bold"
                    : "border-transparent hover:text-slate-900"
                }`}
              >
                Form Responses (Steps 1–7)
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex-1 py-3 border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                  activeTab === "payments"
                    ? "border-sky-600 text-sky-600 font-bold"
                    : "border-transparent hover:text-slate-900"
                }`}
              >
                Payment Attempts ({selectedApplicant.paymentAttemptsCount})
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
              {activeTab === "details" ? (
                <div className="space-y-5 sm:space-y-6">
                  {/* Step 1 & 2: Personal Profile */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <HiOutlineUser className="w-4 h-4" /> 1. Personal & Contact Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                      <div>
                        <div className="text-slate-500 font-medium">Full Name</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.fullName || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Phone Number</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.phone || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Country</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.country || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">State / City</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.stateCity || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Gender</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.gender || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Date of Birth</div>
                        <div className="text-slate-900 font-semibold mt-0.5">
                          {selectedApplicant.dob ? new Date(selectedApplicant.dob).toLocaleDateString() : "Not provided"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Academic Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <HiOutlineAcademicCap className="w-4 h-4" /> 2. Academic Background
                    </div>
                    {selectedApplicant.academicInfo ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                        <div>
                          <div className="text-slate-500 font-medium">Status</div>
                          <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.academicInfo.status || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium">Institution</div>
                          <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.academicInfo.institution || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium">Field of Study</div>
                          <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.academicInfo.fieldOfStudy || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium">Qualification</div>
                          <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.academicInfo.qualification || "N/A"}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No academic information recorded yet (Stopped before Step 3).</div>
                    )}
                  </div>

                  {/* Step 4: Program Tracks */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <HiOutlineBriefcase className="w-4 h-4" /> 3. Program Interest
                    </div>
                    {selectedApplicant.programInterest ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="text-slate-500 font-medium">Primary Track Preferences</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {selectedApplicant.programInterest.primary?.map((track) => (
                              <span key={track} className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-medium">
                                {track}
                              </span>
                            )) || "None selected"}
                          </div>
                        </div>
                        {selectedApplicant.programInterest.secondary && (
                          <div className="pt-2">
                            <div className="text-slate-500 font-medium">Secondary Track</div>
                            <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.programInterest.secondary}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No track selection recorded yet (Stopped before Step 4).</div>
                    )}
                  </div>

                  {/* Step 5: Skills & CV */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <HiOutlinePaperClip className="w-4 h-4" /> 4. Skills & CV Document
                    </div>
                    {selectedApplicant.skills || selectedApplicant.cvUrl ? (
                      <div className="space-y-3 text-xs">
                        {selectedApplicant.cvUrl && (
                          <div>
                            <div className="text-slate-500 font-medium">Uploaded Curriculum Vitae (CV)</div>
                            <a
                              href={selectedApplicant.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sky-700 font-bold hover:underline mt-1"
                            >
                              <HiOutlinePaperClip className="w-4 h-4" /> View / Download Uploaded CV
                            </a>
                          </div>
                        )}
                        {selectedApplicant.linkedinUrl && (
                          <div>
                            <div className="text-slate-500 font-medium">LinkedIn Profile</div>
                            <a
                              href={selectedApplicant.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-700 font-medium hover:underline mt-0.5 block truncate"
                            >
                              {selectedApplicant.linkedinUrl}
                            </a>
                          </div>
                        )}
                        {selectedApplicant.skills?.relevantSkills?.length ? (
                          <div>
                            <div className="text-slate-500 font-medium">Skills List</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedApplicant.skills.relevantSkills.map((sk) => (
                                <span key={sk} className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No skills or CV uploaded yet (Stopped before Step 5).</div>
                    )}
                  </div>

                  {/* Step 6: Motivation & Lead Source */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <HiOutlineSparkles className="w-4 h-4" /> 5. Motivation & Channel
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                      <div>
                        <div className="text-slate-500 font-medium">Acquisition Channel (Lead Source)</div>
                        <div className="text-slate-900 font-semibold mt-0.5">{selectedApplicant.leadSource || "Unspecified"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">Levy Terms Acknowledged</div>
                        <div className="text-slate-900 font-semibold mt-0.5">
                          {selectedApplicant.levyAcknowledged ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                    {selectedApplicant.motivation?.whyApplying && (
                      <div className="text-xs pt-2">
                        <div className="text-slate-500 font-medium">Why Applying</div>
                        <div className="text-slate-800 mt-1 p-2 bg-white rounded border border-slate-200 leading-relaxed">
                          {selectedApplicant.motivation.whyApplying}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Tab 2: Payment Attempts History */
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-slate-500">
                    Payment Gateway Attempts recorded for this candidate:
                  </div>

                  {selectedApplicant.paymentAttempts && selectedApplicant.paymentAttempts.length > 0 ? (
                    <div className="space-y-3">
                      {selectedApplicant.paymentAttempts.map((payment, idx) => (
                        <div
                          key={payment._id || idx}
                          className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-slate-700">
                              {payment.provider} Payment
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                payment.status === "success"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : payment.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {payment.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <span className="font-medium text-slate-400">Reference:</span>{" "}
                              <span className="font-mono text-slate-800 font-medium truncate block sm:inline">{payment.providerRef}</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">Amount:</span>{" "}
                              <span className="font-semibold text-slate-900">
                                {payment.currency} {(payment.amount / 100).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">Date:</span>{" "}
                              <span>{new Date(payment.createdAt).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">Webhook Verified:</span>{" "}
                              <span>{payment.webhookVerified ? "Yes" : "No"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                      No payment checkout attempts have been recorded for this candidate yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
