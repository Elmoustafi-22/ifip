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
  HiOutlineFolder,
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

const CATEGORIES = [
  { value: "guidelines", label: "Guidelines & Standards", short: "Guidelines", dot: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50/80" },
  { value: "templates", label: "Templates & Worksheets", short: "Templates", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50/80" },
  { value: "supplements", label: "Supplemental Reading", short: "Supplemental", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50/80" },
  { value: "general", label: "General Reference", short: "General", dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100" },
];

const FILE_TYPE_OPTIONS = ["pdf", "pptx", "docx", "xlsx", "link", "video", "other"] as const;

interface Toast {
  type: "success" | "error";
  message: string;
}

const EMPTY_FORM: CreateResourcePayload = {
  title: "",
  description: "",
  category: "general",
  fileUrl: "",
  fileType: "link",
  fileSize: "",
  cohortId: "",
};

const detectFileTypeFromUrl = (url: string): (typeof FILE_TYPE_OPTIONS)[number] => {
  const clean = url.trim().toLowerCase();
  if (!clean) return "link";
  if (/youtube\.com|youtu\.be|vimeo\.com|zoom\.us|\.mp4|\.mov|\.webm/i.test(clean)) return "video";
  if (/\.pdf(\?|#|$)/i.test(clean)) return "pdf";
  if (/\.(docx?|pages|rtf)(\?|#|$)/i.test(clean)) return "docx";
  if (/\.(xlsx?|csv|numbers)(\?|#|$)/i.test(clean)) return "xlsx";
  if (/\.(pptx?|key)(\?|#|$)/i.test(clean)) return "pptx";
  return "link";
};

export default function AdminResourcesPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
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
    setForm({
      ...EMPTY_FORM,
      category: "general",
      cohortId: selectedCohortId || "",
    });
    setUploadedResourceName(null);
    setModalOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditTarget(r);
    const rawCohortId =
      typeof r.cohortId === "object" && (r.cohortId as any)?._id
        ? (r.cohortId as any)._id
        : typeof r.cohortId === "string"
        ? r.cohortId
        : "";

    setForm({
      title: r.title || "",
      description: r.description || "",
      category: r.category || "general",
      fileUrl: r.fileUrl || "",
      fileType: r.fileType || "link",
      fileSize: r.fileSize || "",
      cohortId: rawCohortId,
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
      const autoFileType =
        ext === 'pdf' ? 'pdf' :
        ext === 'docx' || ext === 'doc' ? 'docx' :
        ext === 'xlsx' || ext === 'xls' ? 'xlsx' :
        ext === 'pptx' || ext === 'ppt' ? 'pptx' :
        ext === 'mp4' || ext === 'mov' || ext === 'webm' ? 'video' :
        'other';

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
    const trimmedTitle = form.title.trim();
    const trimmedDesc = form.description.trim();
    let trimmedUrl = form.fileUrl.trim();

    if (!trimmedTitle || !trimmedDesc) {
      showToast("error", "Title and description are required.");
      return;
    }

    if (!trimmedUrl && !uploadedResourceName && !editTarget?.fileUrl) {
      showToast("error", "Please upload a file or enter a resource URL.");
      return;
    }

    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    const finalFileType = uploadedResourceName
      ? form.fileType
      : detectFileTypeFromUrl(trimmedUrl || editTarget?.fileUrl || "");

    const cleanCohortId = form.cohortId && form.cohortId !== "all" ? form.cohortId : undefined;

    const payload: CreateResourcePayload = {
      title: trimmedTitle,
      description: trimmedDesc,
      category: form.category || "general",
      fileUrl: trimmedUrl || editTarget?.fileUrl || "",
      fileType: finalFileType,
      fileSize: uploadedResourceName ? form.fileSize : (editTarget?.fileSize || ""),
      cohortId: cleanCohortId,
    };

    setSubmitting(true);
    try {
      if (editTarget) {
        await updateResource(editTarget._id, payload);
        showToast("success", "Resource updated successfully.");
      } else {
        await createResource(payload);
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

  const getCategoryMeta = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat.toLowerCase());
    if (found) return found;
    return {
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      short: cat.charAt(0).toUpperCase() + cat.slice(1),
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-50",
    };
  };

  const getFileBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      pdf: "bg-rose-50 text-rose-700",
      docx: "bg-sky-50 text-sky-700",
      xlsx: "bg-emerald-50 text-emerald-700",
      pptx: "bg-amber-50 text-amber-700",
      link: "bg-purple-50 text-purple-700",
      video: "bg-orange-50 text-orange-700",
      other: "bg-slate-100 text-slate-600",
    };
    return colors[type] || colors.other;
  };

  const filtered = resources.filter((r) => {
    const rCat = (r.category || "general").toLowerCase();
    const matchCat = activeTab === "all" || rCat === activeTab.toLowerCase();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#000666] tracking-tight">Resource Library</h1>
          <p className="text-xs text-slate-500 mt-1">
            Program handouts, templates, supplemental readings, and reference links.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Resource
        </button>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-700 shadow-2xs"
          />
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
              activeTab === "all" ? "bg-[#000666] text-white font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({resources.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = resources.filter((r) => (r.category || "general").toLowerCase() === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveTab(cat.value)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                  activeTab === cat.value
                    ? "bg-[#000666] text-white font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat.short} {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </button>
            );
          })}
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
          <HiOutlineFolder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">No resources found.</p>
          <p className="text-slate-400 text-xs mt-1">Upload the first resource using the button above.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Cohort</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filtered.map((r) => {
                const catMeta = getCategoryMeta(r.category || "general");
                const cohortName =
                  typeof r.cohortId === "object" && (r.cohortId as any)?.name
                    ? (r.cohortId as any).name
                    : cohorts.find((c) => c._id === r.cohortId)?.name;

                return (
                  <tr key={r._id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1">{r.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.description}</p>
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold mt-1 text-[#000666] hover:text-[#00B0FF] transition-colors"
                        >
                          {r.fileType === "video" ? (
                            <HiOutlinePlayCircle className="w-3.5 h-3.5 text-orange-500" />
                          ) : r.fileType === "link" ? (
                            <HiOutlineLink className="w-3.5 h-3.5 text-purple-500" />
                          ) : (
                            <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5 text-sky-500" />
                          )}
                          <span>{r.fileType === "video" ? "Watch Recording" : r.fileType === "link" ? "Open Link" : "View File"}</span>
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${catMeta.bg} ${catMeta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dot}`} />
                        {catMeta.short}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getFileBadgeColor(r.fileType)}`}>
                          {r.fileType}
                        </span>
                        {r.fileSize && <span className="text-[11px] text-slate-400 font-medium">{r.fileSize}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 font-medium">
                        {cohortName ? cohortName : <span className="text-slate-400 italic">Universal</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-[#000666]/10 text-slate-400 hover:text-[#000666] transition-all cursor-pointer"
                          title="Edit"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete"
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-[#000666]">
                  {editTarget ? "Edit Resource" : "Add New Resource"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editTarget ? "Update resource details, category or link." : "Upload a file or provide a web link for participants."}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Islamic Banking & Finance Framework Guide"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief summary of what this resource contains..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800 resize-none"
                />
              </div>

              {/* Category / Label Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category / Label
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = (form.category || "general").toLowerCase() === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#000666] bg-[#000666]/5 ring-1 ring-[#000666]"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
                        <span className={`text-xs font-semibold ${isSelected ? "text-[#000666] font-bold" : "text-slate-700"}`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cohort Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Cohort
                </label>
                <select
                  value={form.cohortId || ""}
                  onChange={(e) => setForm((f) => ({ ...f, cohortId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800 bg-white cursor-pointer"
                >
                  <option value="">All Cohorts (Universal access)</option>
                  {cohorts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Option */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload File
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
                        <span>Uploading file...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full bg-sky-50 text-[#000666] flex items-center justify-center border border-sky-100 mx-auto">
                          <HiOutlineArrowUpTray className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          {uploadedResourceName
                            ? `Uploaded: ${uploadedResourceName}`
                            : form.fileUrl && !form.fileUrl.startsWith("http")
                            ? "File uploaded"
                            : "Click or drag a PDF or document here to upload"}
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, PPTX, DOCX, XLSX up to 25MB</p>
                      </>
                    )}
                  </div>
                </div>
                {uploadedResourceName && (
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedResourceName(null);
                        setForm((f) => ({ ...f, fileUrl: "", fileSize: "", fileType: "link" }));
                      }}
                      className="text-[11px] text-red-500 hover:underline font-semibold cursor-pointer"
                    >
                      Remove uploaded file
                    </button>
                  </div>
                )}
              </div>

              {/* URL Alternative */}
              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  OR PROVIDE A LINK
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Resource URL / Web Link
                  </label>
                  {form.fileUrl.trim() && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${getFileBadgeColor(detectFileTypeFromUrl(form.fileUrl))}`}>
                      {detectFileTypeFromUrl(form.fileUrl)}
                    </span>
                  )}
                </div>
                {detectFileTypeFromUrl(form.fileUrl) === "video" && (
                  <div className="flex items-center gap-2 mb-2 bg-orange-50 border border-orange-200/80 rounded-lg px-3 py-2">
                    <HiOutlineVideoCamera className="w-4 h-4 text-orange-500 shrink-0" />
                    <p className="text-[11px] text-orange-700 font-semibold">
                      Video link detected (YouTube, Drive, Vimeo, or Zoom).
                    </p>
                  </div>
                )}
                <input
                  value={form.fileUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoType = detectFileTypeFromUrl(val);
                    setForm((f) => ({ ...f, fileUrl: val, fileType: autoType }));
                  }}
                  placeholder="https://example.com/guide, YouTube video, or Google Drive link"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#000666]/20 text-slate-800"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-[#000666] text-white text-xs font-bold rounded-xl disabled:opacity-60 cursor-pointer hover:bg-[#000666]/90 transition-colors shadow-sm"
              >
                {submitting ? "Saving…" : editTarget ? "Save Changes" : "Publish Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Delete Resource</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-800 font-semibold">{deleteTarget.title}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
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
