"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineCog6Tooth,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineEyeSlash
} from "react-icons/hi2";
import {
  adminGetActiveOpenings,
  adminCreateActiveOpening,
  adminUpdateActiveOpening,
  adminDeleteActiveOpening,
  adminReorderActiveOpenings,
  ActiveOpening
} from "@/lib/api/services";

export default function AdminOpeningsPage() {
  const [openings, setOpenings] = useState<ActiveOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal / Form fields state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpening, setEditingOpening] = useState<ActiveOpening | null>(null);
  
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "On-site">("Remote");
  const [location, setLocation] = useState("");
  const [order, setOrder] = useState("");

  // Delete confirm state
  const [deletingOpening, setDeletingOpening] = useState<ActiveOpening | null>(null);

  // Message notifications
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOpenings = async () => {
    try {
      setLoading(true);
      const data = await adminGetActiveOpenings();
      setOpenings(data);
    } catch (err) {
      console.error("Failed to load active openings:", err);
      showAlert("error", "Failed to fetch openings from system.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, []);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const openCreateModal = () => {
    setEditingOpening(null);
    setTitle("");
    setDepartment("");
    setWorkMode("Remote");
    setLocation("");
    setOrder("");
    setModalOpen(true);
  };

  const openEditModal = (opening: ActiveOpening) => {
    setEditingOpening(opening);
    setTitle(opening.title);
    setDepartment(opening.department);
    setWorkMode(opening.workMode);
    setLocation(opening.location);
    setOrder(String(opening.order));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !department.trim() || !location.trim()) return;

    setSubmitting(true);
    try {
      const orderVal = order !== "" ? Number(order) : openings.length;
      const payload = {
        title: title.trim(),
        department: department.trim(),
        workMode,
        location: location.trim(),
        order: orderVal
      };

      if (editingOpening) {
        await adminUpdateActiveOpening(editingOpening._id!, payload);
        showAlert("success", `Vacancy "${title}" updated successfully.`);
      } else {
        await adminCreateActiveOpening(payload);
        showAlert("success", `Vacancy "${title}" created successfully.`);
      }

      setModalOpen(false);
      fetchOpenings();
    } catch (err: any) {
      console.error(err);
      showAlert("error", err?.response?.data?.message || "Failed to save active opening.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOpening) return;

    setSubmitting(true);
    try {
      await adminDeleteActiveOpening(deletingOpening._id!);
      showAlert("success", `Vacancy "${deletingOpening.title}" deleted.`);
      setDeletingOpening(null);
      fetchOpenings();
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to delete vacancy.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActiveStatus = async (opening: ActiveOpening) => {
    try {
      const updated = await adminUpdateActiveOpening(opening._id!, {
        isActive: !opening.isActive
      });
      setOpenings(prev => prev.map(o => o._id === opening._id ? updated : o));
      showAlert("success", `Vacancy status updated for "${opening.title}".`);
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to toggle visibility.");
    }
  };

  const moveOpening = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= openings.length) return;

    const list = [...openings];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updates = list.map((item, idx) => ({
      id: item._id!,
      order: idx
    }));

    setOpenings(list);

    try {
      await adminReorderActiveOpenings(updates);
    } catch (err) {
      console.error("Reordering failed:", err);
      showAlert("error", "Failed to save display order.");
      fetchOpenings();
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Back button */}
      <div className="mb-2">
        <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
          ← Return to Cockpit
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-8 h-8 text-[#FF9800]" /> Active Openings Manager
          </h1>
          <p className="text-slate-500 text-sm">
            Manage placement positions and career pathway listings shown to public site visitors.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <HiOutlinePlus className="w-4.5 h-4.5" /> Add Opening
        </button>
      </div>

      {/* Alert toast notifications */}
      {alertMsg && (
        <div
          className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-bold transition-all animate-bounce ${
            alertMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {alertMsg.text}
        </div>
      )}

      {/* Main content table card */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-level1 overflow-hidden">
        <div className="border-b border-[#E7E2D8] px-6 py-4 bg-[#FDFBF7] flex justify-between items-center">
          <h3 className="font-bold text-[#000666] text-sm uppercase tracking-wider">
            Vacancy Listings
          </h3>
          <span className="text-xs bg-[#000666]/5 text-[#000666] font-bold px-2.5 py-1 rounded-full border border-[#000666]/10">
            {openings.length} {openings.length === 1 ? "Role" : "Roles"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <svg className="animate-spin w-8 h-8 text-[#000666] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-slate-400 font-medium">Loading listings...</p>
          </div>
        ) : openings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No active vacancies configured. Click "Add Opening" to create one.
          </div>
        ) : (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-level1 overflow-hidden">
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E7E2D8] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3.5 px-6 w-16">Sort</th>
                    <th className="py-3.5 px-6">Title</th>
                    <th className="py-3.5 px-6">Department</th>
                    <th className="py-3.5 px-6">Mode</th>
                    <th className="py-3.5 px-6">Location</th>
                    <th className="py-3.5 px-6 w-32">Status</th>
                    <th className="py-3.5 px-6 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8] text-sm">
                  {openings.map((opening, index) => (
                    <tr
                      key={opening._id}
                      className={`hover:bg-slate-50/40 transition-colors ${
                        opening.isActive ? "" : "bg-slate-50/20 text-slate-400"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moveOpening(index, "up")}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <HiOutlineArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveOpening(index, "down")}
                            disabled={index === openings.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <HiOutlineArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#000666]">
                        {opening.title}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {opening.department}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                            opening.workMode === "Remote"
                              ? "bg-sky-500/10 text-sky-600 border border-sky-200/20"
                              : opening.workMode === "Hybrid"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-200/20"
                          }`}
                        >
                          {opening.workMode}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-600">
                        {opening.location}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleActiveStatus(opening)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                            opening.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {opening.isActive ? (
                            <>
                              <HiOutlineEye className="w-3.5 h-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <HiOutlineEyeSlash className="w-3.5 h-3.5" /> Hidden
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(opening)}
                            className="p-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                            title="Edit"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingOpening(opening)}
                            className="p-2 border border-red-200 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                            title="Delete"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {openings.map((opening, index) => (
                <div
                  key={opening._id}
                  className={`p-4 space-y-3 transition-colors ${
                    opening.isActive ? "bg-white" : "bg-slate-50/20 text-slate-400"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-[#000666] text-sm">{opening.title}</h4>
                      <span className="text-slate-400 text-xs mt-1 block">{opening.department}</span>
                    </div>
                    <button
                      onClick={() => toggleActiveStatus(opening)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                        opening.isActive
                          ? "bg-emerald-55/10 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-550 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {opening.isActive ? (
                        <>
                          <HiOutlineEye className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <HiOutlineEyeSlash className="w-3 h-3" /> Hidden
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-550">
                    <span
                      className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                        opening.workMode === "Remote"
                          ? "bg-sky-500/10 text-sky-600 border border-sky-200/20"
                          : opening.workMode === "Hybrid"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-200/20"
                      }`}
                    >
                      {opening.workMode}
                    </span>
                    <span className="font-semibold text-slate-550">{opening.location}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveOpening(index, "up")}
                        disabled={index === 0}
                        className="p-1 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <HiOutlineArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveOpening(index, "down")}
                        disabled={index === openings.length - 1}
                        className="p-1 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <HiOutlineArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(opening)}
                        className="p-1.5 border border-slate-200 hover:border-slate-350 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingOpening(opening)}
                        className="p-1.5 border border-red-200 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                        title="Delete"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] sm:max-h-none overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#000666] text-lg font-display">
                {editingOpening ? "Edit Opening" : "Add Active Opening"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Position Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Digital Marketing Intern"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Department *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Marketing & Communications"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Work Mode *</label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Lagos, Kano, or Remote"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Sort Weight (Order)</label>
                <input
                  type="number"
                  value={order}
                  onChange={e => setOrder(e.target.value)}
                  placeholder={`Defaults to end of list (${openings.length})`}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#000666] hover:bg-[#000555] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <HiOutlineCheck className="w-4.5 h-4.5" /> Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingOpening && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <HiOutlineExclamationTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#000666] text-lg font-display">Delete Role Listing?</h4>
              <p className="text-slate-400 text-xs leading-relaxed mt-2">
                Deleting <strong className="text-slate-600 font-bold">"{deletingOpening.title}"</strong> will remove it from the public vacancies directory.
              </p>
            </div>

            <div className="flex justify-stretch gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeletingOpening(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
