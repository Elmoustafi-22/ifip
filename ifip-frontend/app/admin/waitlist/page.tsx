"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HiOutlineInboxStack,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowDownTray,
  HiOutlineTrash,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineEnvelope,
} from "react-icons/hi2";
import { getAdminWaitlist, deleteWaitlistEntry, WaitlistEntry } from "@/lib/api/services";

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchWaitlist = useCallback(async (pageNum = 1, searchQuery = search) => {
    setLoading(true);
    try {
      const res = await getAdminWaitlist({
        page: pageNum,
        limit,
        search: searchQuery.trim() || undefined,
      });
      setEntries(res.waitlist || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setPages(res.pages || 1);
    } catch (err: any) {
      console.error("Failed to load waitlist:", err);
      showToast(err?.response?.data?.message || "Failed to load waitlist entries.", "error");
    } finally {
      setLoading(false);
    }
  }, [limit, search]);

  useEffect(() => {
    fetchWaitlist(page, search);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWaitlist(1, search);
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWaitlistEntry(id);
      showToast("Waitlist entry removed successfully.", "success");
      setDeleteConfirmId(null);
      fetchWaitlist(page, search);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to delete entry.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCopyAllEmails = () => {
    if (entries.length === 0) return;
    const allEmails = entries.map((e) => e.email).join(", ");
    navigator.clipboard.writeText(allEmails);
    setCopiedAll(true);
    showToast(`Copied ${entries.length} emails to clipboard.`, "success");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      showToast("No waitlist entries to export.", "error");
      return;
    }

    const headers = ["Index", "Email", "Date Joined (UTC)", "Formatted Date"];
    const rows = entries.map((entry, idx) => [
      idx + 1 + (page - 1) * limit,
      `"${entry.email}"`,
      `"${new Date(entry.createdAt).toISOString()}"`,
      `"${new Date(entry.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ifip-waitlist-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Waitlist CSV downloaded.", "success");
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getRelativeTime = (iso: string) => {
    try {
      const ms = Date.now() - new Date(iso).getTime();
      const sec = Math.floor(ms / 1000);
      const min = Math.floor(sec / 60);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);

      if (day > 0) return `${day}d ago`;
      if (hr > 0) return `${hr}h ago`;
      if (min > 0) return `${min}m ago`;
      return "just now";
    } catch {
      return "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Toast notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-slideUp ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toastMsg.type === "success" ? (
            <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <HiOutlineExclamationTriangle className="w-4 h-4 text-red-600" />
          )}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <HiOutlineInboxStack className="w-5 h-5" />
            </div>
            Waitlist Inquiries
          </h1>
          <p className="text-slate-500 text-sm">
            Candidates who requested priority notifications when upcoming cohorts open for registration.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchWaitlist(page, search)}
            disabled={loading}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${loading ? "animate-spin text-[#000666]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleCopyAllEmails}
            disabled={entries.length === 0}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {copiedAll ? <HiOutlineCheck className="w-4 h-4 text-emerald-600" /> : <HiOutlineClipboardDocument className="w-4 h-4" />}
            <span>{copiedAll ? "Copied All!" : "Copy Emails"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Waitlisted
            </span>
            <span className="text-2xl font-display font-black text-[#000666]">{total}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <HiOutlineInboxStack className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Current Page Entries
            </span>
            <span className="text-2xl font-display font-black text-slate-800">{entries.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000666] flex items-center justify-center">
            <HiOutlineEnvelope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Pagination Pages
            </span>
            <span className="text-2xl font-display font-black text-slate-800">
              {page} <span className="text-xs text-slate-400 font-normal">of {pages}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
            <HiOutlineClock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search candidate email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#000666]/30 text-slate-800"
            />
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </form>

          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
                fetchWaitlist(1, "");
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline self-center sm:self-auto cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5 w-12 text-center">#</th>
                <th className="px-5 py-3.5">Candidate Email</th>
                <th className="px-5 py-3.5">Date Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-400">Loading waitlist entries...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HiOutlineInboxStack className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">No waitlisted candidates found</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {search ? "No matches found for your search query." : "When registration is full or closed, candidates who join the waitlist will appear here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1;
                  const isDeleting = deletingId === entry._id;
                  const isConfirming = deleteConfirmId === entry._id;

                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 text-center text-slate-400 font-mono font-bold">
                        {rowNumber}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#000666] select-all">{entry.email}</span>
                          <button
                            onClick={() => handleCopyEmail(entry.email)}
                            className="text-slate-400 hover:text-[#000666] transition-colors p-1 rounded hover:bg-slate-100 cursor-pointer"
                            title="Copy email"
                          >
                            {copiedEmail === entry.email ? (
                              <HiOutlineCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <HiOutlineClipboardDocument className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(entry.createdAt)}</span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {getRelativeTime(entry.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-[10px] text-red-600 font-bold">Delete?</span>
                            <button
                              onClick={() => handleDelete(entry._id)}
                              disabled={isDeleting}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              {isDeleting ? "..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-slate-500 hover:text-slate-700 font-bold text-[10px] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(entry._id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Remove from waitlist"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{(page - 1) * limit + 1}</strong> to{" "}
              <strong className="text-slate-800">{Math.min(page * limit, total)}</strong> of{" "}
              <strong className="text-slate-800">{total}</strong> inquiries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <HiOutlineChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  let pNum = i + 1;
                  if (pages > 5 && page > 3) {
                    pNum = page - 3 + i;
                    if (pNum > pages) pNum = pages - (4 - i);
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        page === pNum
                          ? "bg-[#000666] text-white"
                          : "text-slate-600 hover:bg-slate-200/60"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
                className="border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                Next <HiOutlineChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
