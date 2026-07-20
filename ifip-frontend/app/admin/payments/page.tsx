"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Hi2 from "react-icons/hi2";
import {
  getAdminPayments,
  getAdminPaymentById,
  resolveAdminPayment,
  AdminPayment,
  AdminPaymentsResponse,
  getMyApplication,
} from "@/lib/api/services";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number, currency: string) {
  const value = amount / 100;
  if (currency === "NGN") return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  if (currency === "USD") return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return `${value} ${currency}`;
}

function shortRef(ref: string) {
  return ref.length > 20 ? `...${ref.slice(-12)}` : ref;
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
};

const PROVIDER_STYLES: Record<string, string> = {
  paystack: "bg-[#0BA4DB]/10 text-[#0BA4DB] border border-[#0BA4DB]/20",
  flutterwave: "bg-[#F6821F]/10 text-[#F6821F] border border-[#F6821F]/20",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [data, setData] = useState<AdminPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPayment, setDrawerPayment] = useState<AdminPayment | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Resolve modal state
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<"success" | "failed">("success");
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  // Copy feedback
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // ── Auth Check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyApplication();
        if (profile?.role === "admin" || profile?.role === "superadmin") {
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

  // ── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, providerFilter, debouncedSearch]);

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminPayments({
        status: statusFilter === "all" ? undefined : statusFilter,
        provider: providerFilter === "all" ? undefined : providerFilter,
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setData(result);
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter, debouncedSearch, page]);

  useEffect(() => {
    if (authorized) fetchPayments();
  }, [authorized, fetchPayments]);

  // ── Drawer open ─────────────────────────────────────────────────────────────
  const openDrawer = async (payment: AdminPayment) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerPayment(payment);
    try {
      const full = await getAdminPaymentById(payment._id);
      setDrawerPayment(full);
    } catch {
      // keep the list-level data
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerPayment(null);
    setResolveModalOpen(false);
    setResolveNote("");
    setResolveError("");
  };

  // ── Copy reference ──────────────────────────────────────────────────────────
  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // ── Resolve payment ─────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!drawerPayment || resolving) return;
    setResolving(true);
    setResolveError("");
    try {
      const result = await resolveAdminPayment(drawerPayment._id, {
        status: resolveStatus,
        note: resolveNote || undefined,
      });
      setDrawerPayment(result.payment);
      setResolveModalOpen(false);
      setResolveNote("");
      fetchPayments(); // refresh list
    } catch (err: any) {
      setResolveError(err?.response?.data?.message || "Failed to resolve payment. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  // ── Render guards ───────────────────────────────────────────────────────────
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

  const summary = data?.summary;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
              <Hi2.HiOutlineCreditCard className="w-7 h-7 text-[#FF9800]" />
              Payment Records
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track, investigate, and resolve payment conflicts for all applicants.
            </p>
          </div>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#000666] border border-[#E7E2D8] bg-white px-4 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <Hi2.HiOutlineArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Revenue",
            value: summary ? `₦${(summary.totalRevenue / 100).toLocaleString("en-NG")}` : "—",
            icon: <Hi2.HiOutlineBanknotes className="w-5 h-5 text-emerald-500" />,
            color: "text-emerald-700",
          },
          {
            label: "Successful",
            value: summary?.success ?? "—",
            icon: <Hi2.HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />,
            color: "text-emerald-700",
          },
          {
            label: "Pending",
            value: summary?.pending ?? "—",
            icon: <Hi2.HiOutlineClock className="w-5 h-5 text-amber-500" />,
            color: "text-amber-700",
          },
          {
            label: "Failed",
            value: summary?.failed ?? "—",
            icon: <Hi2.HiOutlineXCircle className="w-5 h-5 text-red-500" />,
            color: "text-red-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-[#E7E2D8] rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
              {stat.icon}
            </div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + Table ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden">
        {/* Filters toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400">Status:</span>
            <div className="flex gap-1.5">
              {["all", "success", "pending", "failed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                    statusFilter === s
                      ? "bg-[#000666] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-400 ml-2">Provider:</span>
            <div className="flex gap-1.5">
              {["all", "paystack", "flutterwave"].map((p) => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                    providerFilter === p
                      ? "bg-[#FF9800] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <Hi2.HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Reference</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Applicant</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Provider</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Amount</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Webhook</th>
                <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-2.5 bg-slate-100 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.payments.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                        <Hi2.HiOutlineCreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        No payments match the current filters.
                      </td>
                    </tr>
                  )
                : data?.payments.map((payment) => {
                    const applicantEmail = payment.applicationId?.userId?.email;
                    const applicantName = payment.applicationId?.fullName;
                    return (
                      <tr
                        key={payment._id}
                        onClick={() => openDrawer(payment)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                      >
                        {/* Reference */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-600 font-semibold">
                              {shortRef(payment.providerRef)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyRef(payment.providerRef); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-all"
                              title="Copy full reference"
                            >
                              {copiedRef === payment.providerRef
                                ? <Hi2.HiOutlineCheck className="w-3.5 h-3.5 text-emerald-500" />
                                : <Hi2.HiOutlineClipboard className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </td>
                        {/* Applicant */}
                        <td className="px-4 py-3.5">
                          {applicantName || applicantEmail ? (
                            <div>
                              {applicantName && <p className="text-xs font-semibold text-slate-700">{applicantName}</p>}
                              {applicantEmail && <p className="text-[11px] text-slate-400">{applicantEmail}</p>}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Applicant only (pre-submit)</span>
                          )}
                        </td>
                        {/* Provider */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${PROVIDER_STYLES[payment.provider] || "bg-slate-100 text-slate-500"}`}>
                            {payment.provider}
                          </span>
                        </td>
                        {/* Amount */}
                        <td className="px-4 py-3.5 font-semibold text-xs text-slate-700">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${STATUS_STYLES[payment.status]}`}>
                            {payment.status}
                          </span>
                        </td>
                        {/* Webhook verified */}
                        <td className="px-4 py-3.5">
                          {payment.webhookVerified
                            ? <Hi2.HiOutlineCheckBadge className="w-4 h-4 text-emerald-500" title="Webhook verified" />
                            : <Hi2.HiOutlineXMark className="w-4 h-4 text-slate-300" title="Not webhook-verified" />
                          }
                        </td>
                        {/* Date */}
                        <td className="px-5 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDate(payment.createdAt)}
                        </td>
                        {/* View */}
                        <td className="px-4 py-3.5">
                          <Hi2.HiChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-40" />
                  <div className="h-2.5 bg-slate-100 rounded w-28" />
                </div>
              ))
            : data?.payments.length === 0
            ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <Hi2.HiOutlineCreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  No payments found.
                </div>
              )
            : data?.payments.map((payment) => {
                const applicantEmail = payment.applicationId?.userId?.email;
                const applicantName = payment.applicationId?.fullName;
                return (
                  <div
                    key={payment._id}
                    onClick={() => openDrawer(payment)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {applicantName && <p className="text-xs font-bold text-slate-700">{applicantName}</p>}
                        {applicantEmail && <p className="text-[11px] text-slate-400">{applicantEmail}</p>}
                        {!applicantName && !applicantEmail && (
                          <p className="text-[11px] text-slate-400 italic">Applicant (pre-submit)</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${STATUS_STYLES[payment.status]}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="font-mono">{shortRef(payment.providerRef)}</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(payment.amount, payment.currency)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PROVIDER_STYLES[payment.provider] || ""}`}>{payment.provider}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(payment.createdAt)}</p>
                  </div>
                );
              })}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Page <strong>{data.page}</strong> of <strong>{data.pages}</strong> &bull; {data.total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages || loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-white shadow-2xl flex flex-col overflow-hidden animate-slideInRight">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#000666]/5 flex items-center justify-center">
                  <Hi2.HiOutlineCreditCard className="w-5 h-5 text-[#000666]" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-800">Payment Detail</h2>
                  <p className="text-[11px] text-slate-400">Full record & resolution tools</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Hi2.HiOutlineXMark className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <svg className="animate-spin w-7 h-7 text-[#000666]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : drawerPayment ? (
              <div className="flex-1 overflow-y-auto">
                {/* Status Banner */}
                <div className={`px-6 py-4 border-b border-slate-100 ${
                  drawerPayment.status === "success" ? "bg-emerald-50" :
                  drawerPayment.status === "failed" ? "bg-red-50" : "bg-amber-50"
                }`}>
                  <div className="flex items-center gap-3">
                    {drawerPayment.status === "success" && <Hi2.HiOutlineCheckCircle className="w-6 h-6 text-emerald-600" />}
                    {drawerPayment.status === "failed" && <Hi2.HiOutlineXCircle className="w-6 h-6 text-red-600" />}
                    {drawerPayment.status === "pending" && <Hi2.HiOutlineClock className="w-6 h-6 text-amber-600" />}
                    <div>
                      <p className={`font-bold text-sm capitalize ${
                        drawerPayment.status === "success" ? "text-emerald-700" :
                        drawerPayment.status === "failed" ? "text-red-700" : "text-amber-700"
                      }`}>
                        {drawerPayment.status} Payment
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {drawerPayment.webhookVerified ? "✓ Webhook verified" : "⚠ Not webhook-verified"}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${PROVIDER_STYLES[drawerPayment.provider] || ""}`}>
                        {drawerPayment.provider}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Core Fields */}
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Reference</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 break-all">
                        {drawerPayment.providerRef}
                      </code>
                      <button
                        onClick={() => copyRef(drawerPayment.providerRef)}
                        className="text-slate-400 hover:text-slate-700 shrink-0"
                        title="Copy reference"
                      >
                        {copiedRef === drawerPayment.providerRef
                          ? <Hi2.HiOutlineCheck className="w-4 h-4 text-emerald-500" />
                          : <Hi2.HiOutlineClipboard className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Amount</p>
                      <p className="font-bold text-slate-800">{formatCurrency(drawerPayment.amount, drawerPayment.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Currency</p>
                      <p className="font-semibold text-slate-700">{drawerPayment.currency}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Created</p>
                      <p className="text-xs text-slate-600">{formatDate(drawerPayment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Updated</p>
                      <p className="text-xs text-slate-600">{formatDate(drawerPayment.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Linked Application */}
                  {drawerPayment.applicationId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Linked Application</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {drawerPayment.applicationId.fullName || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {drawerPayment.applicationId.userId?.email || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_STYLES[drawerPayment.applicationId.status] || "bg-slate-100 text-slate-500"}`}>
                          {drawerPayment.applicationId.status?.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Submitted: {formatDate(drawerPayment.applicationId.submittedAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Raw Webhook Data */}
                  {(drawerPayment.paystackVerification || drawerPayment.flutterwaveVerification) && (
                    <details className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <summary className="px-4 py-3 text-[11px] font-bold text-slate-500 cursor-pointer select-none hover:bg-slate-100 transition-colors">
                        Raw Provider Verification Blob ↓
                      </summary>
                      <pre className="px-4 py-3 text-[10px] font-mono text-slate-600 overflow-x-auto max-h-64 leading-relaxed whitespace-pre-wrap break-words border-t border-slate-200">
                        {JSON.stringify(
                          drawerPayment.paystackVerification ?? drawerPayment.flutterwaveVerification,
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  )}
                </div>

                {/* Resolve Section */}
                <div className="px-6 pb-6">
                  <div className="border border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Hi2.HiOutlineWrenchScrewdriver className="w-4 h-4 text-[#FF9800]" />
                      <p className="text-sm font-bold text-slate-700">Admin Resolution</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Override the payment status if there is a discrepancy between the provider and our system records. All resolutions are logged in the audit trail.
                    </p>

                    {!resolveModalOpen ? (
                      <button
                        onClick={() => setResolveModalOpen(true)}
                        className="w-full py-2.5 text-xs font-bold bg-[#000666] hover:bg-[#000666]/90 text-white rounded-xl transition-all shadow-sm"
                      >
                        Resolve Payment Status
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                            Set Status To
                          </label>
                          <div className="flex gap-2">
                            {(["success", "failed"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => setResolveStatus(s)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${
                                  resolveStatus === s
                                    ? s === "success"
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-red-600 text-white border-red-600"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                            Reason / Note (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                            placeholder="e.g. Confirmed payment receipt via bank statement..."
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] resize-none bg-white placeholder-slate-400"
                          />
                        </div>

                        {resolveError && (
                          <p className="text-[11px] text-red-600 font-semibold">{resolveError}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setResolveModalOpen(false); setResolveNote(""); setResolveError(""); }}
                            className="flex-1 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleResolve}
                            disabled={resolving}
                            className="flex-1 py-2.5 text-xs font-bold bg-[#FF9800] hover:bg-[#FF9800]/90 text-white rounded-xl transition-all shadow-sm disabled:opacity-60"
                          >
                            {resolving ? "Resolving..." : "Confirm Resolution"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideInRight {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
