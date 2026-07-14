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
  adminGetFormOptions,
  adminCreateFormOption,
  adminUpdateFormOption,
  adminDeleteFormOption,
  adminReorderFormOptions,
  FormOption
} from "@/lib/api/services";

type GroupKey = "placement_interests" | "academic_status" | "sector_tags";

interface TabConfig {
  key: GroupKey;
  label: string;
  desc: string;
}

const TABS: TabConfig[] = [
  {
    key: "placement_interests",
    label: "Placement Interests",
    desc: "Available career focus areas shown to candidates on Step 4 of the application and settings."
  },
  {
    key: "academic_status",
    label: "Academic Status",
    desc: "Available academic levels shown to candidates on Step 3 of the application and settings."
  },
  {
    key: "sector_tags",
    label: "Sector Tags",
    desc: "Business categories/industries shown to organizations applying to be placement partners."
  }
];

export default function AdminFormOptionsPage() {
  const [activeTab, setActiveTab] = useState<GroupKey>("placement_interests");
  const [options, setOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New option form state
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newOrder, setNewOrder] = useState("");

  // Edit modal state
  const [editingOption, setEditingOption] = useState<FormOption | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete confirm modal state
  const [deletingOption, setDeletingOption] = useState<FormOption | null>(null);

  // Message notifications
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const data = await adminGetFormOptions(activeTab);
      setOptions(data);
    } catch (err) {
      console.error("Failed to load options:", err);
      showAlert("error", "Failed to load form options from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [activeTab]);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setSubmitting(true);
    try {
      const orderVal = newOrder !== "" ? Number(newOrder) : options.length;
      await adminCreateFormOption({
        group: activeTab,
        label: newLabel.trim(),
        value: newValue.trim() || undefined,
        order: orderVal
      });

      showAlert("success", `Option "${newLabel}" created successfully.`);
      setNewLabel("");
      setNewValue("");
      setNewOrder("");
      fetchOptions();
    } catch (err: any) {
      console.error(err);
      showAlert("error", err?.response?.data?.message || "Failed to create option.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOption || !editLabel.trim() || !editValue.trim()) return;

    setSubmitting(true);
    try {
      await adminUpdateFormOption(editingOption._id!, {
        label: editLabel.trim(),
        value: editValue.trim(),
        order: Number(editOrder),
        isActive: editIsActive
      });

      showAlert("success", "Option details updated successfully.");
      setEditingOption(null);
      fetchOptions();
    } catch (err: any) {
      console.error(err);
      showAlert("error", err?.response?.data?.message || "Failed to update option.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOption) return;

    setSubmitting(true);
    try {
      await adminDeleteFormOption(deletingOption._id!);
      showAlert("success", `Option "${deletingOption.label}" hard deleted.`);
      setDeletingOption(null);
      fetchOptions();
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to delete option.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActiveStatus = async (option: FormOption) => {
    try {
      const updated = await adminUpdateFormOption(option._id!, {
        isActive: !option.isActive
      });
      setOptions(prev => prev.map(o => o._id === option._id ? updated : o));
      showAlert("success", `Option "${option.label}" status updated.`);
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to update option status.");
    }
  };

  const moveOption = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const list = [...options];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Build the bulk-reorder update array
    const updates = list.map((item, idx) => ({
      id: item._id!,
      order: idx
    }));

    // Optimistically update UI
    setOptions(list);

    try {
      await adminReorderFormOptions(updates);
    } catch (err) {
      console.error("Reordering failed:", err);
      showAlert("error", "Failed to save new order in database.");
      fetchOptions(); // revert to database state
    }
  };

  const openEditModal = (opt: FormOption) => {
    setEditingOption(opt);
    setEditLabel(opt.label);
    setEditValue(opt.value);
    setEditOrder(String(opt.order));
    setEditIsActive(opt.isActive);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Back link */}
      <div className="mb-2">
        <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
          ← Return to Cockpit
        </Link>
      </div>

      {/* Heading Block */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-8 h-8 text-[#FF9800]" /> Dynamic Form Options
          </h1>
          <p className="text-slate-500 text-sm">
            Configure dropdown menus and checkbox listings dynamically without rebuilding or redeploying code.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#E7E2D8] mb-6 gap-2 sm:gap-4 overflow-x-auto select-none">
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-4 px-1 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "border-[#000666] text-[#000666]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Alert toast notification */}
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

      {/* Tab description panel */}
      <div className="bg-white border border-[#E7E2D8] rounded-xl px-5 py-4 mb-6 text-xs text-slate-500 leading-relaxed shadow-sm">
        {TABS.find(t => t.key === activeTab)?.desc}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main List Column */}
        <div className="lg:col-span-2 bg-white border border-[#E7E2D8] rounded-2xl shadow-level1 overflow-hidden">
          <div className="border-b border-[#E7E2D8] px-6 py-4 bg-[#FDFBF7] flex justify-between items-center">
            <h3 className="font-bold text-[#000666] text-sm uppercase tracking-wider">
              {TABS.find(t => t.key === activeTab)?.label} List
            </h3>
            <span className="text-xs bg-[#000666]/5 text-[#000666] font-bold px-2.5 py-1 rounded-full border border-[#000666]/10">
              {options.length} {options.length === 1 ? "Option" : "Options"}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <svg className="animate-spin w-6 h-6 text-[#000666] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-slate-400 font-medium">Fetching options from DB...</p>
            </div>
          ) : options.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No options configured in this group yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E7E2D8]">
              {options.map((opt, index) => (
                <div
                  key={opt._id}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    opt.isActive ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {/* Action buttons for reordering */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveOption(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Up"
                      >
                        <HiOutlineArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveOption(index, "down")}
                        disabled={index === options.length - 1}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Down"
                      >
                        <HiOutlineArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${opt.isActive ? "text-[#000666]" : "text-slate-400 line-through"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tight truncate">
                        val: {opt.value} &bull; order: {opt.order}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Active toggle button */}
                    <button
                      onClick={() => toggleActiveStatus(opt)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                        opt.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                      title={opt.isActive ? "Set Inactive" : "Set Active"}
                    >
                      {opt.isActive ? (
                        <>
                          <HiOutlineEye className="w-3.5 h-3.5" /> Active
                        </>
                      ) : (
                        <>
                          <HiOutlineEyeSlash className="w-3.5 h-3.5" /> Hidden
                        </>
                      )}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(opt)}
                      className="p-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer"
                      title="Edit Option"
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>

                    {/* Hard Delete button */}
                    <button
                      onClick={() => setDeletingOption(opt)}
                      className="p-2 border border-red-200 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                      title="Hard Delete"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Creation Panel */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-level1 flex flex-col gap-5 sticky top-24">
          <div>
            <h3 className="font-bold text-[#000666] text-base mb-1 font-display">Add Option</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Create a new choice to immediately add it to applicant dropdowns.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Label *</label>
              <input
                type="text"
                required
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Halal Advisory"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Value Override (Optional)</label>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="e.g. halal_advisory"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
              />
              <span className="text-[10px] text-slate-400 leading-tight">
                Used internally. If left blank, it is automatically derived from the label.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Order (Sort Weight)</label>
              <input
                type="number"
                value={newOrder}
                onChange={e => setNewOrder(e.target.value)}
                placeholder={`Defaults to end of list (${options.length})`}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !newLabel.trim()}
              className="w-full bg-[#000666] hover:bg-[#000555] disabled:bg-slate-200 text-white font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <HiOutlinePlus className="w-4 h-4" /> Add to List
            </button>
          </form>
        </div>
      </div>

      {/* Edit modal drawer */}
      {editingOption && (
        <div className="fixed inset-0 z-50 bg-[#000666]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#000666] text-lg font-display">Edit Option</h3>
              <button
                onClick={() => setEditingOption(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Label *</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Value *</label>
                <input
                  type="text"
                  required
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Order</label>
                  <input
                    type="number"
                    required
                    value={editOrder}
                    onChange={e => setEditOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Visibility</label>
                  <select
                    value={editIsActive ? "active" : "inactive"}
                    onChange={e => setEditIsActive(e.target.value === "active")}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#000666]"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Hidden (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingOption(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#000666] hover:bg-[#000555] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <HiOutlineCheck className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingOption && (
        <div className="fixed inset-0 z-50 bg-[#000666]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <HiOutlineExclamationTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#000666] text-lg font-display">Hard Delete Option?</h4>
              <p className="text-slate-400 text-xs leading-relaxed mt-2">
                Deleting <strong className="text-slate-600 font-bold">"{deletingOption.label}"</strong> will completely remove it. If this option is already used in existing records, a hard delete can break report views.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 text-left font-medium leading-normal mt-3">
                <strong>🔒 Recommendation:</strong> Use the eye icon or edit visibility to hide the option. This hides it from new applications while preserving history.
              </div>
            </div>

            <div className="flex justify-stretch gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeletingOption(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 text-xs font-bold cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Delete Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
