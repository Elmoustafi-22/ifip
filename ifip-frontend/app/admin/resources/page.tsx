"use client";

import { useState, useEffect, useContext } from "react";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineDocumentText,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineLink,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlinePlayCircle,
  HiOutlineVideoCamera,
  HiOutlineArrowUpTray,
  HiOutlineArrowPath,
  HiOutlineDocumentCheck,
} from "react-icons/hi2";
import {
  getResources,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceFileAuth,
  Resource,
  CreateResourcePayload,
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

const CATEGORY_OPTIONS = ["guidelines", "templates", "supplements"] as const;
const FILE_TYPE_OPTIONS = ["pdf", "docx", "xlsx", "link", "video", "other"] as const;

type Category = (typeof CATEGORY_OPTIONS)[number];

interface Toast {
  type: "success" | "error";
  message: string;
}

const EMPTY_FORM: CreateResourcePayload = {
  title: "",
  description: "",
  category: "guidelines",
  fileUrl: "",
  fileType: "pdf",
  fileSize: "",
};

export default function AdminResourcesPage() {
  const { selectedCohortId } = useContext(AdminCohortContext);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | Category>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Resource | null>(null);
  const [form, setForm] = useState<CreateResourcePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadedResourceName, setUploadedResourceName] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCohortId) params.cohortId = selectedCohortId;
      const res = await getResources(params as any);
      setResources(res);
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCohortId]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, cohortId: selectedCohortId || undefined });
    setUploadedResourceName(null);
    setModalOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditTarget(r);
    setForm({
      title: r.title,
      description: r.description || "",
      category: r.category,
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      fileSize: r.fileSize || "",
      cohortId: r.cohortId || undefined,
    });
    setUploadedResourceName(null);
    setModalOpen(true);
  };

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResource(true);
    try {
      const result = await uploadResourceFileAuth(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const autoFileType = ext === 'pdf' ? 'pdf' : ext === 'docx' || ext === 'doc' ? 'docx' : ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'other';

      setForm((f) => ({
        ...f,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize || f.fileSize,
        fileType: autoFileType as any,
      }));
      setUploadedResourceName(file.name);
      showToast("success", "File uploaded successfully!");
    } catch (err: any) {
      console.error("Resource upload failed:", err);
      showToast("error", err?.response?.data?.message || err?.message || "File upload failed.");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showToast("error", "Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await updateResource(editTarget._id, form);
        showToast("success", "Resource updated successfully.");
      } else {
        await createResource(form);
        showToast("success", "Resource published successfully.");
      }
      setModalOpen(false);
      await fetchResources();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteResource(deleteTarget._id);
      showToast("success", "Resource deleted.");
      setDeleteTarget(null);
      await fetchResources();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "guidelines": return { icon: "academic" };
      case "templates": return { icon: "doc" };
      default: return { icon: "book" };
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "guidelines": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "templates": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  const getFileBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      pdf: "bg-red-50 text-rose-700 border-red-100",
      docx: "bg-sky-50 text-sky-700 border-sky-100",
      xlsx: "bg-emerald-50 text-emerald-700 border-emerald-100",
      link: "bg-purple-50 text-purple-700 border-purple-100",
      video: "bg-orange-50 text-orange-700 border-orange-200",
      other: "bg-slate-50 text-slate-600 border-slate-200",
    };
    return colors[type] || colors.other;
  };

  const filtered = resources.filter((r) => {
    const matchCat = activeTab === "all" || r.category === activeTab;
    const matchSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#000666] tracking-tight">Resource Library</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage and publish resources for participants — guidelines, templates, and supplements.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#000666] hover:bg-[#000666]/90 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Resource
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", count: resources.length, color: "text-[#000666]" },
          { label: "Guidelines", count: resources.filter((r) => r.category === "guidelines").length, color: "text-indigo-600" },
          { label: "Templates", count: resources.filter((r) => r.category === "templates").length, color: "text-amber-600" },
          { label: "Supplements", count: resources.filter((r) => r.category === "supplements").length, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-5">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-700"
          />
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] uppercase font-bold gap-1">
          {(["all", ...CATEGORY_OPTIONS] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === tab ? "bg-[#000666] text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 font-medium">Loading resources…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-20 text-center">
          <HiOutlineArrowTopRightOnSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No resources found.</p>
          <p className="text-slate-300 text-xs mt-1">Upload the first resource using the button above.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Type / Size</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Uploaded By</th>
                <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800 leading-tight line-clamp-1">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.description}</p>
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 hover:underline ${
                          r.fileType === "video" ? "text-orange-500" : "text-[#00B0FF]"
                        }`}
                      >
                        {r.fileType === "video" ? (
                          <HiOutlinePlayCircle className="w-3 h-3" />
                        ) : r.fileType === "link" ? (
                          <HiOutlineLink className="w-3 h-3" />
                        ) : (
                          <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                        )}
                        {r.fileType === "video" ? "Watch Recording" : r.fileType === "link" ? "Open Link" : "View File"}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getCategoryColor(r.category)}`}>
                      {r.category === "guidelines" && <HiOutlineAcademicCap className="w-3 h-3" />}
                      {r.category === "templates" && <HiOutlineDocumentText className="w-3 h-3" />}
                      {r.category === "supplements" && <HiOutlineBookOpen className="w-3 h-3" />}
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getFileBadgeColor(r.fileType)}`}>
                        {r.fileType}
                      </span>
                      {r.fileSize && <span className="text-[10px] text-slate-400 font-bold">{r.fileSize}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">
                      {(r.uploadedBy as any)?.fullName || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-[#000666] hover:text-white text-slate-600 transition-all cursor-pointer"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white text-slate-600 transition-all cursor-pointer"
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
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-[#000666]">
                {editTarget ? "Edit Resource" : "Add New Resource"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. AAOIFI Shari'ah Standards Guide"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of what this resource contains…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800 bg-white"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">File Type</label>
                  <select
                    value={form.fileType}
                    onChange={(e) => setForm((f) => ({ ...f, fileType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800 bg-white"
                  >
                    {FILE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Upload PDF or Document File <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-[#000666]/40 rounded-xl p-3.5 transition-all bg-slate-50/50 text-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.doc,.ppt,.pptx,.png,.jpg,.jpeg"
                    onChange={handleResourceFileUpload}
                    disabled={uploadingResource}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1 pointer-events-none">
                    {uploadingResource ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#000666]">
                        <HiOutlineArrowPath className="w-4 h-4 animate-spin text-[#FF9800]" />
                        <span>Uploading resource file...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full bg-sky-50 text-[#000666] flex items-center justify-center border border-sky-100 mx-auto">
                          <HiOutlineArrowUpTray className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          {uploadedResourceName ? `Uploaded: ${uploadedResourceName}` : "Click or drag a PDF or document here to upload"}
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, DOCX, XLSX up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {form.fileType === "video"
                    ? "Video / Recording URL"
                    : form.fileType === "link"
                    ? "External Link URL"
                    : "File URL"}{" "}
                  <span className="text-slate-400 font-normal">(optional if file uploaded)</span>
                </label>
                {form.fileType === "video" && (
                  <div className="flex items-center gap-2 mb-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <HiOutlineVideoCamera className="w-4 h-4 text-orange-500 shrink-0" />
                    <p className="text-[11px] text-orange-700 font-semibold">
                      Paste a YouTube, Google Drive, Zoom or any public video recording link.
                    </p>
                  </div>
                )}
                <input
                  value={form.fileUrl}
                  onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                  placeholder={
                    form.fileType === "video"
                      ? "https://youtube.com/watch?v=... or https://drive.google.com/..."
                      : form.fileType === "link"
                      ? "https://example.com/resource"
                      : "https://cdn.example.com/file.pdf"
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {form.fileType === "video"
                    ? "Participants will see a 'Watch Recording' button linking directly to the session."
                    : "Paste a direct URL to the file (Google Drive public link, CDN, S3, etc.)"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">File Size <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  value={form.fileSize}
                  onChange={(e) => setForm((f) => ({ ...f, fileSize: e.target.value }))}
                  placeholder="e.g. 4.2 MB"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-[#000666] text-white text-sm font-bold rounded-xl disabled:opacity-60 cursor-pointer hover:bg-[#000666]/90 transition-colors"
              >
                {submitting ? "Saving…" : editTarget ? "Save Changes" : "Publish Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Delete Resource</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete{" "}
              <strong className="text-slate-800">{deleteTarget.title}</strong>?
              Participants will lose access immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 cursor-pointer transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
