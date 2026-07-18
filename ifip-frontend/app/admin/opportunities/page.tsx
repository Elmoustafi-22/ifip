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
  adminGetOpportunities,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminDeleteOpportunity,
  adminReorderOpportunities,
  PlacementOpportunity
} from "@/lib/api/services";
import * as TbIcons from "react-icons/tb";

const POPULAR_ICONS = [
  { name: "TbActivity", label: "Activity / Chart (Finance)" },
  { name: "TbScale", label: "Scale / Law (Shariah / Legal)" },
  { name: "TbBriefcase", label: "Briefcase (Business / Strategy)" },
  { name: "TbUserCog", label: "User / Gear (Client Services / HR)" },
  { name: "TbMessage", label: "Message (Marketing)" },
  { name: "TbWriting", label: "Writing (Content / Media)" },
  { name: "TbSearch", label: "Search (Research / Policy)" },
  { name: "TbDeviceLaptop", label: "Laptop (Technology / Product)" },
  { name: "TbHeartHandshake", label: "Handshake (Events / Community)" },
  { name: "TbAward", label: "Award (Achievements / Quality)" }
];

export default function AdminOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<PlacementOpportunity | null>(null);

  const [category, setCategory] = useState("");
  const [rolesInput, setRolesInput] = useState("");
  const [icon, setIcon] = useState("TbBriefcase");
  const [order, setOrder] = useState("");

  // Delete confirm state
  const [deletingOpportunity, setDeletingOpportunity] = useState<PlacementOpportunity | null>(null);

  // Message notifications
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const data = await adminGetOpportunities();
      setOpportunities(data);
    } catch (err) {
      console.error("Failed to load opportunities:", err);
      showAlert("error", "Failed to fetch opportunities from system.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const openCreateModal = () => {
    setEditingOpportunity(null);
    setCategory("");
    setRolesInput("");
    setIcon("TbBriefcase");
    setOrder("");
    setModalOpen(true);
  };

  const openEditModal = (opp: PlacementOpportunity) => {
    setEditingOpportunity(opp);
    setCategory(opp.category);
    setRolesInput(opp.roles.join(", "));
    setIcon(opp.icon);
    setOrder(String(opp.order));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !rolesInput.trim()) return;

    setSubmitting(true);
    try {
      const orderVal = order !== "" ? Number(order) : opportunities.length;
      // Parse roles from comma-separated input
      const rolesArray = rolesInput
        .split(",")
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const payload = {
        category: category.trim(),
        roles: rolesArray,
        icon: icon.trim(),
        order: orderVal
      };

      if (editingOpportunity) {
        await adminUpdateOpportunity(editingOpportunity._id!, payload);
        showAlert("success", `Category "${category}" updated successfully.`);
      } else {
        await adminCreateOpportunity(payload);
        showAlert("success", `Category "${category}" created successfully.`);
      }

      setModalOpen(false);
      fetchOpportunities();
    } catch (err: any) {
      console.error(err);
      showAlert("error", err?.response?.data?.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOpportunity) return;

    setSubmitting(true);
    try {
      await adminDeleteOpportunity(deletingOpportunity._id!);
      showAlert("success", `Category "${deletingOpportunity.category}" deleted.`);
      setDeletingOpportunity(null);
      fetchOpportunities();
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to delete category.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActiveStatus = async (opp: PlacementOpportunity) => {
    try {
      const updated = await adminUpdateOpportunity(opp._id!, {
        isActive: !opp.isActive
      });
      setOpportunities(prev => prev.map(o => o._id === opp._id ? updated : o));
      showAlert("success", `Category visibility updated for "${opp.category}".`);
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to update category status.");
    }
  };

  const moveOpportunity = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= opportunities.length) return;

    const list = [...opportunities];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updates = list.map((item, idx) => ({
      id: item._id!,
      order: idx
    }));

    setOpportunities(list);

    try {
      await adminReorderOpportunities(updates);
    } catch (err) {
      console.error("Reordering failed:", err);
      showAlert("error", "Failed to save category order.");
      fetchOpportunities();
    }
  };

  // Helper to render icon preview
  const renderIcon = (iconName: string) => {
    const IconComponent = (TbIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
    return <TbIcons.TbBriefcase className="w-5 h-5" />;
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Return to cockpit */}
      <div className="mb-2">
        <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
          ← Return to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-8 h-8 text-[#FF9800]" /> Opportunities Editor
          </h1>
          <p className="text-slate-500 text-sm">
            Configure internship pathways and opportunity categories displayed on the landing page.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <HiOutlinePlus className="w-4.5 h-4.5" /> Add Category
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

      {/* Main categories listing card */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-level1 overflow-hidden">
        <div className="border-b border-[#E7E2D8] px-6 py-4 bg-[#FDFBF7] flex justify-between items-center">
          <h3 className="font-bold text-[#000666] text-sm uppercase tracking-wider">
            Opportunities Grid
          </h3>
          <span className="text-xs bg-[#000666]/5 text-[#000666] font-bold px-2.5 py-1 rounded-full border border-[#000666]/10">
            {opportunities.length} {opportunities.length === 1 ? "Category" : "Categories"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <svg className="animate-spin w-8 h-8 text-[#000666] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-slate-400 font-medium">Loading pathways...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No opportunities configured. Click "Add Category" to get started.
          </div>
        ) : (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-level1 overflow-hidden">
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E7E2D8] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3.5 px-6 w-16">Sort</th>
                    <th className="py-3.5 px-6 w-16">Icon</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Roles / Opportunities</th>
                    <th className="py-3.5 px-6 w-32">Status</th>
                    <th className="py-3.5 px-6 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8] text-sm">
                  {opportunities.map((opp, index) => (
                    <tr
                      key={opp._id}
                      className={`hover:bg-slate-50/40 transition-colors ${
                        opp.isActive ? "" : "bg-slate-50/20 text-slate-400"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moveOpportunity(index, "up")}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <HiOutlineArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveOpportunity(index, "down")}
                            disabled={index === opportunities.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <HiOutlineArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary w-fit">
                          {renderIcon(opp.icon)}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#000666]">
                        {opp.category}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-lg">
                          {opp.roles.map((role, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                opp.isActive
                                  ? "bg-primary/5 text-primary border border-primary/10"
                                  : "bg-slate-100 text-slate-400 border border-slate-200/40"
                              }`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleActiveStatus(opp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                            opp.isActive
                              ? "bg-emerald-55/10 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {opp.isActive ? (
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
                            onClick={() => openEditModal(opp)}
                            className="p-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                            title="Edit"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingOpportunity(opp)}
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
              {opportunities.map((opp, index) => (
                <div
                  key={opp._id}
                  className={`p-4 space-y-3 transition-colors ${
                    opp.isActive ? "bg-white" : "bg-slate-50/20 text-slate-400"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                        {renderIcon(opp.icon)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#000666] text-sm">{opp.category}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActiveStatus(opp)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                        opp.isActive
                          ? "bg-emerald-55/10 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-550 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {opp.isActive ? (
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

                  <div className="flex flex-wrap gap-1">
                    {opp.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          opp.isActive
                            ? "bg-primary/5 text-primary border border-primary/10"
                            : "bg-slate-100 text-slate-400 border border-slate-200/40"
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveOpportunity(index, "up")}
                        disabled={index === 0}
                        className="p-1 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <HiOutlineArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveOpportunity(index, "down")}
                        disabled={index === opportunities.length - 1}
                        className="p-1 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <HiOutlineArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(opp)}
                        className="p-1.5 border border-slate-200 hover:border-slate-350 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingOpportunity(opp)}
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

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] sm:max-h-none overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#000666] text-lg font-display">
                {editingOpportunity ? "Edit Category" : "Add Opportunity Category"}
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
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Category Name *</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Shariah Audit & Advisory"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Associated Roles (Comma-separated) *</label>
                <textarea
                  required
                  value={rolesInput}
                  onChange={e => setRolesInput(e.target.value)}
                  placeholder="e.g. Shariah Auditor Intern, Compliance Intern, Audit Assistant"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666] resize-none"
                />
                <span className="text-[10px] text-slate-400 leading-normal">
                  Write individual role listings separated by a comma. (e.g. Role A, Role B)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Display Icon *</label>
                  <select
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                  >
                    {POPULAR_ICONS.map(i => (
                      <option key={i.name} value={i.name}>
                        {i.label} ({i.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Sort Weight (Order)</label>
                <input
                  type="number"
                  value={order}
                  onChange={e => setOrder(e.target.value)}
                  placeholder={`Defaults to end of list (${opportunities.length})`}
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
      {deletingOpportunity && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <HiOutlineExclamationTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#000666] text-lg font-display">Delete Category Pathway?</h4>
              <p className="text-slate-400 text-xs leading-relaxed mt-2">
                Deleting <strong className="text-slate-600 font-bold">"{deletingOpportunity.category}"</strong> will remove it and all of its associated roles from the public placement opportunities directory.
              </p>
            </div>

            <div className="flex justify-stretch gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeletingOpportunity(null)}
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
