"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PendingDialog from "./PendingDialog";
import ReminderProgress from "./ReminderProgress";
import { useReminderJob } from "./useReminderJob";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineCreditCard,
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePaperClip,
  HiOutlinePaperAirplane,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa";
import { useContext } from "react";
import { AdminCohortContext } from "../layout";
import ExportApplicantsModal from "@/components/admin/ExportApplicantsModal";
import { useLevyPricing } from "@/lib/hooks/useLevyPricing";
import {
  getPendingApplicants,
  uploadPendingApplicantCv,
  recordManualPayment,
  downloadApplicantsCSV,
  type PendingApplicantWork,
  PendingApplicant,
  PendingApplicantsSummary,
  GetPendingApplicantsParams,
} from "@/lib/api/services";

const STEP_LABELS: Record<number, string> = {
  1: "Email verification",
  2: "Personal Profile",
  3: "Academic Background",
  4: "Program Interest",
  5: "Skills and motivation",
  6: "Payment and declaration",
  7: "Payment and review (older applications)",
};

const WORK_OPTIONS: { value: PendingApplicantWork | ""; label: string }[] = [
  { value: "", label: "All pending" },
  { value: "ready_for_reminder", label: "Ready for reminder" },
  { value: "payment_review", label: "Bank transfer needs review" },
  { value: "incomplete", label: "Application incomplete" },
];

function pendingPayment(applicant: PendingApplicant) {
  return applicant.paymentAttempts.find(payment => payment.status === "pending" && payment.bankTransferReview)
    ?? applicant.paymentAttempts.find(payment => payment.status === "pending");
}

