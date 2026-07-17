"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Hi2 from "react-icons/hi2";
import { getAuditLogs, AuditLogItem, AuditLogsResponse, getMyApplication } from "@/lib/api/services";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ACTION_COLORS: Record<string, string> = {
  COHORT_CREATE: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  COHORT_UPDATE: "bg-blue-50 text-blue-700 border border-blue-100",
  COHORT_DELETE: "bg-red-50 text-red-700 border border-red-100",
  SYSTEM_CONFIG_UPDATE: "bg-purple-50 text-purple-700 border border-purple-100",
  BROCHURE_UPLOAD: "bg-amber-50 text-amber-700 border border-amber-100",
  ADMIN_INVITE: "bg-rose-50 text-rose-700 border border-rose-100",
};

const ACTION_LABELS: Record<string, string> = {
  COHORT_CREATE: "Cohort Created",
  COHORT_UPDATE: "Cohort Updated",
  COHORT_DELETE: "Cohort Deleted",
  SYSTEM_CONFIG_UPDATE: "Config Overrides",
  BROCHURE_UPLOAD: "Brochure Upload",
  ADMIN_INVITE: "Admin Invited",
};

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeAction, setActiveAction] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyApplication();
        if (profile?.role === "superadmin") {
          setAuthorized(true);
        } else {
          router.push("/admin?error=unauthorized");
        }
      } catch {
        router.push("/login?session=expired");
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeAction, debouncedSearch]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        action: activeAction === "all" ? undefined : activeAction,
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setData(result);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }, [activeAction, debouncedSearch, page]);

  useEffect(() => {
    if (authorized) fetchLogs();
  }, [authorized, fetchLogs]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 text-sm font-medium">Checking privileges…</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] min-h-screen">
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-[#E7E2D8] bg-white hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <Hi2.HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight flex items-center gap-2">
              <Hi2.HiOutlineClipboardDocumentList className="w-7 h-7 text-[#FF9800]" />
              System Audit Logs
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Chronological log of administrative actions, config alterations, and program updates.
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#000666] border border-[#E7E2D8] bg-white px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Hi2.HiOutlineArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400">Filter Action:</span>
            <select
              value={activeAction}
              onChange={(e) => setActiveAction(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-slate-50/50"
            >
              <option value="all">All Actions</option>
              <option value="COHORT_CREATE">Cohort Creation</option>
              <option value="COHORT_UPDATE">Cohort Updates</option>
              <option value="COHORT_DELETE">Cohort Deletions</option>
              <option value="SYSTEM_CONFIG_UPDATE">Launch Configurations</option>
              <option value="BROCHURE_UPLOAD">Brochure Uploads</option>
              <option value="ADMIN_INVITE">Admin Invitations</option>
            </select>
          </div>
          <div className="relative w-full md:w-80">
            <Hi2.HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search email, role, or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Logs Table (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Timestamp</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Actor</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Action Type</th>
                <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Description</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="w-32 h-2.5 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="w-24 h-2.5 bg-slate-100 rounded" />
                        <div className="w-16 h-2 bg-slate-100 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="w-24 h-4 bg-slate-100 rounded-full" /></td>
                    <td className="px-5 py-4"><div className="w-64 h-2.5 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="w-20 h-2.5 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : !data || data.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                    <Hi2.HiOutlineClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-sm">No audit logs found.</p>
                  </td>
                </tr>
              ) : (
                data.logs.map((log: AuditLogItem) => {
                  const badgeClass = ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-600 border-slate-100";
                  const actionLabel = ACTION_LABELS[log.action] ?? log.action;

                  return (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#000666] text-xs leading-none">
                          {log.userEmail}
                        </div>
                        <span className="text-[9px] uppercase font-black text-slate-400 mt-1 inline-block tracking-wider">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeClass}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">
                        {log.description}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        {log.ipAddress || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Logs List (Mobile view) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="w-28 h-2.5 bg-slate-100 rounded" />
                  <div className="w-16 h-4 bg-slate-100 rounded-full" />
                </div>
                <div className="w-full h-3 bg-slate-100 rounded" />
                <div className="w-40 h-2 bg-slate-100 rounded" />
              </div>
            ))
          ) : !data || data.logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Hi2.HiOutlineClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-sm">No audit logs found.</p>
            </div>
          ) : (
            data.logs.map((log: AuditLogItem) => {
              const badgeClass = ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-600 border border-slate-100";
              const actionLabel = ACTION_LABELS[log.action] ?? log.action;

              return (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 space-y-2.5 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(log.createdAt)}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClass}`}>
                      {actionLabel}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {log.description}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Actor: <strong className="text-[#000666]">{log.userEmail}</strong> ({log.userRole})
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination footer */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-white">
            <p className="text-xs text-slate-400">
              Showing <strong className="text-slate-600">{((data.page - 1) * 50) + 1}–{Math.min(data.page * 50, data.total)}</strong> of{" "}
              <strong className="text-slate-600">{data.total}</strong> records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <Hi2.HiOutlineChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-xs font-bold text-slate-600">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={data.page >= data.pages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <Hi2.HiOutlineChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {data && (
        <p className="text-center text-xs text-slate-400 mt-4">
          {data.total} total event{data.total !== 1 ? "s" : ""} recorded in database.
        </p>
      )}

      {/* Log Details Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">Audit Log Detail</h3>
                <p className="text-xs text-sky-200 mt-0.5">Event ID: {selectedLog._id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <Hi2.HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Timestamp</span>
                <div className="text-slate-700 font-bold mt-0.5">{formatDate(selectedLog.createdAt)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actor Email</span>
                  <div className="text-slate-700 font-bold mt-0.5">{selectedLog.userEmail}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actor Role</span>
                  <div className="mt-1">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                      {selectedLog.userRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Action</span>
                  <div className="mt-1">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${ACTION_COLORS[selectedLog.action] ?? "bg-slate-50 text-slate-600 border-slate-100"}`}>
                      {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                    </span>
                  </div>
                </div>
                {selectedLog.targetId && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Resource</span>
                    <div className="text-slate-600 mt-0.5 font-medium text-xs">
                      {selectedLog.targetType || "Entity"} ({selectedLog.targetId})
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Details Description</span>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-700 font-medium leading-relaxed">
                  {selectedLog.description}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">IP Address</span>
                  <div className="font-mono text-slate-600">{selectedLog.ipAddress || "—"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">User Agent</span>
                  <div className="text-slate-500 leading-normal text-[11px] truncate max-w-full" title={selectedLog.userAgent}>
                    {selectedLog.userAgent || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
