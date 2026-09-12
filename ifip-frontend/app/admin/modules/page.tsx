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
  HiOutlineClock,
  HiOutlineListBullet,
  HiOutlineDocumentText,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineCalendar,
  HiOutlineLightBulb,
  HiOutlineClipboardDocumentList,
  HiOutlineBookmark,
  HiOutlineSparkles,
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineArrowUpTray,
  HiOutlineArrowDownTray
} from "react-icons/hi2";
import {
  getAdminLMSModules,
  createLMSModule,
  updateLMSModule,
  publishLMSModule,
  unpublishLMSModule,
  deleteLMSModule,
  getAdminModuleTaskSubmissions,
  reviewModuleTaskSubmission,
  uploadResourceFileAuth,
  LMSModule,
  ModuleOutline,
  TopicOutline,
  ModuleTaskSubmission,
  GroupedModuleTaskSubmission
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";
import RichTextEditor from "@/components/RichTextEditor";

export default function AdminModulesPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"outline" | "content">("outline");
  const [editingModule, setEditingModule] = useState<LMSModule | null>(null);

  // Review Drawer state
  const [reviewModule, setReviewModule] = useState<LMSModule | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<GroupedModuleTaskSubmission[]>([]);
  const [taskSubmissionsLoading, setTaskSubmissionsLoading] = useState(false);
  const [taskReviewDrafts, setTaskReviewDrafts] = useState<Record<string, { status: 'approved' | 'rejected' | 'needs_resubmission' | 'pending_review'; points: number; feedback: string }>>({});
  const [selectedTaskParticipantId, setSelectedTaskParticipantId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Bulk Paste Helper State
  interface BulkPasteConfig {
    title: string;
    itemTypeLabel: string;
    existingItems: string[];
    onApply: (lines: string[], mode: "append" | "replace") => void;
  }

  const [bulkPasteConfig, setBulkPasteConfig] = useState<BulkPasteConfig | null>(null);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkPasteTab, setBulkPasteTab] = useState<"edit_all" | "append_new">("edit_all");

  // Basic info & Delivery
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(1);
  const [weekNumber, setWeekNumber] = useState(1);
  const [contentType, setContentType] = useState("text");
  const [contentUrl, setContentUrl] = useState("");
  const [body, setBody] = useState("");
  const [moduleStatus, setModuleStatus] = useState<"draft" | "published" | "archived">("draft");
  const [moduleCohortId, setModuleCohortId] = useState("");

  // PDF Module Document state
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileSize, setPdfFileSize] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setPdfUploadError("Only PDF files are supported for module document uploads.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPdfUploadError("File size exceeds 25MB limit. Please upload a smaller PDF.");
      return;
    }

    setPdfUploadError(null);
    setUploadingPdf(true);
    try {
      const res = await uploadResourceFileAuth(file);
      setPdfUrl(res.fileUrl);
      setPdfFileName(res.fileName || file.name);
      setPdfFileSize(res.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    } catch (err: any) {
      console.error("PDF upload failed:", err);
      setPdfUploadError(err?.message || "Failed to upload PDF. Please try again.");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Module task
  const [moduleTaskTitle, setModuleTaskTitle] = useState("");
  const [moduleTaskDescription, setModuleTaskDescription] = useState("");
  const [moduleTaskInstructions, setModuleTaskInstructions] = useState("");
  const [moduleTaskRequiresUpload, setModuleTaskRequiresUpload] = useState(false);
  const [moduleTaskEvidenceLabel, setModuleTaskEvidenceLabel] = useState("");
  const [moduleTaskAllowedFileTypes, setModuleTaskAllowedFileTypes] = useState<string[]>(["pdf", "png", "jpg"]);
  const [moduleTaskDueDate, setModuleTaskDueDate] = useState("");
  const [moduleTaskDueText, setModuleTaskDueText] = useState("");
  const [moduleTaskIsRequired, setModuleTaskIsRequired] = useState(true);

  // Outline Subdocument
  const [purpose, setPurpose] = useState("");
  const [learningObjectives, setLearningObjectives] = useState<string[]>([""]);
  const [topics, setTopics] = useState<TopicOutline[]>([
    { title: "", subtopics: [""], learningActivity: "", materials: [] }
  ]);
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>([""]);

  const [submitting, setSubmitting] = useState(false);

  // Helper to clean pasted multi-line text (e.g. from Word, PDF, markdown lists)
  const cleanPastedLines = (rawText: string): string[] => {
    return rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      // Strip leading bullet points (- , * , • , – , etc.) or numbering (1. , 1) , [1] , 1.1 , etc.)
      .map(line => line.replace(/^(\d+(\.\d+)*[\.\)]|\(\d+\)|\[\d+\]|\*|-|•|–|—)\s*/i, "").trim())
      .filter(line => line.length > 0);
  };

  const openBulkPaste = (config: BulkPasteConfig) => {
    setBulkPasteConfig(config);
    setBulkPasteText("");
    // Default to append_new so user sees existing items clearly and has an empty box to paste new items
    setBulkPasteTab("append_new");
  };

  const handleApplyBulkPaste = () => {
    if (!bulkPasteConfig) return;
    const lines = cleanPastedLines(bulkPasteText);
    if (lines.length > 0) {
      bulkPasteConfig.onApply(lines, bulkPasteTab === "append_new" ? "append" : "replace");
    }
    setBulkPasteConfig(null);
  };

  // Direct onPaste Handlers (automatically triggers when user presses Ctrl+V with multiline text)
  const handlePasteObjectives = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || !pasteText.includes("\n")) return; // Let single-line paste work normally

    e.preventDefault();
    const lines = cleanPastedLines(pasteText);
    if (lines.length === 0) return;

    setLearningObjectives(prev => {
      const current = [...prev];
      current.splice(index, 1, ...lines);
      return current;
    });
  };

  const handlePasteOutcomes = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || !pasteText.includes("\n")) return;

    e.preventDefault();
    const lines = cleanPastedLines(pasteText);
    if (lines.length === 0) return;

    setExpectedOutcomes(prev => {
      const current = [...prev];
      current.splice(index, 1, ...lines);
      return current;
    });
  };

  const handlePasteTopicTitle = (e: React.ClipboardEvent<HTMLInputElement>, tIndex: number) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || !pasteText.includes("\n")) return;

    e.preventDefault();
    const lines = cleanPastedLines(pasteText);
    if (lines.length === 0) return;

    setTopics(prev => {
      const current = [...prev];
      const newTopics: TopicOutline[] = lines.map(line => ({
        title: line,
        subtopics: [""],
        learningActivity: "",
        materials: []
      }));
      current.splice(tIndex, 1, ...newTopics);
      return current;
    });
  };

  const handlePasteSubtopics = (e: React.ClipboardEvent<HTMLInputElement>, tIndex: number, sIndex: number) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || !pasteText.includes("\n")) return;

    e.preventDefault();
    const lines = cleanPastedLines(pasteText);
    if (lines.length === 0) return;

    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      const subs = [...(t.subtopics || [])];
      subs.splice(sIndex, 1, ...lines);
      return { ...t, subtopics: subs };
    }));
  };

  const fetchModules = async () => {
    try {
      const data = await getAdminLMSModules();
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

  const filteredModules = modules.filter((mod) => {
    const currentStatus = (mod.moduleStatus || mod.status || "published") as "draft" | "published" | "archived";
    if (statusFilter === "all") return true;
    return currentStatus === statusFilter;
  });

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      await publishLMSModule(id);
      alert("Module published successfully! Participant email & in-app notifications dispatched.");
      if (reviewModule && reviewModule._id === id) {
        setReviewModule(prev => prev ? { ...prev, status: 'published', moduleStatus: 'published' } : null);
      }
      fetchModules();
    } catch (err: any) {
      console.error("Failed to publish module:", err);
      alert("Failed to publish module.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    setPublishingId(id);
    try {
      await unpublishLMSModule(id);
      alert("Module reverted back to draft mode.");
      if (reviewModule && reviewModule._id === id) {
        setReviewModule(prev => prev ? { ...prev, status: 'draft', moduleStatus: 'draft' } : null);
      }
      fetchModules();
    } catch (err: any) {
      console.error("Failed to unpublish module:", err);
      alert("Failed to unpublish module.");
    } finally {
      setPublishingId(null);
    }
  };

  const fetchModuleTaskSubmissions = async (moduleId: string) => {
    setTaskSubmissionsLoading(true);
    try {
      const grouped = await getAdminModuleTaskSubmissions(moduleId, true);
      setTaskSubmissions(grouped);
      const draftMap: Record<string, { status: 'approved' | 'rejected' | 'needs_resubmission' | 'pending_review'; points: number; feedback: string }> = {};
      grouped.forEach((entry) => {
        const s = entry.latestSubmission;
        draftMap[s._id] = {
          status: (s.status === 'approved' || s.status === 'rejected' || s.status === 'needs_resubmission' || s.status === 'pending_review') ? s.status : 'pending_review',
          points: s.pointsAwarded || 0,
          feedback: s.adminFeedback || '',
        };
      });
      setTaskReviewDrafts(draftMap);

      const firstPending = grouped.find((e) => e.latestSubmission.status !== 'approved');
      const firstId = (firstPending ?? grouped[0])?.userId?._id ?? null;
      setSelectedTaskParticipantId(firstId);
    } catch (err) {
      console.error("Failed to load module task submissions:", err);
      setTaskSubmissions([]);
    } finally {
      setTaskSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    if (reviewModule && reviewModule.moduleTask) {
      fetchModuleTaskSubmissions(reviewModule._id);
    } else {
      setTaskSubmissions([]);
      setTaskReviewDrafts({});
      setSelectedTaskParticipantId(null);
      setExpandedHistoryId(null);
    }
  }, [reviewModule?._id, reviewModule?.moduleTask]);

  const handleTaskReview = async (latestSubmissionId: string) => {
    const draft = taskReviewDrafts[latestSubmissionId];
    if (!draft) return;

    try {
      await reviewModuleTaskSubmission(latestSubmissionId, {
        status: draft.status,
        pointsAwarded: Number(draft.points),
        adminFeedback: draft.feedback,
      });

      setTaskSubmissions((prev) =>
        prev.map((entry) =>
          entry.latestSubmission._id === latestSubmissionId
            ? {
                ...entry,
                latestSubmission: {
                  ...entry.latestSubmission,
                  status: draft.status,
                  pointsAwarded: Number(draft.points),
                  adminFeedback: draft.feedback,
                },
              }
            : entry
        )
      );
      alert("Submission review saved.");
    } catch (err) {
      console.error("Failed to review task submission:", err);
      alert("Failed to save this review.");
    }
  };

  const handleOpenCreate = () => {
    setEditingModule(null);
    setActiveTab("outline");
    setTitle("");
    setDescription("");
    const nextOrder = modules.length > 0 ? modules[modules.length - 1].order + 1 : 1;
    setOrder(nextOrder);
    setWeekNumber(nextOrder <= 4 ? nextOrder : 1);
    setContentType("text");
    setContentUrl("");
    setBody("");
    setModuleStatus("draft");
    setModuleCohortId((selectedCohortId === "unassigned") ? "" : selectedCohortId);
    setPdfUrl("");
    setPdfFileName("");
    setPdfFileSize("");
    setPdfUploadError(null);

    setModuleTaskTitle("");
    setModuleTaskDescription("");
    setModuleTaskInstructions("");
    setModuleTaskRequiresUpload(false);
    setModuleTaskEvidenceLabel("");
    setModuleTaskAllowedFileTypes(["pdf", "png", "jpg"]);
    setModuleTaskDueDate("");
    setModuleTaskDueText("");
    setModuleTaskIsRequired(true);

    // Outline defaults
    setPurpose("");
    setLearningObjectives([""]);
    setTopics([{ title: "", subtopics: [""], learningActivity: "", materials: [] }]);
    setExpectedOutcomes([""]);

    setModalOpen(true);
  };

  const handleOpenEdit = (mod: LMSModule) => {
    setEditingModule(mod);
    setActiveTab("outline");
    setTitle(mod.title);
    const out = mod.outline || {};
    const initialDesc = mod.description || out.purpose || "";
    setDescription(initialDesc);
    setPurpose(initialDesc);
    setOrder(mod.order);
    setWeekNumber(mod.weekNumber || mod.order || 1);
    setContentType(mod.contentType);
    setContentUrl(mod.contentUrl || "");
    setBody(mod.body || "");
    setModuleStatus((mod.moduleStatus || mod.status || "draft") as any);
    setModuleCohortId((mod as any).cohortId || "");
    setPdfUrl(mod.pdfUrl || "");
    setPdfFileName(mod.pdfFileName || "");
    setPdfFileSize("");
    setPdfUploadError(null);

    const task = mod.moduleTask || {};
    setModuleTaskTitle(task.title || "");
    setModuleTaskDescription(task.description || "");
    setModuleTaskInstructions(task.instructions || "");
    setModuleTaskRequiresUpload(Boolean(task.requiresUpload));
    setModuleTaskEvidenceLabel(task.evidenceLabel || "");
    setModuleTaskAllowedFileTypes(
      task.allowedFileTypes && task.allowedFileTypes.length > 0
        ? task.allowedFileTypes.map(t => t.toLowerCase().replace(/^\./, "").trim()).filter(Boolean)
        : ["pdf"]
    );
    setModuleTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setModuleTaskDueText(task.dueText || "");
    setModuleTaskIsRequired(task.isRequired !== false);

    setLearningObjectives(out.learningObjectives && out.learningObjectives.length > 0 ? out.learningObjectives : [""]);
    setTopics(
      out.topics && out.topics.length > 0
        ? out.topics.map(t => ({
          title: t.title || "",
          subtopics: t.subtopics && t.subtopics.length > 0 ? t.subtopics : [""],
          learningActivity: t.learningActivity || "",
          materials: t.materials || []
        }))
        : [{ title: "", subtopics: [""], learningActivity: "", materials: [] }]
    );
    setExpectedOutcomes(out.expectedOutcomes && out.expectedOutcomes.length > 0 ? out.expectedOutcomes : [""]);

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

  // Helper functions for Outline Arrays
  const addObjective = () => setLearningObjectives(prev => [...prev, ""]);
  const updateObjective = (index: number, val: string) => {
    setLearningObjectives(prev => prev.map((item, i) => i === index ? val : item));
  };
  const removeObjective = (index: number) => {
    setLearningObjectives(prev => prev.filter((_, i) => i !== index));
  };

  const addOutcome = () => setExpectedOutcomes(prev => [...prev, ""]);
  const updateOutcome = (index: number, val: string) => {
    setExpectedOutcomes(prev => prev.map((item, i) => i === index ? val : item));
  };
  const removeOutcome = (index: number) => {
    setExpectedOutcomes(prev => prev.filter((_, i) => i !== index));
  };

  const addTopic = () => {
    setTopics(prev => [...prev, { title: "", subtopics: [""], learningActivity: "", materials: [] }]);
  };
  const updateTopicTitle = (tIndex: number, val: string) => {
    setTopics(prev => prev.map((t, i) => i === tIndex ? { ...t, title: val } : t));
  };
  const updateTopicActivity = (tIndex: number, val: string) => {
    setTopics(prev => prev.map((t, i) => i === tIndex ? { ...t, learningActivity: val } : t));
  };
  const removeTopic = (tIndex: number) => {
    setTopics(prev => prev.filter((_, i) => i !== tIndex));
  };

  const addSubtopic = (tIndex: number) => {
    setTopics(prev => prev.map((t, i) => i === tIndex ? { ...t, subtopics: [...(t.subtopics || []), ""] } : t));
  };
  const updateSubtopic = (tIndex: number, sIndex: number, val: string) => {
    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      const nextSubs = [...(t.subtopics || [])];
      nextSubs[sIndex] = val;
      return { ...t, subtopics: nextSubs };
    }));
  };
  const removeSubtopic = (tIndex: number, sIndex: number) => {
    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      return { ...t, subtopics: (t.subtopics || []).filter((_, si) => si !== sIndex) };
    }));
  };

  const addMaterial = (tIndex: number) => {
    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      return { ...t, materials: [...(t.materials || []), { label: "", url: "" }] };
    }));
  };
  const updateMaterial = (tIndex: number, mIndex: number, key: "label" | "url", val: string) => {
    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      const nextMats = [...(t.materials || [])];
      nextMats[mIndex] = { ...nextMats[mIndex], [key]: val };
      return { ...t, materials: nextMats };
    }));
  };
  const removeMaterial = (tIndex: number, mIndex: number) => {
    setTopics(prev => prev.map((t, i) => {
      if (i !== tIndex) return t;
      return { ...t, materials: (t.materials || []).filter((_, mi) => mi !== mIndex) };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const outlinePayload: ModuleOutline = {
      purpose: purpose.trim() || undefined,
      learningObjectives: learningObjectives.filter(o => o.trim().length > 0),
      topics: topics
        .filter(t => t.title.trim().length > 0)
        .map(t => ({
          title: t.title.trim(),
          subtopics: (t.subtopics || []).filter(s => s.trim().length > 0),
          learningActivity: t.learningActivity?.trim() || undefined,
          materials: (t.materials || []).filter(m => m.label.trim().length > 0)
        })),
      expectedOutcomes: expectedOutcomes.filter(o => o.trim().length > 0)
    };

    const allowedFileTypes = moduleTaskAllowedFileTypes
      .map((value) => value.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);

    const moduleTaskPayload =
      moduleTaskTitle.trim() || moduleTaskDescription.trim() || moduleTaskInstructions.trim() || moduleTaskDueDate || moduleTaskDueText.trim() || moduleTaskEvidenceLabel.trim() || moduleTaskRequiresUpload || allowedFileTypes.length > 0
        ? {
          title: moduleTaskTitle.trim() || undefined,
          description: moduleTaskDescription.trim() || undefined,
          instructions: moduleTaskInstructions.trim() || undefined,
          requiresUpload: moduleTaskRequiresUpload,
          evidenceLabel: moduleTaskEvidenceLabel.trim() || undefined,
          allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : undefined,
          dueDate: moduleTaskDueDate || undefined,
          dueText: moduleTaskDueText.trim() || undefined,
          isRequired: moduleTaskIsRequired
        }
        : undefined;

    const payload = {
      title,
      description,
      order: Number(order),
      contentType,
      contentUrl: contentUrl || undefined,
      pdfUrl: pdfUrl.trim() || undefined,
      pdfFileName: pdfFileName.trim() || undefined,
      body: body || undefined,
      outline: outlinePayload,
      moduleTask: moduleTaskPayload,
      weekNumber: Number(weekNumber),
      cohortId: moduleCohortId || undefined,
      status: moduleStatus
    };

    try {
      if (editingModule) {
        await updateLMSModule(editingModule._id, payload);
        alert("Module and outline updated successfully.");
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
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] overflow-x-hidden">
      {/* Top Header */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-semibold text-slate-500 hover:text-[#000666] inline-flex items-center gap-1 transition-colors">
              &larr; Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
            <HiOutlineBookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-[#000666] shrink-0" />
            <span>Curriculum &amp; Coursework Editor</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage structural syllabus outlines, weekly schedules, learning materials, and coursework tasks.
          </p>
        </div>
        <div className="w-full sm:w-auto shrink-0 flex items-center gap-2.5">
          <Link
            href="/admin/schedule"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-all text-center"
          >
            <HiOutlineClock className="w-4 h-4 text-slate-400" />
            <span>Timetable</span>
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[#000666] hover:bg-[#000666]/90 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all text-center cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4 text-[#FF9800]" />
            <span>Create Module</span>
          </button>
        </div>
      </div>

      {/* Status Filter Bar - Zero Overflow Responsive Segmented Control */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl mb-4 w-full sm:w-auto sm:inline-flex overflow-hidden select-none">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`py-2 px-1 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all outline-none focus:outline-none select-none cursor-pointer ${statusFilter === "all"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50 border border-transparent"
            }`}
        >
          <span>All</span>
          <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${statusFilter === "all" ? "bg-slate-100 text-slate-800" : "bg-slate-200/60 text-slate-500"
            }`}>
            {modules.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("draft")}
          className={`py-2 px-1 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all outline-none focus:outline-none select-none cursor-pointer ${statusFilter === "draft"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50 border border-transparent"
            }`}
        >
          <span>Drafts</span>
          <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${statusFilter === "draft" ? "bg-amber-100 text-amber-800" : "bg-slate-200/60 text-slate-500"
            }`}>
            {modules.filter(m => (m.moduleStatus || m.status || 'published') === 'draft').length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("published")}
          className={`py-2 px-1 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all outline-none focus:outline-none select-none cursor-pointer ${statusFilter === "published"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50 border border-transparent"
            }`}
        >
          <span className="hidden min-[400px]:inline">Published</span>
          <span className="min-[400px]:hidden">Live</span>
          <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${statusFilter === "published" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-500"
            }`}>
            {modules.filter(m => (m.moduleStatus || m.status || 'published') === 'published').length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("archived")}
          className={`py-2 px-1 sm:px-3.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all outline-none focus:outline-none select-none cursor-pointer ${statusFilter === "archived"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50 border border-transparent"
            }`}
        >
          <span className="hidden min-[400px]:inline">Archived</span>
          <span className="min-[400px]:hidden">Arch.</span>
          <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${statusFilter === "archived" ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500"
            }`}>
            {modules.filter(m => (m.moduleStatus || m.status || 'published') === 'archived').length}
          </span>
        </button>
      </div>

      {/* Modules Table List */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Lesson & Outline</th>
                <th className="px-6 py-3.5">Publish Status</th>
                <th className="px-6 py-3.5">Schedule / Week</th>
                <th className="px-6 py-3.5">Assigned Cohort</th>
                <th className="px-6 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No coursework modules match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const currentStatus = mod.moduleStatus || mod.status || 'published';
                  const isDraft = currentStatus === 'draft';
                  const isPublished = currentStatus === 'published';
                  const isArchived = currentStatus === 'archived';

                  return (
                    <tr key={mod._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-[#000666]">
                        #{mod.order}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#000666]">{mod.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-400 text-xs">
                          <span className="bg-slate-100 text-slate-600 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                            {mod.contentType}
                          </span>
                          <span className="line-clamp-1">{mod.description}</span>
                        </div>
                        {mod.outline?.topics && mod.outline.topics.length > 0 && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ {mod.outline.topics.length} Syllabus Topics
                            </span>
                            {mod.outline.learningObjectives && mod.outline.learningObjectives.length > 0 && (
                              <span className="text-[10px] text-slate-500">
                                {mod.outline.learningObjectives.length} Objectives
                              </span>
                            )}
                            {mod.pdfUrl && (
                              <a
                                href={mod.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 font-semibold px-2 py-0.5 rounded-full border border-rose-200 hover:underline"
                              >
                                📄 PDF Document
                              </a>
                            )}
                          </div>
                        )}
                        {!mod.outline?.topics?.length && mod.pdfUrl && (
                          <div className="mt-1">
                            <a
                              href={mod.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 font-semibold px-2 py-0.5 rounded-full border border-rose-200 hover:underline"
                            >
                              📄 PDF Document
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isDraft && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Draft (Admin Review)
                          </span>
                        )}
                        {isPublished && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Published
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                          <HiOutlineCalendar className="w-3.5 h-3.5 text-amber-700" /> Week {mod.weekNumber || mod.order}
                        </span>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setReviewModule(mod)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-[#000666] font-semibold text-xs bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Review module contents"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5 text-slate-500" /> Review
                          </button>
                          <button
                            onClick={() => handleOpenEdit(mod)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-[#000666] font-semibold text-xs bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          >
                            <HiOutlinePencilSquare className="w-3.5 h-3.5 text-slate-500" /> Edit
                          </button>
                          {isDraft && (
                            <button
                              onClick={() => handlePublish(mod._id)}
                              disabled={publishingId === mod._id}
                              className="text-white bg-emerald-700 hover:bg-emerald-800 inline-flex items-center gap-1 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <HiOutlineArrowUpTray className="w-3.5 h-3.5" />
                              {publishingId === mod._id ? "Publishing..." : "Publish"}
                            </button>
                          )}
                          {isPublished && (
                            <button
                              onClick={() => handleUnpublish(mod._id)}
                              disabled={publishingId === mod._id}
                              className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <HiOutlineArrowDownTray className="w-3.5 h-3.5 text-slate-400" />
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(mod._id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete module"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List - Mature, Clean, Unified */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {filteredModules.length === 0 ? (
            <p className="px-6 py-12 text-center text-slate-400 text-xs italic">
              No coursework modules match the selected filter.
            </p>
          ) : (
            filteredModules.map((mod) => {
              const currentStatus = mod.moduleStatus || mod.status || 'published';
              const isDraft = currentStatus === 'draft';
              const isPublished = currentStatus === 'published';

              return (
                <div key={mod._id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  {/* Clean Header: Title on Left, Status Badge on Right */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug break-words flex-1">
                      <span className="text-slate-400 font-mono font-medium mr-1.5">#{mod.order}</span>
                      {mod.title}
                    </h3>

                    {/* Only Publish Status Badge */}
                    {isDraft ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Draft
                      </span>
                    ) : isPublished ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Subtle Schedule & Scope (Clean inline text, no clumsy pill boxes) */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <HiOutlineCalendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-600">Week {mod.weekNumber || mod.order}</span>
                    {mod.outline?.topics && mod.outline.topics.length > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{mod.outline.topics.length} topic{mod.outline.topics.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  {mod.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  )}

                  {/* Action Toolbar - Fully Visible Labels with Zero Truncation */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {/* Row 1: Primary Actions (Review & Edit) */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setReviewModule(mod)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#000666] bg-slate-100 hover:bg-slate-200/70 border border-slate-200 py-2 px-3 rounded-xl transition-colors cursor-pointer"
                      >
                        <HiOutlineEye className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Review</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(mod)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#000666] bg-white hover:bg-slate-50 border border-slate-200 py-2 px-3 rounded-xl transition-colors cursor-pointer"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Row 2: Status & Delete */}
                    <div className="flex items-center gap-2">
                      {isDraft ? (
                        <button
                          onClick={() => handlePublish(mod._id)}
                          disabled={publishingId === mod._id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-white bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <HiOutlineArrowUpTray className="w-4 h-4 shrink-0" />
                          <span>{publishingId === mod._id ? "Publishing..." : "Publish Module"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(mod._id)}
                          disabled={publishingId === mod._id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <HiOutlineArrowDownTray className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Unpublish</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(mod._id)}
                        className="inline-flex items-center justify-center gap-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors cursor-pointer shrink-0"
                        title="Delete module"
                      >
                        <HiOutlineTrash className="w-4 h-4 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coursework & Outline Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#000666] text-white py-3.5 sm:py-4 px-4 sm:px-6 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 truncate">
                <HiOutlineAcademicCap className="w-5 h-5 text-[#FF9800] shrink-0" />
                <span className="truncate">{editingModule ? "Edit Module" : "Create Module"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer outline-none focus:outline-none"
                title="Close modal"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher - Clean Segmented Control */}
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/80 p-1.5 gap-1.5 shrink-0 select-none">
              <button
                type="button"
                onClick={() => setActiveTab("outline")}
                className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 select-none ${activeTab === "outline"
                    ? "bg-white text-[#000666] shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent"
                  }`}
              >
                <HiOutlineListBullet className={`w-4 h-4 shrink-0 ${activeTab === "outline" ? "text-[#FF9800]" : "text-slate-400"}`} />
                <div className="text-left sm:text-center min-w-0">
                  <span className="block text-xs font-bold truncate">1. Syllabus Outline</span>
                  <span className="hidden sm:block text-[10px] font-normal text-slate-400">Topics &amp; Outcomes</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 select-none ${activeTab === "content"
                    ? "bg-white text-[#000666] shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent"
                  }`}
              >
                <HiOutlineDocumentText className={`w-4 h-4 shrink-0 ${activeTab === "content" ? "text-[#FF9800]" : "text-slate-400"}`} />
                <div className="text-left sm:text-center min-w-0">
                  <span className="block text-xs font-bold truncate">2. Learning Content</span>
                  <span className="hidden sm:block text-[10px] font-normal text-slate-400">Reading &amp; Materials</span>
                </div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
              {/* General module info displayed in both tabs */}
              <div className="space-y-4 pb-5 border-b border-slate-200">
                {/* Module Title */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                    Module Title / Header *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Module 1: Foundations of Islamic Economics & Humanitarian Finance"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white font-medium"
                    required
                  />
                </div>

                {/* Metadata Row: Sequence Order, Programme Week, Module Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                      Display Sequence Order *
                    </label>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white font-mono font-bold"
                      required
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                      Programme Week
                    </label>
                    <select
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white font-medium text-slate-800"
                    >
                      <option value={1}>Week 1 </option>
                      <option value={2}>Week 2 </option>
                      <option value={3}>Week 3 </option>
                      <option value={4}>Week 4 </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                      Module Status
                    </label>
                    <select
                      value={moduleStatus}
                      onChange={(e) => setModuleStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs bg-white font-bold text-[#000666]"
                    >
                      <option value="draft">Draft (Hidden from participants)</option>
                      <option value="published">Published (Visible to participants)</option>
                      <option value="archived">Archived (Hidden / Read-only)</option>
                    </select>
                  </div>
                </div>

                {/* Module Purpose & Overview Summary */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                    Module Purpose &amp; Overview Summary *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setPurpose(e.target.value);
                    }}
                    rows={3}
                    placeholder="Describe why this module exists, its overview summary, and fundamental principles imparted..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white resize-y"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Module Task</p>
                    <h4 className="text-sm font-black text-[#000666] mt-1">Ask participants to complete a task linked to this module</h4>
                  </div>
                  <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={moduleTaskIsRequired}
                      onChange={(e) => setModuleTaskIsRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#000666] focus:ring-[#FF9800]"
                    />
                    Required
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Task title
                    </label>
                    <input
                      type="text"
                      value={moduleTaskTitle}
                      onChange={(e) => setModuleTaskTitle(e.target.value)}
                      placeholder="e.g. Complete the course certificate task"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Task description
                    </label>
                    <textarea
                      value={moduleTaskDescription}
                      onChange={(e) => setModuleTaskDescription(e.target.value)}
                      placeholder="Brief explanation of the task participants need to do."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white h-[72px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Task instructions
                    </label>
                    <textarea
                      value={moduleTaskInstructions}
                      onChange={(e) => setModuleTaskInstructions(e.target.value)}
                      placeholder="Explain exactly what the participant should do, such as taking a course or uploading a screenshot and certificate."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white h-[90px]"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Task Evidence Requirement
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 h-[38px]">
                      <input
                        type="checkbox"
                        id="requiresUploadCheck"
                        checked={moduleTaskRequiresUpload}
                        onChange={(e) => setModuleTaskRequiresUpload(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#000666] focus:ring-[#FF9800]"
                      />
                      <label htmlFor="requiresUploadCheck" className="text-[11px] font-bold text-slate-700 cursor-pointer">Require upload of evidence</label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Evidence label
                    </label>
                    <input
                      type="text"
                      value={moduleTaskEvidenceLabel}
                      onChange={(e) => setModuleTaskEvidenceLabel(e.target.value)}
                      placeholder="Certificate of completion"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                        Accepted file types {moduleTaskAllowedFileTypes.length > 0 ? `(${moduleTaskAllowedFileTypes.length} selected)` : "(any format allowed)"}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModuleTaskAllowedFileTypes(["pdf", "png", "jpg", "jpeg"])}
                          className="text-[11px] font-semibold text-[#000666] hover:underline cursor-pointer"
                        >
                          PDF + Images
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setModuleTaskAllowedFileTypes(["pdf", "png", "jpg", "jpeg", "docx", "doc", "xlsx", "zip"])}
                          className="text-[11px] font-semibold text-[#000666] hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setModuleTaskAllowedFileTypes([])}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Interactive Multi-Select Pills */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {[
                        { id: "pdf", label: "PDF" },
                        { id: "png", label: "PNG" },
                        { id: "jpg", label: "JPG" },
                        { id: "jpeg", label: "JPEG" },
                        { id: "docx", label: "DOCX" },
                        { id: "doc", label: "DOC" },
                        { id: "xlsx", label: "XLSX" },
                        { id: "zip", label: "ZIP" },
                      ].map((type) => {
                        const isSelected = moduleTaskAllowedFileTypes.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              setModuleTaskAllowedFileTypes(prev =>
                                isSelected ? prev.filter(t => t !== type.id) : [...prev, type.id]
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none outline-none focus:outline-none ${isSelected
                                ? "bg-[#000666] text-white shadow-2xs border border-[#000666]"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                              }`}
                          >
                            <span className="text-[11px] font-bold">{isSelected ? "✓" : "+"}</span>
                            <span>{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {moduleTaskAllowedFileTypes.length === 0 && (
                      <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                        <span>ℹ</span> All file formats will be permitted since none are explicitly restricted.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Due date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={moduleTaskDueDate}
                      onChange={(e) => setModuleTaskDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Optional due note
                    </label>
                    <input
                      type="text"
                      value={moduleTaskDueText}
                      onChange={(e) => setModuleTaskDueText(e.target.value)}
                      placeholder="Due within 7 days of module completion"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* TAB 1: OUTLINE & SYLLABUS BREAKDOWN */}
              {activeTab === "outline" && (
                <div className="space-y-6">
                  {/* Tip banner */}
                  <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-sky-800">
                    <HiOutlineLightBulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Smart Multi-Line Paste Active:</strong> You can copy a numbered or bulleted list directly from your curriculum doc/PDF and paste (Ctrl+V) into any objective, topic, or subtopic field. It will automatically strip the numbers/bullets and generate separate list items for you!
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-[#000666] uppercase tracking-wider block">
                          Learning Objectives
                        </label>
                        <span className="text-[10px] text-slate-400">Paste multi-line text directly below or use the bulk paste tool</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openBulkPaste({
                            title: "Manage & Paste Learning Objectives",
                            itemTypeLabel: "Objectives",
                            existingItems: learningObjectives,
                            onApply: (lines, mode) => {
                              if (mode === "append") {
                                setLearningObjectives(prev => [...prev.filter(o => o.trim().length > 0), ...lines]);
                              } else {
                                setLearningObjectives(lines.length > 0 ? lines : [""]);
                              }
                            }
                          })}
                          className="text-xs font-bold text-[#000666] hover:bg-slate-200/60 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" /> Paste List
                        </button>
                        <button
                          type="button"
                          onClick={addObjective}
                          className="text-xs font-bold text-[#FF9800] hover:text-[#FF9800]/80 flex items-center gap-1"
                        >
                          <HiOutlinePlus className="w-3.5 h-3.5" /> Add Objective
                        </button>
                      </div>
                    </div>
                    {learningObjectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                        <input
                          type="text"
                          value={obj}
                          onChange={(e) => updateObjective(i, e.target.value)}
                          onPaste={(e) => handlePasteObjectives(e, i)}
                          placeholder="e.g. Understand the core principles of Zakat, Waqf, and Sadaqah (or paste multi-line list)"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                        />
                        {learningObjectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeObjective(i)}
                            className="text-rose-400 hover:text-rose-600 p-1"
                            title="Remove objective"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Topics Breakdown */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#000666] uppercase tracking-wider">
                          Module Topic Breakdown (Sections & Activities)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Structured outline of topics, subtopics, recommended activities, and reference materials.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openBulkPaste({
                            title: "Manage & Paste Topics",
                            itemTypeLabel: "Topics",
                            existingItems: topics.map(t => t.title),
                            onApply: (lines, mode) => {
                              if (mode === "append") {
                                const newItems: TopicOutline[] = lines.map(line => ({
                                  title: line,
                                  subtopics: [""],
                                  learningActivity: "",
                                  materials: []
                                }));
                                setTopics(prev => [...prev.filter(t => t.title.trim().length > 0), ...newItems]);
                              } else {
                                const updated = lines.map(line => {
                                  const found = topics.find(t => t.title.trim().toLowerCase() === line.trim().toLowerCase());
                                  if (found) return { ...found, title: line };
                                  return {
                                    title: line,
                                    subtopics: [""],
                                    learningActivity: "",
                                    materials: []
                                  };
                                });
                                setTopics(updated.length > 0 ? updated : [{ title: "", subtopics: [""], learningActivity: "", materials: [] }]);
                              }
                            }
                          })}
                          className="text-xs font-bold text-[#000666] hover:bg-slate-100 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          <HiOutlineClipboardDocumentList className="w-4 h-4" /> Paste Multiple Topics
                        </button>
                        <button
                          type="button"
                          onClick={addTopic}
                          className="bg-[#000666] text-white hover:bg-[#000666]/90 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <HiOutlinePlus className="w-3.5 h-3.5 text-[#FF9800]" /> Add Topic
                        </button>
                      </div>
                    </div>

                    {topics.map((topic, tIdx) => (
                      <div key={tIdx} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                        {/* Topic Header: Badge + Remove on Top Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#000666] bg-[#000666]/10 border border-[#000666]/20 px-2.5 py-1 rounded-lg">
                            Topic #{tIdx + 1}
                          </span>
                          {topics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTopic(tIdx)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Remove topic"
                            >
                              <HiOutlineTrash className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Topic Title - 100% Full Width */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                            Topic Title *
                          </label>
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopicTitle(tIdx, e.target.value)}
                            onPaste={(e) => handlePasteTopicTitle(e, tIdx)}
                            placeholder="e.g. 1.1 Overview of Islamic Social Finance Tools (or paste multi-line list)"
                            className="w-full font-bold text-xs sm:text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 transition-all"
                          />
                        </div>

                        {/* Subtopics Section */}
                        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">Subtopics &amp; Key Concepts</span>
                              <span className="text-[10px] text-slate-400">Add key bullet points or paste lists</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openBulkPaste({
                                  title: `Manage & Paste Subtopics for Topic #${tIdx + 1}`,
                                  itemTypeLabel: "Subtopics",
                                  existingItems: topic.subtopics || [],
                                  onApply: (lines, mode) => {
                                    setTopics(prev => prev.map((t, i) => {
                                      if (i !== tIdx) return t;
                                      if (mode === "append") {
                                        return { ...t, subtopics: [...(t.subtopics || []).filter(s => s.trim().length > 0), ...lines] };
                                      } else {
                                        return { ...t, subtopics: lines.length > 0 ? lines : [""] };
                                      }
                                    }));
                                  }
                                })}
                                className="text-xs font-bold text-[#000666] hover:bg-slate-200/60 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              >
                                <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" /> Paste List
                              </button>
                              <button
                                type="button"
                                onClick={() => addSubtopic(tIdx)}
                                className="text-xs font-bold text-[#FF9800] hover:text-[#FF9800]/80 flex items-center gap-1 cursor-pointer"
                              >
                                <HiOutlinePlus className="w-3.5 h-3.5" /> Add Point
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {(topic.subtopics || []).map((sub, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-400 w-4 text-center shrink-0">•</span>
                                <input
                                  type="text"
                                  value={sub}
                                  onChange={(e) => updateSubtopic(tIdx, sIdx, e.target.value)}
                                  onPaste={(e) => handlePasteSubtopics(e, tIdx, sIdx)}
                                  placeholder="Subtopic key concept (or paste multi-line bullet points)..."
                                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                />
                                {(topic.subtopics || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSubtopic(tIdx, sIdx)}
                                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                                    title="Remove subtopic"
                                  >
                                    <HiOutlineXMark className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Activity & Materials Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 block">
                              Learning Activity (Optional)
                            </label>
                            <input
                              type="text"
                              value={topic.learningActivity || ""}
                              onChange={(e) => updateTopicActivity(tIdx, e.target.value)}
                              placeholder="e.g. Breakout group exercise: Waqf structuring"
                              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                Required External Materials
                              </label>
                              <button
                                type="button"
                                onClick={() => addMaterial(tIdx)}
                                className="text-xs font-bold text-[#FF9800] hover:text-[#FF9800]/80 flex items-center gap-1 cursor-pointer"
                              >
                                <HiOutlinePlus className="w-3.5 h-3.5" /> Add Link
                              </button>
                            </div>

                            {(topic.materials || []).length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic py-2">No external links added for this topic.</p>
                            ) : (
                              <div className="space-y-2">
                                {(topic.materials || []).map((mat, mIdx) => (
                                  <div key={mIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-2 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                                    <input
                                      type="text"
                                      value={mat.label}
                                      onChange={(e) => updateMaterial(tIdx, mIdx, "label", e.target.value)}
                                      placeholder="Label (e.g. DisasterReady)"
                                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                                    />
                                    <input
                                      type="url"
                                      value={mat.url || ""}
                                      onChange={(e) => updateMaterial(tIdx, mIdx, "url", e.target.value)}
                                      placeholder="https://..."
                                      className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeMaterial(tIdx, mIdx)}
                                      className="text-slate-400 hover:text-rose-500 p-1 self-end sm:self-center cursor-pointer transition-colors"
                                      title="Remove material"
                                    >
                                      <HiOutlineXMark className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Topic button at bottom — avoids scrolling back to header */}
                    <button
                      type="button"
                      onClick={addTopic}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-[#000666]/40 hover:bg-slate-50 text-slate-400 hover:text-[#000666] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <HiOutlinePlus className="w-4 h-4 text-[#FF9800]" /> Add Another Topic
                    </button>
                  </div>

                  {/* Expected Outcomes */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-[#000666] uppercase tracking-wider block">
                          Action Items &amp; Deliverables
                        </label>
                        <span className="text-[10px] text-slate-400">Course links, tasks, and certificate instructions (links will be clickable)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openBulkPaste({
                            title: "Manage & Paste Action Items & Deliverables",
                            itemTypeLabel: "Items",
                            existingItems: expectedOutcomes,
                            onApply: (lines, mode) => {
                              if (mode === "append") {
                                setExpectedOutcomes(prev => [...prev.filter(o => o.trim().length > 0), ...lines]);
                              } else {
                                setExpectedOutcomes(lines.length > 0 ? lines : [""]);
                              }
                            }
                          })}
                          className="text-xs font-bold text-[#000666] hover:bg-slate-200/60 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" /> Paste List
                        </button>
                        <button
                          type="button"
                          onClick={addOutcome}
                          className="text-xs font-bold text-[#FF9800] hover:text-[#FF9800]/80 flex items-center gap-1"
                        >
                          <HiOutlinePlus className="w-3.5 h-3.5" /> Add Item
                        </button>
                      </div>
                    </div>
                    {expectedOutcomes.map((outc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                        <input
                          type="text"
                          value={outc}
                          onChange={(e) => updateOutcome(i, e.target.value)}
                          onPaste={(e) => handlePasteOutcomes(e, i)}
                          placeholder="e.g. Complete the AltInstitute course at https://altinstitute.ng/ and upload certificate"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                        />
                        {expectedOutcomes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOutcome(i)}
                            className="text-rose-400 hover:text-rose-600 p-1"
                            title="Remove outcome"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT DELIVERY & BODY */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Content Delivery Format
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-medium"
                        required
                      >
                        <option value="text">E-Book / Text Document</option>
                        <option value="video">Video Lecture</option>
                        <option value="quiz">Knowledge Check Quiz</option>
                        <option value="assignment">Practical Project Submission</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Assigned Cohort (Optional)
                      </label>
                      <select
                        value={moduleCohortId}
                        onChange={(e) => setModuleCohortId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs font-medium"
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
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Video Embed / Stream URL
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

                  {/* PDF Module Document Upload (Available for all module types, primary or companion) */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-3">
                      <div>
                        <label className="text-xs font-bold text-[#000666] flex items-center gap-2">
                          <HiOutlineDocumentText className="w-4 h-4 text-rose-500" />
                          <span>Course Module PDF Document (Downloadable Study Pack)</span>
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Upload the complete module in PDF format. Participants can download and read it on any device. When a PDF is uploaded, written text in the editor below is optional.
                        </p>
                      </div>
                      {pdfUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                          ✓ PDF Attached
                        </span>
                      )}
                    </div>

                    {pdfUploadError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                        <HiOutlineXCircle className="w-4 h-4 shrink-0" />
                        <span>{pdfUploadError}</span>
                      </div>
                    )}

                    {pdfUrl ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <HiOutlineDocumentText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 truncate">
                              {pdfFileName || "Module_Curriculum.pdf"}
                            </h5>
                            <span className="text-[10px] text-slate-400">
                              {pdfFileSize ? `${pdfFileSize} • ` : ""}Ready for participant download
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setPdfUrl("");
                              setPdfFileName("");
                              setPdfFileSize("");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className={`border-2 border-dashed border-slate-200 hover:border-[#000666]/40 hover:bg-slate-50/80 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${uploadingPdf ? "opacity-60 pointer-events-none" : ""}`}>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePdfUpload(file);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                          {uploadingPdf ? (
                            <div className="flex flex-col items-center gap-2">
                              <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="text-xs font-bold text-[#000666]">Uploading PDF document to cloud...</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                <HiOutlineArrowUpTray className="w-5 h-5" />
                              </div>
                              <div className="text-center">
                                <span className="text-xs font-bold text-[#000666] hover:underline">
                                  Click to browse or drop Module PDF
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  PDF documents up to 25MB supported
                                </p>
                              </div>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {(contentType === "text" || contentType === "quiz" || contentType === "assignment") && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Online Reading Material / Text Editor {pdfUrl ? "(Optional — PDF attached)" : "(Optional)"}
                        </label>
                        {pdfUrl && (
                          <span className="text-[10px] text-slate-400 italic">
                            The uploaded PDF above will serve as the primary study pack.
                          </span>
                        )}
                      </div>
                      <RichTextEditor
                        value={body}
                        onChange={(html) => setBody(html)}
                        placeholder="Optional: Write or paste online e-book learning materials, summary notes, or guidance..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons - Well-Aligned Responsive Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                {/* Step navigation between Tab 1 & Tab 2 */}
                <div>
                  {activeTab === "outline" ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("content")}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#000666] hover:text-[#000666]/80 bg-slate-100 hover:bg-slate-200/70 sm:bg-transparent sm:hover:bg-transparent py-2.5 px-3 sm:p-0 rounded-xl transition-colors cursor-pointer"
                    >
                      <span>Next: Learning Content</span>
                      <span>&rarr;</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("outline")}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#000666] hover:text-[#000666]/80 bg-slate-100 hover:bg-slate-200/70 sm:bg-transparent sm:hover:bg-transparent py-2.5 px-3 sm:p-0 rounded-xl transition-colors cursor-pointer"
                    >
                      <span>&larr;</span>
                      <span>Back to Syllabus Outline</span>
                    </button>
                  )}
                </div>

                {/* Primary form actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 sm:flex-initial text-slate-600 hover:text-slate-800 bg-white sm:bg-transparent hover:bg-slate-100 border border-slate-200 sm:border-transparent font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 sm:px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap text-center cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : (editingModule ? "Save Changes" : "Create Module")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Paste Quick Modal */}
      {bulkPasteConfig && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="bg-[#000666] text-white py-3.5 px-5 flex items-center justify-between shrink-0">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <HiOutlineClipboardDocumentList className="w-4 h-4 text-[#FF9800]" /> {bulkPasteConfig.title}
              </h4>
              <button
                type="button"
                onClick={() => setBulkPasteConfig(null)}
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 pt-3 pb-0 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBulkPasteTab("append_new");
                  setBulkPasteText("");
                }}
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${bulkPasteTab === "append_new"
                    ? "border-[#FF9800] text-[#000666]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                <span className="flex items-center gap-1"><HiOutlinePlus className="w-3.5 h-3.5" /> Add New (Keep Existing)</span>
                {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length > 0 && (
                  <span className="bg-[#000666]/10 text-[#000666] px-1.5 py-0.2 rounded-full text-[10px]">
                    {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length} existing
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkPasteTab("edit_all");
                  const clean = bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0);
                  setBulkPasteText(clean.map((item, idx) => `${idx + 1}. ${item}`).join("\n") + (clean.length > 0 ? "\n" : ""));
                }}
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${bulkPasteTab === "edit_all"
                    ? "border-[#FF9800] text-[#000666]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                <span className="flex items-center gap-1"><HiOutlinePencilSquare className="w-3.5 h-3.5" /> Full List Raw Editor (Replace/Edit All)</span>
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto">
              {bulkPasteTab === "append_new" ? (
                <>
                  {/* Visual List of Existing Items */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#000666] flex items-center gap-1.5">
                        <HiOutlineBookmark className="w-3.5 h-3.5 text-[#000666]" /> Currently Saved {bulkPasteConfig.itemTypeLabel} ({bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length})
                      </span>
                      <span className="text-[10px] text-slate-400">Preserved as-is</span>
                    </div>

                    {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length > 0 ? (
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-xs text-slate-700 shadow-2xs">
                            <span className="font-mono font-bold text-[#000666] bg-slate-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-medium leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No existing {bulkPasteConfig.itemTypeLabel.toLowerCase()} yet. All new items will be added.</p>
                    )}
                  </div>

                  {/* Input area for new items */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#000666] flex items-center justify-between">
                      <span className="flex items-center gap-1"><HiOutlinePlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Paste or Type Newer {bulkPasteConfig.itemTypeLabel} Below:</span>
                      <span className="text-[11px] font-normal text-slate-500">Auto-cleans numbers (1., 2.), bullets (•, -)</span>
                    </label>
                    <textarea
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder={`Paste new ${bulkPasteConfig.itemTypeLabel.toLowerCase()} here (one per line)...\ne.g.\n1. ${bulkPasteConfig.itemTypeLabel === "Topics" ? "Islamic FinTech & Digital Economy" : "Understand social impact measurement"}\n2. ${bulkPasteConfig.itemTypeLabel === "Topics" ? "Global Standards & Case Studies" : "Develop actionable project frameworks"}`}
                      className="w-full h-36 p-3 border border-slate-200 rounded-xl text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 leading-relaxed shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Live preview banner */}
                  {cleanPastedLines(bulkPasteText).length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-emerald-600" /> Will add {cleanPastedLines(bulkPasteText).length} new item(s) &rarr; Total {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length + cleanPastedLines(bulkPasteText).length} {bulkPasteConfig.itemTypeLabel}
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1 text-xs text-emerald-950 font-medium pr-1">
                        {cleanPastedLines(bulkPasteText).map((line, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded shrink-0">
                              + #{bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length + idx + 1} New
                            </span>
                            <span className="leading-snug">{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Edit the entire raw list of {bulkPasteConfig.itemTypeLabel.toLowerCase()} below. Each line represents an item. Numbers and bullets are automatically cleaned.
                  </p>
                  <div className="relative">
                    <textarea
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="1. First item...&#10;2. Second item...&#10;3. Third item..."
                      className="w-full h-56 p-3.5 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 leading-relaxed"
                      autoFocus
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span>
                    New lines detected: <strong className="text-[#000666] font-mono">{cleanPastedLines(bulkPasteText).length}</strong>
                  </span>
                  {bulkPasteTab === "append_new" && bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      (+ {bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length} existing = {cleanPastedLines(bulkPasteText).length + bulkPasteConfig.existingItems.filter(i => i && i.trim().length > 0).length} total)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setBulkPasteConfig(null)}
                    className="px-3.5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkPaste}
                    disabled={cleanPastedLines(bulkPasteText).length === 0}
                    className="px-5 py-2 bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>
                      {bulkPasteTab === "append_new"
                        ? `Add +${cleanPastedLines(bulkPasteText).length} ${bulkPasteConfig.itemTypeLabel}`
                        : `Update Full List (${cleanPastedLines(bulkPasteText).length})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Review Modal */}
      {reviewModule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Review Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <HiOutlineEye className="w-6 h-6 text-[#FF9800]" />
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Review Module: #{reviewModule.order} — {reviewModule.title}
                  </h3>
                  <p className="text-xs text-white/70">Inspect module outline & body before publishing to participants</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModule(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Review Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
              {/* Status and Meta Bar */}
              <div className="flex flex-wrap items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 text-xs">Publish Status:</span>
                  {(reviewModule.moduleStatus || reviewModule.status || 'published') === 'draft' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Draft (Hidden from Participants)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Published (Live for Participants)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>Week {reviewModule.weekNumber || reviewModule.order}</span>
                  <span>•</span>
                  <span className="uppercase font-bold text-slate-700">{reviewModule.contentType}</span>
                </div>
              </div>

              {/* Purpose & Overview */}
              <div>
                <h4 className="font-bold text-[#000666] text-xs uppercase tracking-wider mb-1">Module Overview / Purpose</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">{reviewModule.description}</p>
              </div>

              {/* Learning Objectives */}
              {reviewModule.outline?.learningObjectives && reviewModule.outline.learningObjectives.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#000666] text-xs uppercase tracking-wider mb-2">Learning Objectives</h4>
                  <ul className="space-y-1.5 pl-2">
                    {reviewModule.outline.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Topics / Syllabus */}
              {reviewModule.outline?.topics && reviewModule.outline.topics.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#000666] text-xs uppercase tracking-wider mb-2">Syllabus Breakdown ({reviewModule.outline.topics.length} Topics)</h4>
                  <div className="space-y-3">
                    {reviewModule.outline.topics.map((topic, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                        <div className="font-bold text-[#000666]">Topic {i + 1}: {topic.title}</div>
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="text-xs text-slate-500 pl-3 border-l-2 border-slate-200">
                            <strong>Subtopics:</strong> {topic.subtopics.join(', ')}
                          </div>
                        )}
                        {topic.learningActivity && (
                          <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg font-medium">
                            <strong>Activity:</strong> {topic.learningActivity}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Review */}
              {reviewModule.moduleTask && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-[#000666] text-xs uppercase tracking-wider">Module Task Submissions</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Each participant is shown once — review their latest submission and decide. All prior attempts are available in the history accordion.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        {taskSubmissions.length} participant{taskSubmissions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                        {taskSubmissions.filter((e) => e.latestSubmission.status === 'pending_review' || e.latestSubmission.status === 'needs_resubmission' || e.latestSubmission.status === 'submitted').length} pending
                      </span>
                    </div>
                  </div>

                  {taskSubmissionsLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500 text-sm">Loading submissions…</div>
                  ) : taskSubmissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      No submissions have been received for this task yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-[330px_minmax(0,1fr)] gap-4">
                      {/* ── Left: Participant Queue ── */}
                      <div className="border border-slate-200 rounded-2xl bg-slate-50/60 overflow-hidden">
                        <div className="px-3 py-3 border-b border-slate-200 bg-white/80">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">Participants</span>
                            <span className="text-[10px] text-slate-500">{taskSubmissions.filter((e) => e.latestSubmission.status === 'approved').length} approved</span>
                          </div>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-200">
                          {taskSubmissions.map((entry) => {
                            const uid = entry.userId?._id ?? '';
                            const isSelected = selectedTaskParticipantId === uid;
                            const s = entry.latestSubmission;
                            const statusTone = s.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : s.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : s.status === 'needs_resubmission'
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-sky-100 text-sky-700 border-sky-200';

                            return (
                              <button
                                key={uid}
                                type="button"
                                onClick={() => setSelectedTaskParticipantId(uid)}
                                className={`w-full text-left px-3 py-3 transition-all ${isSelected ? 'bg-white border-l-4 border-[#000666]' : 'hover:bg-white/80'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-slate-800 truncate">
                                      {entry.userId?.fullName || 'Participant'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">{entry.userId?.email || 'No email on record'}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full border ${statusTone}`}>
                                      {s.status.replace(/_/g, ' ')}
                                    </span>
                                    {entry.totalAttempts > 1 && (
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                                        {entry.totalAttempts} attempts
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1.5 text-[11px] text-slate-400">
                                  Latest: {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'Unknown'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Right: Review Detail Panel ── */}
                      <div className="border border-slate-200 rounded-2xl bg-white p-4 shadow-sm min-h-[360px]">
                        {(() => {
                          const entry = taskSubmissions.find((e) => e.userId?._id === selectedTaskParticipantId) ?? taskSubmissions[0];
                          if (!entry) return null;
                          const selectedSubmission = entry.latestSubmission;

                          const draft = taskReviewDrafts[selectedSubmission._id] || {
                            status: 'pending_review' as const,
                            points: selectedSubmission.pointsAwarded || 0,
                            feedback: selectedSubmission.adminFeedback || '',
                          };

                          return (
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                <div>
                                  <div className="font-black text-[#000666] text-base">
                                    {entry.userId?.fullName || 'Participant'}
                                  </div>
                                  <div className="text-xs text-slate-500">{entry.userId?.email || 'No email on record'}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${draft.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : draft.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                                      : draft.status === 'needs_resubmission'
                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                        : 'bg-sky-100 text-sky-700 border-sky-200'
                                    }`}>
                                    {draft.status.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">{entry.totalAttempts} attempt{entry.totalAttempts !== 1 ? 's' : ''} total</span>
                                </div>
                              </div>

                              {/* Latest Submission Files */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
                                <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em] font-bold">Latest Submission</div>
                                <div className="text-xs text-slate-600">
                                  Submitted: {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Unknown'}
                                  {selectedSubmission.attemptNumber && (
                                    <span className="ml-2 bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      Attempt #{selectedSubmission.attemptNumber}
                                    </span>
                                  )}
                                </div>

                                {selectedSubmission.files && selectedSubmission.files.length > 0 ? (
                                  <div className="space-y-1.5 pt-1">
                                    <div className="text-[11px] font-bold text-slate-700">Uploaded Evidence ({selectedSubmission.files.length}):</div>
                                    <div className="flex flex-col gap-2">
                                      {selectedSubmission.files.map((file, idx) => (
                                        <a
                                          key={idx}
                                          href={file.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:border-[#000666] hover:text-[#000666] transition-all shadow-2xs group"
                                        >
                                          <span className="truncate pr-2">{file.fileName || `Evidence file ${idx + 1}`}</span>
                                          <span className="text-[10px] font-bold text-[#000666] bg-sky-50 px-2 py-0.5 rounded border border-sky-100 shrink-0 group-hover:bg-[#000666] group-hover:text-white transition-all">Open ↗</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                ) : selectedSubmission.fileUrl ? (
                                  <div className="pt-1">
                                    <a
                                      href={selectedSubmission.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:border-[#000666] hover:text-[#000666] transition-all shadow-2xs group"
                                    >
                                      <span className="truncate pr-2">{selectedSubmission.fileName || 'Uploaded evidence file'}</span>
                                      <span className="text-[10px] font-bold text-[#000666] bg-sky-50 px-2 py-0.5 rounded border border-sky-100 shrink-0 group-hover:bg-[#000666] group-hover:text-white transition-all">Open ↗</span>
                                    </a>
                                  </div>
                                ) : null}

                                {selectedSubmission.note && (
                                  <div className="text-xs text-slate-700 rounded-xl bg-white border border-slate-200 p-3 mt-2 space-y-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Learner Note</div>
                                    <p className="leading-relaxed">{selectedSubmission.note}</p>
                                  </div>
                                )}
                              </div>

                              {/* Prior Attempts Accordion */}
                              {entry.allSubmissions.length > 1 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === selectedSubmission._id ? null : selectedSubmission._id)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                  >
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>📋</span> Prior Attempts ({entry.allSubmissions.length - 1})
                                    </span>
                                    <span className="text-slate-400 text-xs">{expandedHistoryId === selectedSubmission._id ? '▲ Hide' : '▼ Show'}</span>
                                  </button>
                                  {expandedHistoryId === selectedSubmission._id && (
                                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                      {entry.allSubmissions.slice(1).map((prev, idx) => (
                                        <div key={prev._id} className="px-3.5 py-2.5 bg-white space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-700">
                                              Attempt #{prev.attemptNumber ?? (entry.allSubmissions.length - idx - 1)}
                                            </span>
                                            <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              {prev.status.replace(/_/g, ' ')}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            {prev.submittedAt ? new Date(prev.submittedAt).toLocaleString() : 'Unknown'}
                                          </div>
                                          {(prev.files && prev.files.length > 0) || prev.fileUrl ? (
                                            <a
                                              href={prev.files?.[0]?.fileUrl ?? prev.fileUrl ?? '#'}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[11px] text-sky-600 hover:underline font-semibold"
                                            >
                                              View file ↗
                                            </a>
                                          ) : null}
                                          {prev.adminFeedback && (
                                            <div className="text-[11px] text-slate-500 italic">Feedback: "{prev.adminFeedback}"</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Review Controls */}
                              <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Decision</label>
                                    <select
                                      value={draft.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value as 'approved' | 'rejected' | 'needs_resubmission' | 'pending_review';
                                        setTaskReviewDrafts(prev => {
                                          const current = prev[selectedSubmission._id] || {
                                            status: 'pending_review' as const,
                                            points: selectedSubmission.pointsAwarded || 0,
                                            feedback: selectedSubmission.adminFeedback || '',
                                          };
                                          return {
                                            ...prev,
                                            [selectedSubmission._id]: {
                                              ...current,
                                              status: newStatus,
                                              points: newStatus === 'approved' ? (current.points === 0 ? 5 : current.points) : current.points,
                                            },
                                          };
                                        });
                                      }}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    >
                                      <option value="pending_review">Keep under review</option>
                                      <option value="approved">Approved ✓</option>
                                      <option value="needs_resubmission">Request resubmission</option>
                                      <option value="rejected">Not accepted</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Points</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={draft.points}
                                      onChange={(e) => setTaskReviewDrafts(prev => ({
                                        ...prev,
                                        [selectedSubmission._id]: { ...prev[selectedSubmission._id], points: Number(e.target.value || 0) },
                                      }))}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Feedback to Participant</label>
                                  <textarea
                                    rows={3}
                                    value={draft.feedback}
                                    onChange={(e) => setTaskReviewDrafts(prev => ({
                                      ...prev,
                                      [selectedSubmission._id]: { ...prev[selectedSubmission._id], feedback: e.target.value },
                                    }))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    placeholder="Add comments or guidance to send back to the participant..."
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleTaskReview(selectedSubmission._id)}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                                >
                                  Save Review & Notify Participant
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Lesson Body Content Preview */}
              {reviewModule.body && (
                <div>
                  <h4 className="font-bold text-[#000666] text-xs uppercase tracking-wider mb-2">Lesson Material Body Content</h4>
                  <div
                    className="prose prose-sm max-w-none bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: reviewModule.body }}
                  />
                </div>
              )}
            </div>

            {/* Review Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const modToEdit = reviewModule;
                  setReviewModule(null);
                  handleOpenEdit(modToEdit);
                }}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
              >
                <HiOutlinePencilSquare className="w-4 h-4 text-sky-600" />
                Edit Module Details
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModule(null)}
                  className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-200/60 rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
                {(reviewModule.moduleStatus || reviewModule.status || 'published') === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => handlePublish(reviewModule._id)}
                    disabled={publishingId === reviewModule._id}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <HiOutlineArrowUpTray className="w-4 h-4" />
                    {publishingId === reviewModule._id ? "Publishing..." : "Approve & Publish Module"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnpublish(reviewModule._id)}
                    disabled={publishingId === reviewModule._id}
                    className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <HiOutlineArrowDownTray className="w-4 h-4 text-amber-700" />
                    {publishingId === reviewModule._id ? "Updating..." : "Revert to Draft"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

