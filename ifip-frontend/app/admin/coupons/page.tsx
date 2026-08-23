"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineDocumentCheck,
  HiOutlineUserGroup,
  HiOutlineClipboardDocument,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlineChevronRight,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getAdminCouponById,
  Coupon,
} from "@/lib/api/services";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalRedemptions: 0,
  });

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form Fields
  const [formCode, setFormCode] = useState("");
  const [formDiscountPercent, setFormDiscountPercent] = useState<number | string>(100);
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formExpiredMessage, setFormExpiredMessage] = useState(
    "This promotional coupon code has expired. Please contact admissions for details."
  );
  const [formMaxUses, setFormMaxUses] = useState<number | string>("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Redemption Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCouponDetails, setSelectedCouponDetails] = useState<{ coupon: Coupon; redemptions: any[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Copy code state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getAdminCoupons({
        status: statusFilter,
        search: searchQuery,
        page,
        limit: 15,
      });
      setCoupons(data.coupons || []);
      setTotalPages(data.pages || 1);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load coupon codes.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode("");
    setFormDiscountPercent(100);

    // Default expiry 30 days from now
    const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tzOffset = defaultDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(defaultDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormExpiresAt(localISOTime);

    setFormExpiredMessage("This promotional coupon code has expired. Please contact admissions for details.");
    setFormMaxUses("");
    setFormIsActive(true);
    setModalError("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDiscountPercent(coupon.discountPercent);

    // Format date for datetime-local picker
    const expDate = new Date(coupon.expiresAt);
    const tzOffset = expDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(expDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormExpiresAt(localISOTime);

    setFormExpiredMessage(coupon.expiredMessage);
    setFormMaxUses(coupon.maxUses !== undefined && coupon.maxUses !== null ? coupon.maxUses : "");
    setFormIsActive(coupon.isActive);
    setModalError("");
    setModalOpen(true);
  };

  const handleGenerateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "IFIP-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormCode(result);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formCode || !formCode.trim()) {
      setModalError("Coupon code is required.");
      return;
    }

    const discountNum = Number(formDiscountPercent);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      setModalError("Discount percentage must be between 1 and 100.");
      return;
    }

    if (!formExpiresAt) {
      setModalError("Expiration date and time is required.");
      return;
    }

    if (!formExpiredMessage || !formExpiredMessage.trim()) {
      setModalError("Custom expired message is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: formCode.trim().toUpperCase(),
        discountPercent: discountNum,
        expiresAt: new Date(formExpiresAt).toISOString(),
        expiredMessage: formExpiredMessage.trim(),
        maxUses: formMaxUses !== "" ? Number(formMaxUses) : null,
        isActive: formIsActive,
      };

      if (editingCoupon) {
        await updateAdminCoupon(editingCoupon._id, payload);
        setSuccessMsg(`Coupon '${payload.code}' updated successfully.`);
      } else {
        await createAdminCoupon(payload);
        setSuccessMsg(`Coupon '${payload.code}' created successfully.`);
      }

      setModalOpen(false);
      fetchCoupons();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setModalError(err.message || "Failed to save coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      await deleteAdminCoupon(couponToDelete._id);
      setSuccessMsg(`Coupon '${couponToDelete.code}' deleted.`);
      setDeleteModalOpen(false);
      setCouponToDelete(null);
      fetchCoupons();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete coupon.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDetails = async (coupon: Coupon) => {
    setLoadingDetails(true);
    setDetailModalOpen(true);
    try {
      const data = await getAdminCouponById(coupon._id);
      setSelectedCouponDetails(data);
    } catch (err: any) {
      console.error("Failed to load coupon details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const isExpired = new Date(coupon.expiresAt) <= new Date();
    const isCapReached = coupon.maxUses !== undefined && coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

    if (!coupon.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Inactive
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <HiOutlineClock className="w-3.5 h-3.5" />
          Expired
        </span>
      );
    }

    if (isCapReached) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Cap Reached
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Active
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-1">
            <HiOutlineTag className="w-4 h-4 text-impact-orange" />
            <span>Financial Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-primary">
            Coupon Codes &amp; Waivers
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1 font-medium max-w-2xl">
            Configure promotional discount codes and 100% scholarship free passes. 100% waiver redemptions automatically bypass payment gateways and instantly finalize registrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCoupons()}
            disabled={loading}
            className="border border-outline-variant/40 hover:bg-slate-50 text-primary p-2.5 rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-sm"
            title="Refresh List"
          >
            <HiOutlineArrowPath className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-primary hover:bg-primary/95 text-white font-bold text-sm px-5 py-2.5 rounded-[6px] flex items-center gap-2 shadow-md hover-lift transition-all cursor-pointer whitespace-nowrap"
          >
            <HiOutlinePlus className="w-5 h-5" />
            <span>Create Coupon Code</span>
          </button>
        </div>
      </div>

      {/* Global Toast Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-fadeIn">
          <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-fadeIn">
          <HiOutlineXCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Coupons */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <HiOutlineTag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 block">Total Coupons</span>
            <span className="text-2xl font-display font-black text-primary">{summary.totalCoupons}</span>
          </div>
        </div>

        {/* Active Coupons */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <HiOutlineCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 block">Active Pools</span>
            <span className="text-2xl font-display font-black text-emerald-700">{summary.activeCoupons}</span>
          </div>
        </div>

        {/* Expired Coupons */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
            <HiOutlineClock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 block">Expired Codes</span>
            <span className="text-2xl font-display font-black text-amber-700">{summary.expiredCoupons}</span>
          </div>
        </div>

        {/* Total Redemptions */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600">
            <HiOutlineDocumentCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 block">Total Redemptions</span>
            <span className="text-2xl font-display font-black text-purple-800">{summary.totalRedemptions}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Container */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {(["all", "active", "expired", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === tab
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant/70 hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Real-time Code Search */}
        <div className="relative w-full md:w-80">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-on-surface-variant/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code (e.g. SCHOLAR)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full border border-outline-variant/40 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-primary uppercase font-mono bg-slate-50/50"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin"></div>
            <span className="text-xs font-semibold text-on-surface-variant">Loading coupon records...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <div className="p-4 rounded-full bg-slate-100 text-slate-400">
              <HiOutlineTag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-primary">No Coupons Found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm font-medium">
              No coupon records match your filter criteria. Click &quot;Create Coupon Code&quot; to define a new promotional code.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-outline-variant/20 text-[11px] font-bold text-on-surface-variant/80 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Coupon Code</th>
                  <th className="py-3.5 px-6">Discount Rate</th>
                  <th className="py-3.5 px-6">Expiration Timestamp</th>
                  <th className="py-3.5 px-6">Custom Expired Message</th>
                  <th className="py-3.5 px-6">Redemptions / Cap</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-xs font-medium">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiresAt) <= new Date();
                  return (
                    <tr key={coupon._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-6 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-primary border border-slate-200 px-3 py-1 rounded-md tracking-wider text-xs font-bold uppercase">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="text-slate-400 hover:text-primary transition-colors p-1 cursor-pointer"
                            title="Copy code to clipboard"
                          >
                            {copiedCode === coupon.code ? (
                              <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                            ) : (
                              <HiOutlineClipboardDocument className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount Rate */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            coupon.discountPercent === 100
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {coupon.discountPercent === 100 ? "100% Off (Free Waiver)" : `-${coupon.discountPercent}% Off`}
                        </span>
                      </td>

                      {/* Expiration Date */}
                      <td className="py-4 px-6 text-on-surface-variant font-sans">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">
                            {new Date(coupon.expiresAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-[11px] text-on-surface-variant/70">
                            {new Date(coupon.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>

                      {/* Expired Message Preview */}
                      <td className="py-4 px-6 text-on-surface-variant max-w-xs font-sans">
                        <span className="truncate block text-xs" title={coupon.expiredMessage}>
                          {coupon.expiredMessage}
                        </span>
                      </td>

                      {/* Usage Count / Cap */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary font-mono text-sm">
                            {coupon.usedCount}
                          </span>
                          <span className="text-on-surface-variant/60 text-xs">
                            / {coupon.maxUses !== undefined && coupon.maxUses !== null ? coupon.maxUses : "∞"}
                          </span>
                        </div>
                        {coupon.maxUses && (
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                coupon.usedCount >= coupon.maxUses ? "bg-purple-600" : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">{getStatusBadge(coupon)}</td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetails(coupon)}
                            className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-colors cursor-pointer"
                            title="View Redemptions"
                          >
                            <HiOutlineDocumentCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(coupon)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Edit Parameters"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCouponToDelete(coupon);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Delete Coupon"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-slate-50 text-xs font-semibold">
            <span className="text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-outline-variant/40 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-outline-variant/40 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-6">
              <h2 className="text-lg font-display font-bold text-primary">
                {editingCoupon ? "Edit Coupon Code" : "Create New Coupon Code"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-primary p-1"
              >
                <HiOutlineXMark className="w-6 h-6" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-semibold mb-4 flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="flex flex-col gap-5 text-left font-sans">
              {/* Coupon Code Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase text-primary">Coupon Code</label>
                  {!editingCoupon && (
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      Auto-Generate Code
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. SCHOLAR100"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-primary bg-slate-50/50"
                />
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="text-xs font-bold uppercase text-primary block mb-1.5">
                  Discount Percentage (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formDiscountPercent}
                    onChange={(e) => setFormDiscountPercent(e.target.value)}
                    className="w-32 border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary bg-slate-50/50"
                  />
                  <span className="text-xs text-on-surface-variant font-medium">
                    {Number(formDiscountPercent) === 100
                      ? "⚡ 100% Discount = Bypasses Flutterwave completely"
                      : `Applies a ${formDiscountPercent}% reduction to the levy fee`}
                  </span>
                </div>
              </div>

              {/* Expiration Datetime */}
              <div>
                <label className="text-xs font-bold uppercase text-primary block mb-1.5">
                  Expiration Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-primary bg-slate-50/50"
                />
              </div>

              {/* Custom Expired Error Message */}
              <div>
                <label className="text-xs font-bold uppercase text-primary block mb-1.5">
                  Custom Expired Error Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Message displayed to applicant when attempting to redeem an expired code..."
                  value={formExpiredMessage}
                  onChange={(e) => setFormExpiredMessage(e.target.value)}
                  className="w-full border border-outline-variant/40 rounded-xl p-3.5 text-xs font-medium focus:outline-none focus:border-primary bg-slate-50/50"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  * Displayed directly to applicants if redemption is attempted after the expiration timestamp.
                </span>
              </div>

              {/* Max Uses Pool Cap */}
              <div>
                <label className="text-xs font-bold uppercase text-primary block mb-1.5">
                  Usage Cap / Max Redemptions (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited redemptions"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  className="w-full border border-outline-variant/40 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-primary bg-slate-50/50"
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                <div>
                  <span className="text-xs font-bold text-primary block">Active Status</span>
                  <span className="text-[11px] text-on-surface-variant/70">
                    Enable or disable coupon redemption immediately
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-colors disabled:bg-slate-300 shadow-md cursor-pointer"
                >
                  {submitting ? "Saving..." : editingCoupon ? "Save Changes" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && couponToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <HiOutlineExclamationTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-primary mb-2">Delete Coupon Code?</h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6">
              Are you sure you want to permanently delete coupon code <span className="font-mono font-bold text-primary">{couponToDelete.code}</span>? Applicants will no longer be able to validate or apply this discount code.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:bg-slate-300 cursor-pointer shadow-md"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDEMPTION DETAILS DRAWER / MODAL */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-outline-variant/30 animate-fadeIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-primary">Coupon Redemption History</h3>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded uppercase mt-1 inline-block">
                  {selectedCouponDetails?.coupon.code}
                </span>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-primary p-1"
              >
                <HiOutlineXMark className="w-6 h-6" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center text-xs font-semibold text-on-surface-variant">
                Loading redemption records...
              </div>
            ) : !selectedCouponDetails?.redemptions || selectedCouponDetails.redemptions.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-on-surface-variant">
                No redemptions recorded for this coupon code yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Successful Redemptions ({selectedCouponDetails.redemptions.length})
                </span>
                <div className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-xl overflow-hidden">
                  {selectedCouponDetails.redemptions.map((red: any) => (
                    <div key={red._id} className="p-3.5 bg-slate-50/50 flex items-center justify-between text-xs font-sans">
                      <div>
                        <span className="font-bold text-primary block">{red.applicantId?.fullName || "Applicant"}</span>
                        <span className="text-on-surface-variant/70 text-[11px] block">{red.applicantId?.email}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-emerald-700 block">
                          {red.amount === 0 ? "100% Waiver (Free)" : `${red.currency} ${red.amount / 100}`}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 block">
                          {new Date(red.createdAt).toLocaleDateString()} {new Date(red.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