export default function PendingApplications() {
  const reminderJob = useReminderJob();
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const { pricing } = useLevyPricing();
  const [applicants, setApplicants] = useState<PendingApplicant[]>([]);
  const [summary, setSummary] = useState<PendingApplicantsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const latestRequest = useRef(0);
  const cohortScope = selectedCohortId === "unassigned" ? "Awaiting assignment" :
    cohorts.find(cohort => cohort._id === selectedCohortId)?.name ?? "All cohorts";

  // Filters State
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [work, setWork] = useState<PendingApplicantWork | "">("");
  const [country, setCountry] = useState("");
  const [step, setStep] = useState<string>("");
  const [hasPaymentAttempt, setHasPaymentAttempt] = useState<"all" | "true" | "false">("all");

  const [reminderStatus, setReminderStatus] = useState<"all" | "never" | "cooldown_active" | "eligible">("all");

  // Drawer & Modal State
  const [selectedApplicant, setSelectedApplicant] = useState<PendingApplicant | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "payments" | "reminders">("details");

  // Selection & Bulk Outreach State
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);

  // CV Upload State
  const [uploadingCv, setUploadingCv] = useState(false);
  const [notifyOnCvUpload, setNotifyOnCvUpload] = useState(true);

  // Email Modal State
  const [emailModalApplicant, setEmailModalApplicant] = useState<PendingApplicant | null>(null);
  const [emailTemplateKey, setEmailTemplateKey] = useState<string>("expiration_reminder");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includeResumeLink, setIncludeResumeLink] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [composeError, setComposeError] = useState("");

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Manual Payment Modal State
  const [manualPaymentModalOpen, setManualPaymentModalOpen] = useState(false);
  const [manualPaymentApplicant, setManualPaymentApplicant] = useState<PendingApplicant | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualCurrency, setManualCurrency] = useState<"NGN" | "USD">("NGN");
  const [manualMethod, setManualMethod] = useState("Bank Transfer");
  const [manualRef, setManualRef] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualReceiptFile, setManualReceiptFile] = useState<File | null>(null);
  const [manualReceiptPreview, setManualReceiptPreview] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const manualRequestId = useRef("");

  const openManualPaymentModal = (applicant: PendingApplicant) => {
    manualRequestId.current = crypto.randomUUID();
    setManualPaymentApplicant(applicant);
    const curr = applicant.country === "Nigeria" ? "NGN" : "USD";
    setManualCurrency(curr);
    setManualAmount(pricing ? String(pricing[curr] / 100) : "");
    setManualMethod("Bank Transfer");
    setManualRef("");
    setManualNotes("");
    setManualReceiptFile(null);
    setManualReceiptPreview(null);
    setManualError("");
    setManualPaymentModalOpen(true);
  };

  const handleReceiptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setManualError("File size exceeds 10MB limit.");
      return;
    }
    setManualReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setManualReceiptPreview(url);
    } else {
      setManualReceiptPreview(null);
    }
    setManualError("");
  };

  const handleSubmitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentApplicant || manualSubmitting) return;
    setManualSubmitting(true);
    setManualError("");

    try {
      const formData = new FormData();
      if (manualReceiptFile) {
        formData.append("receipt", manualReceiptFile);
      }
      formData.append("amount", manualAmount);
      formData.append("currency", manualCurrency);
      formData.append("paymentMethod", manualMethod);
      formData.append("reference", manualRef);
      formData.append("notes", manualNotes);
      formData.append("requestId", manualRequestId.current);
      formData.append("expectedCohortId", manualPaymentApplicant.manualPaymentCohortId ?? "unassigned");

      const res = await recordManualPayment(manualPaymentApplicant._id, formData);
      showToast(res.message || "Manual payment recorded successfully!", "success");

      setManualPaymentModalOpen(false);
      setApplicants((prev) => prev.filter((a) => a._id !== manualPaymentApplicant._id));
      if (selectedApplicant?._id === manualPaymentApplicant._id) {
        setSelectedApplicant(null);
      }
      fetchApplicants();
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Failed to record manual payment.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const filters: GetPendingApplicantsParams = {
    cohortId: selectedCohortId || undefined,
    search: appliedSearch || undefined,
    country: country || undefined,
    step: step ? Number(step) : undefined,
    hasPaymentAttempt: hasPaymentAttempt === "all" ? undefined : hasPaymentAttempt,
    reminderStatus: reminderStatus === "all" ? undefined : reminderStatus,
    work: work || undefined,
  };

  const fetchApplicants = async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const data = await getPendingApplicants({ ...filters, page, limit });
      if (request !== latestRequest.current) return;
      setLoadError(false);
      if (page > Math.max(1, data.pages)) {
        setPage(Math.max(1, data.pages));
        return;
      }
      setApplicants(data.applicants);
      setSelectedApplicantIds(ids => ids.filter(id => data.applicants.some(applicant => applicant._id === id)));
      setSummary(data.summary);
      setTotal(data.total);
      setPages(data.pages);

      setSelectedApplicant(current => data.applicants.find(a => a._id === current?._id) ?? current);
    } catch (err) {
      if (request !== latestRequest.current) return;
      console.error("Failed to load pending applicants:", err);
      setLoadError(true);
      setSelectedApplicantIds([]);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [page, limit, appliedSearch, country, step, hasPaymentAttempt, reminderStatus, work]);

  function changePage(nextPage = 1) {
    setSelectedApplicantIds([]);
    setPage(nextPage);
  }

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (query === appliedSearch && page === 1) {
      void fetchApplicants();
      return;
    }
    changePage();
    setAppliedSearch(query);
  };

  const handleClearFilters = () => {
    changePage();
    setSearch("");
    setAppliedSearch("");
    setCountry("");
    setStep("");
    setHasPaymentAttempt("all");
    setReminderStatus("all");
    setWork("");
  };

  async function exportCurrentResults() {
    setExporting(true);
    try {
      await downloadApplicantsCSV({ ...filters, type: "unpaid" });
    } catch {
      showToast("Could not export the current results. Try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  function loadEmailTemplate(key: string, applicant?: PendingApplicant) {
    setEmailTemplateKey(key);
    const name = applicant ? applicant.fullName?.trim().split(/\s+/)[0] || "Applicant" : "{{firstName}}";
    const greeting = `Hello ${name},\n\n`;
    setIncludeResumeLink(true);

    if (key === "assistance_inquiry") {
      setEmailSubject("Do you need help with your IFIP application?");
      setEmailBody(greeting + "Do you have any questions about your application? Reply to this email and our admissions team can help.");
    } else if (key === "payment_assistance") {
      setEmailSubject("IFIP commitment levy support");
      setEmailBody(greeting + "If you need help with the IFIP commitment levy or have a question about a previous payment, reply to this email so we can help.");
    } else if (key === "custom") {
      setEmailSubject("Update on your IFIP application");
      setEmailBody(greeting);
    } else {
      setEmailSubject("Resume your IFIP application");
      setEmailBody(greeting + "Your IFIP application is saved. Return to IFIP to review your progress and check current registration availability. Reply to this email if you need help.");
    }
  }

  // Selection Handlers
  const toggleSelectApplicant = (id: string) => {
    setSelectedApplicantIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected =
    applicants.length > 0 && applicants.every((a) => selectedApplicantIds.includes(a._id));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(applicants.map((a) => a._id));
      setSelectedApplicantIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = applicants.map((a) => a._id);
      setSelectedApplicantIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const selectThisPage = () => {
    const allIds = applicants.map((a) => a._id);
    setSelectedApplicantIds(allIds);
  };

  const selectEligibleOnly = () => {
    const eligibleIds = applicants
      .filter((a) => !a.cooldownActive)
      .map((a) => a._id);
    setSelectedApplicantIds(eligibleIds);
    if (eligibleIds.length === 0) {
      showToast("No eligible applicants found on this page (all are in 48h cooldown).", "error");
    } else {
      showToast(`Selected ${eligibleIds.length} eligible applicant(s) (skipped candidates in cooldown).`, "success");
    }
  };

  const getReminderBadge = (applicant: PendingApplicant) => {
    if (!applicant.reminderCount || applicant.reminderCount === 0) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
          title="Never sent a reminder email"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Never Reminded
        </span>
      );
    }

    if (applicant.cooldownActive) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
          title={`Reminded ${applicant.hoursSinceLastReminder !== null && applicant.hoursSinceLastReminder !== undefined ? `${applicant.hoursSinceLastReminder}h ago` : "recently"} (${applicant.reminderCount} total). Cooldown active.`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />
          Reminded {applicant.hoursSinceLastReminder && applicant.hoursSinceLastReminder > 0 ? `${applicant.hoursSinceLastReminder}h ago` : "recently"} ({applicant.reminderCount}x)
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 shrink-0"
        title={`Reminded ${applicant.daysSinceLastReminder ?? 0} days ago (${applicant.reminderCount} total). Eligible to resend.`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Eligible ({applicant.reminderCount}x, {applicant.daysSinceLastReminder !== null && applicant.daysSinceLastReminder !== undefined ? `${applicant.daysSinceLastReminder}d ago` : "prior"})
      </span>
    );
  };

  const clearSelection = () => {
    setSelectedApplicantIds([]);
  };

  const openEmailModal = (applicant: PendingApplicant) => {
    setComposeError("");
    setEmailModalApplicant(applicant);
    setIsBulkEmailModalOpen(false);
    loadEmailTemplate("expiration_reminder", applicant);
  };

  const openBulkEmailModal = () => {
    if (selectedApplicantIds.length === 0) {
      showToast("Please select at least one applicant.", "error");
      return;
    }
    setComposeError("");
    setEmailModalApplicant(null);
    setIsBulkEmailModalOpen(true);
    loadEmailTemplate("expiration_reminder");
  };

  const composerRecipientCount = (isBulkEmailModalOpen ? selectedApplicantIds.length : 1);

  const handleSendEmail = async () => {
    if (sendingEmail || composerRecipientCount === 0 || reminderJob.blocked) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      setComposeError("Enter an email subject and message.");
      return;
    }

    setComposeError("");
    setSendingEmail(true);
    try {
      await reminderJob.start({ cohortId: selectedCohortId || undefined, subject: emailSubject, message: emailBody, includeResumeLink,
        applicantIds: emailModalApplicant ? [emailModalApplicant._id] : selectedApplicantIds });
      setEmailModalApplicant(null);
      setIsBulkEmailModalOpen(false);
      setSelectedApplicantIds([]);
      showToast("Sending started. Follow progress on this page.");
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Could not send the email. Try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const formatWhatsAppUrl = (applicant: PendingApplicant) => {
    const rawPhone = applicant.phone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const firstName = applicant.fullName ? applicant.fullName.split(" ")[0] : "there";
    const message = `Hi ${firstName}, this is IFIP Admissions following up on your application. We noticed you reached Step ${applicant.currentStep} (${STEP_LABELS[applicant.currentStep] || "Registration"}). Cohort spots are filling up — let us know if you need any assistance completing your application!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Shows how many days since the applicant last had activity
  const getActivityBadge = (applicant: PendingApplicant) => {
    const days = applicant.daysSinceActivity ?? 0;
    if (days >= 14) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 motion-safe:animate-pulse" />
          Inactive {days}d
        </span>
      );
    }
    if (days >= 7) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {days}d inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active {days === 0 ? "today" : `${days}d ago`}
      </span>
    );
  };

  function renderApplicantActions(applicant: PendingApplicant) {
    const payment = pendingPayment(applicant);
    const style = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50";
    return (
      <div className="flex flex-wrap gap-2 md:justify-end">
        {payment ? (
          <Link className={style} href={`/admin/payments?payment=${payment._id}`}>
            {payment.bankTransferReview ? "Review bank transfer" : "Review pending payment"}
          </Link>
        ) : !applicant.cooldownActive && (
          <button type="button" className={style} onClick={() => openEmailModal(applicant)}>Send reminder</button>
        )}
        <button type="button" className={style} onClick={() => { setSelectedApplicant(applicant); setActiveTab("details"); }}>View application</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reminderJob.jobId && <ReminderProgress job={reminderJob.job} error={reminderJob.error} onRetry={reminderJob.canRetry ? () => void reminderJob.retry() : undefined} retrying={reminderJob.retrying} canDismissMissing={reminderJob.canDismissMissing} onDismiss={() => {
        reminderJob.dismiss(); void fetchApplicants();
      }} />}
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role={toastMessage.type === "error" ? "alert" : "status"}
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

      <div className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-sm text-slate-700"><strong>Pending applicants</strong> · {cohortScope}</p>
        <button type="button" disabled={loading || loadError || exporting || !total} onClick={() => void exportCurrentResults()}
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold disabled:opacity-50">
          {exporting ? "Exporting…" : "Export current results"}
        </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs cursor-pointer"
            title="Configure filters and download applicants insights in CSV format"
          >
            <HiOutlineArrowDownTray className="w-4 h-4 text-slate-500" /> Custom export
          </button>
          <button
            onClick={() => fetchApplicants()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <HiOutlineArrowPath className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
      </div>

      {summary && !loadError && (
        <dl aria-label="Cohort totals" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-2"><dt>Pending</dt><dd className="font-bold tabular-nums">{summary.totalPending}</dd></div>
          <div className="flex gap-2"><dt>Never reminded</dt><dd className="font-bold tabular-nums">{summary.neverRemindedCount ?? 0}</dd></div>
          <div className="flex gap-2"><dt>Attempted payment</dt><dd className="font-bold tabular-nums">{summary.attemptedPaymentCount}</dd></div>
        </dl>
      )}
      <div role="group" aria-label="Work queues" className="flex flex-wrap gap-2">
        {WORK_OPTIONS.map(option => (
          <button key={option.value} type="button" aria-pressed={work === option.value}
            onClick={() => { changePage(); setWork(option.value); }}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold aria-pressed:bg-primary aria-pressed:text-white">
            {option.label}
          </button>
        ))}
      </div>
      {!loadError && !loading && (
        <p role="status" className="text-sm text-slate-600">
          {total} matching {total === 1 ? "applicant" : "applicants"}
          {appliedSearch && ` for “${appliedSearch}”`}{country && ` · ${country}`}{step && ` · Step ${step}`}
          {reminderStatus !== "all" && ` · ${{ never: "Never reminded", eligible: "Eligible for reminder", cooldown_active: "In cooldown" }[reminderStatus]}`}
          {hasPaymentAttempt !== "all" && ` · ${hasPaymentAttempt === "true" ? "Attempted payment" : "No payment attempt"}`}
        </p>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search by name, email or phone" placeholder="Name, email or phone"
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
              aria-label="Reminder status" value={reminderStatus}
              onChange={(e) => { changePage(); setReminderStatus(e.target.value as typeof reminderStatus); }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Reminder Statuses</option>
              <option value="never">🟢 Never Reminded ({summary?.neverRemindedCount ?? 0})</option>
              <option value="cooldown_active">🟡 Cooldown Active (&lt; 48h) ({summary?.recentlyRemindedCount ?? 0})</option>
              <option value="eligible">🔵 Eligible for Reminder ({summary?.eligibleRemindedCount ?? 0})</option>
            </select>

            <select
              aria-label="Country" value={country}
              onChange={(e) => { changePage(); setCountry(e.target.value); }}
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
              aria-label="Current form step" value={step}
              onChange={(e) => { changePage(); setStep(e.target.value); }}
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
              aria-label="Payment attempts" value={hasPaymentAttempt}
              onChange={(e) => { changePage(); setHasPaymentAttempt(e.target.value as typeof hasPaymentAttempt); }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Payment Attempts</option>
              <option value="true">Attempted Payment (Checkout Initiated)</option>
              <option value="false">Never Attempted Payment</option>
            </select>

            <select
              aria-label="Applicants per page" value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                changePage();
              }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-sky-800 bg-sky-50/60 border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              title="Select number of records to fetch per page"
            >
              <option value={25}>Show 25 / page</option>
              <option value={50}>Show 50 / page</option>
              <option value={100}>Show 100 / page</option>
              <option value={250}>Show 250 / page</option>
              <option value={500}>Show 500 / page</option>
              <option value={1000}>Show All (1000 max)</option>
            </select>


          </div>

          {(search || work || country || step || hasPaymentAttempt !== "all" || reminderStatus !== "all") && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1 self-end sm:self-auto"
            >
              <HiOutlineXMark className="w-4 h-4" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* SELECTION BATCH ACTION TOOLBAR */}
      {selectedApplicantIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 rounded-2xl shadow-xl border border-sky-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 motion-safe:animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-sm border border-sky-400/30 shrink-0">
              {selectedApplicantIds.length}
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>{selectedApplicantIds.length} Applicant{selectedApplicantIds.length > 1 ? "s" : ""} Selected</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Bulk Outreach Ready
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                Send a personalized commitment levy reminder or custom bulk email to all selected candidates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={selectEligibleOnly}
              className="px-3.5 py-2 bg-sky-900/60 hover:bg-sky-900 text-sky-200 rounded-xl text-xs font-semibold transition border border-sky-700/60 flex items-center gap-1.5"
              title="Select only candidates who are not currently in the 48-hour cooldown interval"
            >
              <HiOutlineCheckCircle className="w-4 h-4 text-emerald-400" /> Select Eligible Only
            </button>
            <button
              onClick={selectThisPage}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              Select this page ({applicants.length})
            </button>
            <button
              onClick={clearSelection}
              className="px-3.5 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700/50"
            >
              Clear Selection
            </button>
            <button
              onClick={openBulkEmailModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
            >
              <HiOutlinePaperAirplane className="w-4 h-4" /> Send Bulk Email ({selectedApplicantIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Applicants Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loadError && !loading ? (
          <div className="p-8 text-center" role="alert">
            <p>Could not load pending applicants.</p>
            <button type="button" onClick={() => void fetchApplicants()} className="mt-2 rounded-lg border px-3 py-2">Try again</button>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <HiOutlineArrowPath className="w-8 h-8 motion-safe:animate-spin mx-auto text-sky-600" />
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
                    <th className="py-3.5 px-4 pl-6 w-10">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                        aria-label="Select all applicants on this page"
                      />
                    </th>
                    <th className="py-3.5 px-4">Applicant Name & Email</th>
                    <th className="py-3.5 px-4">Country & Phone</th>
                    <th className="py-3.5 px-4">Current form step</th>
                    <th className="py-3.5 px-4">Reminder Status</th>
                    <th className="py-3.5 px-4">Activity</th>
                    <th className="py-3.5 px-4 text-right">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {applicants.map((applicant) => (
                    <tr
                      key={applicant._id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      <td className="py-4 px-4 pl-6 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${applicant.fullName || applicant.email}`} checked={selectedApplicantIds.includes(applicant._id)}
                          onChange={() => toggleSelectApplicant(applicant._id)}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-4">
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
                              Step {applicant.currentStep}
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

                      <td className="py-4 px-4">{getReminderBadge(applicant)}</td>

                      <td className="py-4 px-4">{getActivityBadge(applicant)}</td>

                      <td className="py-4 px-4 text-right">{renderApplicantActions(applicant)}</td>
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
                >
                  {/* Top Color Accent Strip Demarcating Card Boundary */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400 opacity-90" />

                  {/* Top Row: Checkbox, Avatar, Name (with truncation & checkmark) & Expiry Badge */}
                  <div className="flex items-start justify-between gap-3 pt-0.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${applicant.fullName || applicant.email}`} checked={selectedApplicantIds.includes(applicant._id)}
                          onChange={() => toggleSelectApplicant(applicant._id)}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                        />
                      </div>
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
                    <div className="shrink-0">{getActivityBadge(applicant)}</div>
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
                        Step {applicant.currentStep}
                      </span>

                      <span className="text-xs text-slate-600">{STEP_LABELS[applicant.currentStep]}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5">{renderApplicantActions(applicant)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {!loadError && total > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing Page {page} of {pages} ({total} total applicants)
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-400">Items per page:</span>
                <select
                  aria-label="Applicants per page" value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    changePage();
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000 (All)</option>
                </select>
              </div>
            </div>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => changePage(page + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CUSTOM EMAIL COMPOSER MODAL (SINGLE OR BULK) */}
      {(emailModalApplicant || isBulkEmailModalOpen) && (
        <PendingDialog labelledBy="pending-email-title" busy={sendingEmail} onDismiss={() => { setEmailModalApplicant(null); setIsBulkEmailModalOpen(false); }}>
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden motion-safe:animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                  <HiOutlineEnvelope className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pending-email-title" className="font-bold text-sm sm:text-base">
                    {isBulkEmailModalOpen ? `Compose Bulk Email (${selectedApplicantIds.length} Recipients)` : "Compose Email to Candidate"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-[320px]">
                    {isBulkEmailModalOpen
                      ? `To: ${selectedApplicantIds.length} selected pending applicants`
                      : `To: ${emailModalApplicant?.fullName || "Applicant"} <${emailModalApplicant?.email}>`}
                  </p>
                </div>
              </div>
              <button
                aria-label="Close reminder composer"
                disabled={sendingEmail}
                onClick={() => {
                  setEmailModalApplicant(null);
                  setIsBulkEmailModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 text-xs">
              <p className="text-sm text-slate-700">Recipient scope: {cohortScope}. The email is about each recipient’s saved IFIP application.</p>
              {!reminderJob.job && composeError && <p role="alert" className="text-red-700">{composeError}</p>}
              {reminderJob.job && <p role="status" className="text-sky-800">The send request is saved. Close this composer to follow its progress on the applicant page.</p>}
              {/* Cooldown Warning for Bulk Dispatch */}
              {isBulkEmailModalOpen &&
                applicants.filter((a) => selectedApplicantIds.includes(a._id) && a.cooldownActive).length > 0 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2.5">
                    <HiOutlineExclamationTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cooldown Notice:</strong>{" "}
                      {applicants.filter((a) => selectedApplicantIds.includes(a._id) && a.cooldownActive).length} of your selected{" "}
                      {selectedApplicantIds.length} applicants received a reminder within the last 48 hours. The server skips applicants in cooldown.
                    </div>
                  </div>
                )}

              {/* Info banner for bulk mode */}
              {isBulkEmailModalOpen && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-[11px] leading-relaxed">
                  💡 <strong>Personalized Bulk Dispatch:</strong> The placeholder <code>&#123;&#123;firstName&#125;&#125;</code> and <code>&#123;&#123;currentStep&#125;&#125;</code> will be automatically replaced with each candidate&apos;s name and current registration step.
                </div>
              )}

              {/* Template Selector Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Select Email Template / Purpose
                </label>
                <select
                  aria-label="Email template" value={emailTemplateKey}
                  onChange={(e) => {
                    if (isBulkEmailModalOpen) {
                      loadEmailTemplate(e.target.value);
                    } else if (emailModalApplicant) {
                      loadEmailTemplate(e.target.value, emailModalApplicant);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                >
                  <option value="expiration_reminder">Resume application</option>
                  <option value="assistance_inquiry">Application assistance</option>
                  <option value="payment_assistance">Payment support</option>
                  <option value="custom">Custom message</option>
                </select>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Subject Line
                </label>
                <input
                  type="text"
                  aria-label="Subject" value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder=""
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
                  aria-label="Message" value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder=""
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
                onClick={() => {
                  setEmailModalApplicant(null);
                  setIsBulkEmailModalOpen(false);
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || composerRecipientCount === 0 || reminderJob.blocked}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition shadow-sm flex items-center gap-2 text-xs"
              >
                {sendingEmail ? (
                  <>
                    <HiOutlineArrowPath className="w-4 h-4 motion-safe:animate-spin" /> {isBulkEmailModalOpen ? "Sending Bulk Emails..." : "Sending Email..."}
                  </>
                ) : (
                  <>
                    <HiOutlinePaperAirplane className="w-4 h-4" /> {`Send reminder (${composerRecipientCount})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </PendingDialog>
      )}

      {/* APPLICANT FULL DETAILS SLIDE-OVER DRAWER */}
      {selectedApplicant && (
        <PendingDialog labelledBy="pending-applicant-title" drawer onDismiss={() => setSelectedApplicant(null)}>
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden motion-safe:animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase">
                    Step {selectedApplicant.currentStep}
                  </span>
                  {getActivityBadge(selectedApplicant)}
                </div>
                <h2 id="pending-applicant-title" className="text-lg sm:text-xl font-bold font-serif">{selectedApplicant.fullName || "Unnamed Applicant"}</h2>
                <p className="text-xs text-slate-400 font-mono truncate max-w-[280px] sm:max-w-none">{selectedApplicant.email}</p>
              </div>
              <button
                aria-label="Close applicant details" onClick={() => setSelectedApplicant(null)}
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
                  {pendingPayment(selectedApplicant) ? (
                    <Link href={`/admin/payments?payment=${pendingPayment(selectedApplicant)!._id}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#000666]">
                      {pendingPayment(selectedApplicant)?.bankTransferReview ? "Review bank transfer" : "Review pending payment"}
                    </Link>
                  ) : selectedApplicant.declaration?.confirmed && selectedApplicant.declaration.signature?.trim() ? (
                    <button onClick={() => openManualPaymentModal(selectedApplicant)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#000666]">Record offline payment</button>
                  ) : <p className="text-xs text-slate-600">Offline enrollment requires the applicant’s signed declaration.</p>}
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
                Form Responses (1–7)
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
              <button
                onClick={() => setActiveTab("reminders")}
                className={`flex-1 py-3 border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                  activeTab === "reminders"
                    ? "border-sky-600 text-sky-600 font-bold"
                    : "border-transparent hover:text-slate-900"
                }`}
              >
                Reminder Log ({selectedApplicant.reminderCount || 0})
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
                    <div className="flex items-center justify-between text-xs font-bold text-sky-800 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <HiOutlinePaperClip className="w-4 h-4" /> 4. Skills & CV Document
                      </div>
                      {selectedApplicant.cvUrl && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" /> CV Attached
                        </span>
                      )}
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
                              className="inline-flex items-center gap-1.5 text-sky-700 font-bold hover:underline mt-1 bg-sky-50 px-2.5 py-1 rounded border border-sky-200"
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

                    {/* Admin Action: Upload / Replace CV on Behalf of Applicant */}
                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                        <span>Admin Action: Upload / Replace CV</span>
                        {uploadingCv && <span className="text-xs text-sky-600 motion-safe:animate-pulse font-medium">Uploading & Notifying...</span>}
                      </div>

                      <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer select-none bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                        <input
                          type="checkbox"
                          checked={notifyOnCvUpload}
                          onChange={(e) => setNotifyOnCvUpload(e.target.checked)}
                          className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <span>Send notification email with 1-click resume link to candidate</span>
                      </label>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          id={`admin-cv-upload-${selectedApplicant._id}`}
                          className="hidden"
                          disabled={uploadingCv}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              setToastMessage({ text: "File size exceeds 10MB limit.", type: "error" });
                              return;
                            }
                            setUploadingCv(true);
                            try {
                              const res = await uploadPendingApplicantCv(selectedApplicant._id, file, notifyOnCvUpload);
                              setToastMessage({
                                text: res.emailSent
                                  ? "CV uploaded & notification email with 1-click resume link sent!"
                                  : "CV uploaded successfully on behalf of applicant!",
                                type: "success",
                              });

                              const updatedApp = { ...selectedApplicant, cvUrl: res.cvUrl };
                              setSelectedApplicant(updatedApp);

                              setApplicants((prev) =>
                                prev.map((item) => (item._id === selectedApplicant._id ? { ...item, cvUrl: res.cvUrl } : item))
                              );
                            } catch (err: any) {
                              setToastMessage({
                                text: err.response?.data?.message || err.message || "Failed to upload CV for applicant",
                                type: "error",
                              });
                            } finally {
                              setUploadingCv(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <label
                          htmlFor={`admin-cv-upload-${selectedApplicant._id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm ${
                            uploadingCv
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-sky-600 text-white hover:bg-sky-700 active:scale-95"
                          }`}
                        >
                          <HiOutlinePaperClip className="w-4 h-4" />
                          {uploadingCv
                            ? "Uploading File..."
                            : selectedApplicant.cvUrl
                            ? "Replace Applicant CV"
                            : "Upload CV for Applicant"}
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Accepted formats: PDF, DOC, DOCX (Max 10MB). Once uploaded, candidate can resume directly at Step 5.
                      </p>
                    </div>
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
              ) : activeTab === "payments" ? (
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
                              className={`inline-flex items-center gap-1.5 font-medium uppercase text-[10px] ${
                                payment.status === "success"
                                  ? "text-emerald-700"
                                  : payment.status === "failed"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                payment.status === "success"
                                  ? "bg-emerald-600"
                                  : payment.status === "failed"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              }`} />
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
              ) : (
                /* Tab 3: Reminder Log & Cooldown Status */
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Reminder & Email Outreach History:</span>
                    <span className="font-bold text-sky-800">Total Sent: {selectedApplicant.reminderCount || 0}</span>
                  </div>

                  {selectedApplicant.lastReminderSentAt && (
                    <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200 flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 font-medium">Last Reminder Sent</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {new Date(selectedApplicant.lastReminderSentAt).toLocaleString()}
                        </div>
                      </div>
                      <div>{getReminderBadge(selectedApplicant)}</div>
                    </div>
                  )}

                  {selectedApplicant.reminderHistory && selectedApplicant.reminderHistory.length > 0 ? (
                    <div className="space-y-3">
                      {selectedApplicant.reminderHistory.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <HiOutlinePaperAirplane className="w-3.5 h-3.5 text-sky-600" />
                              Reminder #{idx + 1}: {item.subject || "Standard Expiration Reminder"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {new Date(item.sentAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span>Sent by: <strong className="text-slate-700">{item.sentBy || "Admin"}</strong></span>
                            <span>Resume Link Included: <strong>{item.includeResumeLink !== false ? "Yes" : "No"}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                      No reminder emails have been sent to this candidate yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </PendingDialog>
      )}
      {/* ── Record Manual Payment Modal ─────────────────────────────────────── */}
      {manualPaymentModalOpen && manualPaymentApplicant && (
        <PendingDialog labelledBy="pending-payment-title" busy={manualSubmitting} onDismiss={() => setManualPaymentModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 motion-safe:animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <HiOutlineCreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pending-payment-title" className="font-bold text-sm text-white">Record offline payment</h3>
                  <p className="text-[11px] text-slate-300">Upload receipt &amp; confirm offline payment</p>
                </div>
              </div>
              <button
                aria-label="Close offline payment" disabled={manualSubmitting} onClick={() => setManualPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualPayment} className="p-6 space-y-4">
              {/* Target Candidate Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{manualPaymentApplicant.fullName || "Candidate"}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{manualPaymentApplicant.email}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 block">
                    Step {manualPaymentApplicant.currentStep}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">{manualPaymentApplicant.country || "Nigeria"}</span>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Upload Payment Receipt (Image or PDF)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleReceiptFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {manualReceiptPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={manualReceiptPreview} alt="Receipt preview" className="max-h-24 rounded border border-slate-200 object-contain" />
                      <span className="text-xs font-semibold text-emerald-700">{manualReceiptFile?.name}</span>
                      <span className="text-[10px] text-slate-400">Click to change file</span>
                    </div>
                  ) : manualReceiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                      <HiOutlinePaperClip className="w-4 h-4" />
                      <span>{manualReceiptFile.name} ({(manualReceiptFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <HiOutlinePaperClip className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700">Click or drag receipt file here</span>
                      <span className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP, and PDF (Max 10MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Method & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Direct Deposit">Direct Deposit</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Currency
                  </label>
                  <select
                    value={manualCurrency}
                    onChange={(e) => {
                      const curr = e.target.value as "NGN" | "USD";
                      setManualCurrency(curr);
                      setManualAmount(pricing ? String(pricing[curr] / 100) : "");
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Amount & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Amount ({manualCurrency})
                  </label>
                  <input
                    type="number"
                    required value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Transaction / Bank Reference
                  </label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Reference code"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder=""
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2 leading-relaxed">
                <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Confirming this payment will mark the levy as paid, convert the applicant into a registered participant, and send them an email to set their account password.
                </span>
              </div>

              <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                <p>Records <strong>{manualCurrency} {manualAmount || "—"}</strong> and enrolls the applicant.</p>
                <p>Destination: {manualPaymentApplicant.manualPaymentCohortId
                  ? cohorts.find(cohort => cohort._id === manualPaymentApplicant.manualPaymentCohortId)?.name ?? "Assigned cohort"
                  : "Awaiting cohort assignment"}</p>
                <p>Evidence: {manualReceiptFile?.name || manualRef.trim() || "No receipt or reference entered"}</p>
                <label className="flex items-start gap-2"><input type="checkbox" required /> I confirmed the funds were received.</label>
              </div>
              {manualError && (
                <div role="alert" className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                  {manualError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualPaymentModalOpen(false)}
                  disabled={manualSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {manualSubmitting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Recording...
                    </>
                  ) : (
                    <>
                      <HiOutlineCheckCircle className="w-4 h-4" />
                      Confirm Payment &amp; Enroll
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </PendingDialog>
      )}

      {/* Export Applicants Modal */}
      <ExportApplicantsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        cohorts={cohorts}
        initialParams={{
          type: "unpaid",
          cohortId: selectedCohortId || undefined,
          step: step ? parseInt(step, 10) : undefined,
          country: country || undefined,
          hasPaymentAttempt: hasPaymentAttempt !== "all" ? hasPaymentAttempt : undefined,
          search: appliedSearch || undefined,
        }}
        title="Custom applicant export"
      />
    </div>
  );
}
