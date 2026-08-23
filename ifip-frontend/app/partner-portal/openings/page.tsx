"use client";

import { useEffect, useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineMapPin,
  HiOutlineBuildingOffice2,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getMyOpenings,
  addOpening,
  updateOpening,
  deleteOpening,
  PartnerOpening,
} from "@/lib/api/partner";

export default function PartnerOpeningsPage() {
  const [openings, setOpenings] = useState<PartnerOpening[]>([]);
  const [activeSlots, setActiveSlots] = useState<number>(5);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingOpening, setEditingOpening] = useState<PartnerOpening | null>(null);
  const [role, setRole] = useState("");
  const [mode, setMode] = useState<"Remote" | "Hybrid" | "On-site">("Remote");
  const [location, setLocation] = useState("");
  const [count, setCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchOpenings = async () => {
    try {
      const res = await getMyOpenings();
      setOpenings(res.openings || []);
      setActiveSlots(res.activeSlots || 5);
    } catch (err) {
      console.error("Failed to load openings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, []);

  const handleOpenAddModal = () => {
    setEditingOpening(null);
    setRole("");
    setMode("Remote");
    setLocation("");
    setCount(1);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEditModal = (op: PartnerOpening) => {
    setEditingOpening(op);
    setRole(op.role);
    setMode(op.mode);
    setLocation(op.location || "");
    setCount(op.count || 1);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) {
      setErrorMsg("Role title is required.");
      return;
    }
    if (["Hybrid", "On-site"].includes(mode) && !location.trim()) {
      setErrorMsg(`Location is required for ${mode} listings.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editingOpening && editingOpening._id) {
        await updateOpening(editingOpening._id, {
          role: role.trim(),
          mode,
          location: ["Hybrid", "On-site"].includes(mode) ? location.trim() : undefined,
          count: Number(count),
        });
      } else {
        await addOpening({
          role: role.trim(),
          mode,
          location: ["Hybrid", "On-site"].includes(mode) ? location.trim() : undefined,
          count: Number(count),
        });
      }
      setShowModal(false);
      await fetchOpenings();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save role listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteOpening(deleteTargetId);
      setDeleteTargetId(null);
      await fetchOpenings();
    } catch (err) {
      console.error("Failed to delete opening:", err);
    }
  };

  const totalPositionsCount = openings.reduce((acc, o) => acc + (o.count || 1), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineBriefcase className="w-6 h-6 text-emerald-600" />
            <span>Role Openings &amp; Placement Positions</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your organization&apos;s internship role listings. Candidates in the pool can view these openings.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>Add New Role Listing</span>
        </button>
      </div>

      {/* Slots Cap Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <HiOutlineBuildingOffice2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Admin Slot Allocation</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Total listing count: <strong className="text-slate-800 font-bold">{totalPositionsCount} position(s)</strong> across {openings.length} listing(s)
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto font-medium">
          IFIP Allocated Cap: <strong className="text-emerald-700 font-bold">{activeSlots} Slots</strong> (Admin Managed)
        </div>
      </div>

      {/* Openings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : openings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <HiOutlineBriefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Openings Listed</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click &quot;Add New Role Listing&quot; to publish internship opportunities for your organisation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openings.map((op) => (
            <div
              key={op._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-900">{op.role}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    op.mode === "Remote"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : op.mode === "Hybrid"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {op.mode}
                  </span>
                </div>

                <div className="mt-3 flex items-center space-x-4 text-xs text-slate-500">
                  {op.location && (
                    <span className="flex items-center space-x-1 font-medium">
                      <HiOutlineMapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{op.location}</span>
                    </span>
                  )}
                  <span className="font-medium text-slate-600">
                    Headcount: <strong className="text-emerald-700 font-bold">{op.count}</strong>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEditModal(op)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  <HiOutlinePencilSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Role</span>
                </button>
                {op._id && (
                  <button
                    onClick={() => setDeleteTargetId(op._id!)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineBriefcase className="w-5 h-5 text-emerald-600" />
                <span>{editingOpening ? "Edit Role Listing" : "Add Role Listing"}</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Islamic Finance Intern / Sukuk Analyst"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Headcount Needed</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {["Hybrid", "On-site"].includes(mode) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Office Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Victoria Island, Lagos"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlineTrash className="w-5 h-5 text-rose-600" />
                <span>Remove Role Listing</span>
              </h2>
              <button onClick={() => setDeleteTargetId(null)} className="text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this role listing? Candidates will no longer see this vacancy in your profile.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
