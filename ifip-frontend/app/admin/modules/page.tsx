"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { 
  HiOutlineBookOpen, 
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineAcademicCap,
  HiOutlineClock
} from "react-icons/hi2";
import { 
  getLMSModules, 
  createLMSModule, 
  updateLMSModule, 
  deleteLMSModule, 
  LMSModule 
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

export default function AdminModulesPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<LMSModule | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(1);
  const [contentType, setContentType] = useState("video");
  const [contentUrl, setContentUrl] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState(15);
  const [moduleCohortId, setModuleCohortId] = useState("");
  
  const [submitting, setSubmitting] = useState(false);

  const fetchModules = async () => {
    try {
      const data = await getLMSModules();
      // Sort modules by display order
      const sorted = data.sort((a, b) => a.order - b.order);
      setModules(sorted);
    } catch (err) {
      console.error("Failed to load LMS coursework:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenCreate = () => {
    setEditingModule(null);
    setTitle("");
    setDescription("");
    setOrder(modules.length > 0 ? modules[modules.length - 1].order + 1 : 1);
    setContentType("video");
    setContentUrl("");
    setBody("");
    setDuration(15);
    setModuleCohortId((selectedCohortId === "unassigned") ? "" : selectedCohortId);
    setModalOpen(true);
  };

  const handleOpenEdit = (mod: LMSModule) => {
    setEditingModule(mod);
    setTitle(mod.title);
    setDescription(mod.description);
    setOrder(mod.order);
    setContentType(mod.contentType);
    setContentUrl(mod.contentUrl || "");
    setBody(mod.body || "");
    setDuration(mod.estimatedDuration || 15);
    setModuleCohortId((mod as any).cohortId || "");
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this training module? This action is irreversible.")) return;
    try {
      await deleteLMSModule(id);
      alert("Module deleted successfully.");
      fetchModules();
    } catch (err) {
      console.error("Failed to delete module:", err);
      alert("Failed to delete module.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
    const payload = {
      title,
      description,
      order: Number(order),
      contentType,
      contentUrl: contentUrl || undefined,
      body: body || undefined,
      estimatedDuration: Number(duration),
      cohortId: moduleCohortId || undefined
    };

    try {
      if (editingModule) {
        await updateLMSModule(editingModule._id, payload);
        alert("Module updated successfully.");
      } else {
        await createLMSModule(payload);
        alert("New training module added successfully.");
      }
      setModalOpen(false);
      fetchModules();
    } catch (err) {
      console.error("Failed to save module details:", err);
      alert("Failed to save module. Please verify display order is unique.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening modules dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
              &larr; Back to Ops Cockpit
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineBookOpen className="w-8 h-8 text-[#FF9800]" /> Curriculum Coursework Editor
          </h1>
          <p className="text-slate-500 text-sm">Create, edit, and structure the learning modules and knowledge check materials.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleOpenCreate}
            className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Create Learning Module
          </button>
        </div>
      </div>

      {/* Modules Table List */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Lesson & Type</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Assigned Cohort</th>
                <th className="px-6 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No coursework modules configured. Click "Create Learning Module" to begin.
                  </td>
                </tr>
              ) : (
                modules.map((mod) => (
                  <tr key={mod._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-[#000666]">
                      {mod.order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#000666]">{mod.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-xs">
                        <span className="bg-slate-100 text-slate-600 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                          {mod.contentType}
                        </span>
                        <span>{mod.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <HiOutlineClock className="w-4 h-4 text-slate-400" />
                        {mod.estimatedDuration} mins
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(mod as any).cohortId ? (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                          {cohorts.find(c => c._id === (mod as any).cohortId)?.name || "Cohort Linked"}
                        </span>
                      ) : (
                        <span className="bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded">
                          Global (All Cohorts)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEdit(mod)}
                        className="text-[#00B0FF] hover:text-[#00B0FF]/80 inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(mod._id)}
                        className="text-rose-500 hover:text-rose-600 inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <HiOutlineTrash className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coursework Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <HiOutlineAcademicCap className="w-5 h-5 text-[#FF9800]" /> 
                {editingModule ? "Edit Coursework Module" : "Create Coursework Module"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Module Title / Lesson Header
                  </label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 1. Foundations of Islamic Economics"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Display Order Sequence (Unique number)
                  </label>
                  <input 
                    type="number" 
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                    required
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Short Description
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Insert curriculum description summary..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs h-16 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs"
                    required
                  >
                    <option value="video">Video Lecture</option>
                    <option value="text">Text/Markdown Document</option>
                    <option value="quiz">Knowledge Check Quiz</option>
                    <option value="assignment">Practical Project Submission</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Duration (Minutes)
                  </label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                    required
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Linked Cohort Scope (Optional)
                  </label>
                  <select
                    value={moduleCohortId}
                    onChange={(e) => setModuleCohortId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs"
                  >
                    <option value="">Global Module (All Intakes)</option>
                    {cohorts.map((cohort) => (
                      <option key={cohort._id} value={cohort._id}>
                        {cohort.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {contentType === "video" && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Video Embed URL
                  </label>
                  <input 
                    type="url" 
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                    required={contentType === "video"}
                  />
                </div>
              )}

              {(contentType === "text" || contentType === "quiz" || contentType === "assignment") && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Curriculum Text Body / Task Description
                  </label>
                  <textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Insert study descriptions, markdown articles, or task parameters..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs h-32 bg-white"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  {submitting ? "Saving..." : "Confirm Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
