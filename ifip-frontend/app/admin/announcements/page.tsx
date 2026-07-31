"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineMegaphone,
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineEye,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineArrowRight,
  HiOutlinePaperAirplane
} from "react-icons/hi2";
import {
  getCohorts,
  getAdminUsers,
  adminBroadcastNotification,
  Cohort,
  AdminUser
} from "@/lib/api/services";

export default function AdminAnnouncementsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);

  // Form Fields State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [notificationType, setNotificationType] = useState<"info" | "success" | "warning" | "alert">("info");
  const [targetType, setTargetType] = useState<"all_paid" | "cohort" | "individual">("all_paid");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  
  // Individual Target State
  const [userEmail, setUserEmail] = useState("");
  const [resolvedUser, setResolvedUser] = useState<AdminUser | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [userError, setUserError] = useState("");

  // UI State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchCohortsData = async () => {
      try {
        setCohortsLoading(true);
        const data = await getCohorts();
        setCohorts(data);
        if (data.length > 0) {
          setSelectedCohortId(data[0]._id);
        }
      } catch (err) {
        console.error("Failed to load cohorts for targeting:", err);
        showAlert("error", "Failed to load academic cohorts.");
      } finally {
        setCohortsLoading(false);
      }
    };
    fetchCohortsData();
  }, []);

  // Individual User Email Lookup
  useEffect(() => {
    if (targetType !== "individual" || !userEmail.trim()) {
      setResolvedUser(null);
      setUserError("");
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingUser(true);
      setUserError("");
      try {
        const response = await getAdminUsers({ search: userEmail.trim(), limit: 1 });
        const matched = response.users.find(
          (u) => u.email.toLowerCase() === userEmail.trim().toLowerCase()
        );
        if (matched) {
          setResolvedUser(matched);
        } else {
          setResolvedUser(null);
          setUserError("No registered user found with this email.");
        }
      } catch (err) {
        console.error("User search failed:", err);
        setUserError("Error verifying email address.");
      } finally {
        setSearchingUser(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [userEmail, targetType]);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert("error", "Announcement Title and Message are required.");
      return;
    }

    if (targetType === "cohort" && !selectedCohortId) {
      showAlert("error", "Please select a target Cohort.");
      return;
    }

    if (targetType === "individual" && !resolvedUser) {
      showAlert("error", "Please specify a valid individual user email.");
      return;
    }

    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      await adminBroadcastNotification({
        targetType,
        title: title.trim(),
        message: message.trim(),
        notificationType,
        link: link.trim() || undefined,
        targetCohortId: targetType === "cohort" ? selectedCohortId : undefined,
        targetUserId: targetType === "individual" ? resolvedUser?._id : undefined
      });

      showAlert("success", "Announcement broadcast has been successfully queued.");
      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
      setUserEmail("");
      setResolvedUser(null);
    } catch (err: any) {
      console.error("Announcement failed:", err);
      showAlert("error", err?.response?.data?.message || "Failed to broadcast announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const getAccentStyles = (type: string) => {
    switch (type) {
      case "success":
        return { border: "border-emerald-500", dot: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-50" };
      case "warning":
        return { border: "border-amber-500", dot: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-50" };
      case "alert":
        return { border: "border-rose-500", dot: "bg-rose-500", text: "text-rose-500", bg: "bg-rose-50" };
      default:
        return { border: "border-sky-500", dot: "bg-sky-500", text: "text-sky-500", bg: "bg-sky-50" };
    }
  };

  const activeAccent = getAccentStyles(notificationType);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#000666] tracking-tight flex items-center gap-2">
            <HiOutlineMegaphone className="w-7 h-7 text-[#00B0FF]" />
            Send Announcements
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Broadcast in-app notifications and corresponding emails to paid applicants.
          </p>
        </div>
      </div>

      {/* Toast Alert Banner */}
      {alertMsg && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border select-none transition-all animate-fadeIn ${
            alertMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {alertMsg.type === "success" ? (
            <HiOutlineCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <HiOutlineExclamationTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-bold">{alertMsg.text}</span>
        </div>
      )}

      {/* Main Composer Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left Column: Form Composer (3/5 width) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-[#000666] border-b border-slate-50 pb-3 flex items-center gap-2">
            <HiOutlinePaperAirplane className="w-4 h-4 text-sky-500" />
            Compose Broadcast Message
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="announcement-title" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Announcement Title
              </label>
              <input
                id="announcement-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cohort Induction Session Delayed"
                className="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/25 focus:border-[#00B0FF] transition-all font-medium placeholder-slate-400"
              />
            </div>

            {/* Message Body */}
            <div>
              <label htmlFor="announcement-message" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Message Content
              </label>
              <textarea
                id="announcement-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write your announcement details here..."
                className="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/25 focus:border-[#00B0FF] transition-all font-medium placeholder-slate-400 resize-y"
              />
            </div>

            {/* Link */}
            <div>
              <label htmlFor="announcement-link" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Redirect URL (Optional Link)
              </label>
              <input
                id="announcement-link"
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g. /dashboard/modules or https://zoom.us/..."
                className="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/25 focus:border-[#00B0FF] transition-all font-medium placeholder-slate-400"
              />
            </div>

            {/* Notification Type */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Notification Type / Severity
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["info", "success", "warning", "alert"] as const).map((type) => {
                  const style = getAccentStyles(type);
                  const isSelected = notificationType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNotificationType(type)}
                      className={`px-3 py-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? `border-${type === "info" ? "sky" : type === "success" ? "emerald" : type === "warning" ? "amber" : "rose"}-500 ${style.bg} ring-2 ring-${type === "info" ? "sky" : type === "success" ? "emerald" : type === "warning" ? "amber" : "rose"}-500/20`
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-6" />

            {/* Target Audience */}
            <div className="space-y-4">
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Target Audience
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("all_paid")}
                    className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                      targetType === "all_paid"
                        ? "border-[#00B0FF] bg-[#00B0FF]/5 text-[#000666] font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-xs font-bold">All Paid Applicants</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Any Cohort</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("cohort")}
                    className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                      targetType === "cohort"
                        ? "border-[#00B0FF] bg-[#00B0FF]/5 text-[#000666] font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-xs font-bold">By Program Cohort</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Filter by Cohort</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("individual")}
                    className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                      targetType === "individual"
                        ? "border-[#00B0FF] bg-[#00B0FF]/5 text-[#000666] font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-xs font-bold">Individual User</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Single Applicant</span>
                  </button>
                </div>
              </div>

              {/* Conditional Target Options */}
              {targetType === "cohort" && (
                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-2 animate-fadeIn">
                  <label htmlFor="cohort-select" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Target Cohort
                  </label>
                  {cohortsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <HiOutlineArrowPath className="w-4 h-4 animate-spin text-[#00B0FF]" />
                      Loading program cohorts...
                    </div>
                  ) : (
                    <select
                      id="cohort-select"
                      value={selectedCohortId}
                      onChange={(e) => setSelectedCohortId(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/25 font-bold text-[#000666]"
                    >
                      {cohorts.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {targetType === "individual" && (
                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-3 animate-fadeIn">
                  <div>
                    <label htmlFor="user-email-search" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Applicant Email Address
                    </label>
                    <div className="relative">
                      <HiOutlineEnvelope className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id="user-email-search"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="applicant@domain.com"
                        className="w-full text-xs pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/25 font-medium"
                      />
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {searchingUser && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin text-[#00B0FF]" />
                      Verifying account status...
                    </div>
                  )}

                  {resolvedUser && (
                    <div className="flex items-center gap-2.5 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[11px] font-bold animate-fadeIn">
                      <HiOutlineUser className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        Matched: <span className="underline">{resolvedUser.fullName}</span> ({resolvedUser.role})
                      </div>
                    </div>
                  )}

                  {userError && (
                    <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-[11px] font-semibold animate-fadeIn">
                      <HiOutlineExclamationTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      {userError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSend}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <HiOutlinePaperAirplane className="w-4 h-4" />
                  Broadcast Announcement
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Mock Preview (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 select-none">
            <h2 className="text-xs font-bold text-[#000666] uppercase tracking-wider mb-4 flex items-center gap-2">
              <HiOutlineEye className="w-4 h-4 text-slate-400" />
              Live Dropdown Preview
            </h2>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-6">
              This card simulates how the notification will look in-app under the notification bell on the participant dashboard.
            </p>

            {/* Notification Dropdown Box */}
            <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-lg overflow-hidden max-w-sm mx-auto font-sans">
              <div className="flex items-center justify-between px-4 py-3 bg-[#000666]/5 border-b border-slate-100">
                <span className="font-bold text-[#000666] text-xs">Notifications</span>
                <span className="text-[9px] uppercase font-bold text-[#00B0FF] hover:underline cursor-default">
                  Mark all read
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                <div className={`p-4 flex gap-3 bg-sky-50/10 border-l-2 ${activeAccent.border} relative`}>
                  {/* Indicator Dot */}
                  <div className="mt-1 shrink-0">
                    <span className={`block h-2 w-2 rounded-full ${activeAccent.dot}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold text-[#000666] text-[11px] truncate block max-w-[200px]">
                        {title.trim() || "Untitled Announcement"}
                      </span>
                    </div>
                    <p className="text-slate-500 leading-normal text-[10px] mb-2 break-words">
                      {message.trim() || "Draft notification message body..."}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                      <span>Just now</span>
                      {link.trim() && (
                        <span className="text-[#00B0FF] font-bold flex items-center gap-0.5 cursor-default hover:underline">
                          View details <HiOutlineArrowRight className="w-2 h-2" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Double Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <HiOutlineExclamationTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-sm">Confirm Announcement Broadcast</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              You are about to broadcast the announcement <strong className="text-[#000666]">"{title}"</strong> to{" "}
              {targetType === "all_paid" && <span className="font-bold text-sky-600">all paid applicants</span>}
              {targetType === "cohort" && (
                <>
                  applicants in the cohort{" "}
                  <strong className="text-sky-600">
                    "{cohorts.find((c) => c._id === selectedCohortId)?.name || "selected"}"
                  </strong>
                </>
              )}
              {targetType === "individual" && (
                <>
                  the individual user <strong className="text-sky-600">"{resolvedUser?.fullName}"</strong>
                </>
              )}. 
              This will create in-app notifications and trigger an email dispatch. Are you sure you wish to continue?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeSend}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
