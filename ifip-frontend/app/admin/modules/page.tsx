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
  HiOutlinePlusCircle
} from "react-icons/hi2";
import { 
  getLMSModules, 
  createLMSModule, 
  updateLMSModule, 
  deleteLMSModule, 
  LMSModule,
  ModuleOutline,
  TopicOutline 
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";
import RichTextEditor from "@/components/RichTextEditor";

export default function AdminModulesPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"outline" | "content">("outline");
  const [editingModule, setEditingModule] = useState<LMSModule | null>(null);
  
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
  const [moduleCohortId, setModuleCohortId] = useState("");

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
      const data = await getLMSModules();
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
    setActiveTab("outline");
    setTitle("");
    setDescription("");
    const nextOrder = modules.length > 0 ? modules[modules.length - 1].order + 1 : 1;
    setOrder(nextOrder);
    setWeekNumber(nextOrder <= 4 ? nextOrder : 1);
    setContentType("text");
    setContentUrl("");
    setBody("");
    setModuleCohortId((selectedCohortId === "unassigned") ? "" : selectedCohortId);
    
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
    setModuleCohortId((mod as any).cohortId || "");

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

    const payload = {
      title,
      description,
      order: Number(order),
      contentType,
      contentUrl: contentUrl || undefined,
      body: body || undefined,
      outline: outlinePayload,
      weekNumber: Number(weekNumber),
      cohortId: moduleCohortId || undefined
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
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
              &larr; Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
            <HiOutlineBookOpen className="w-8 h-8 text-[#FF9800] shrink-0" />
            <span>Curriculum Coursework & Outline Editor</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Separate structural outlines (objectives & syllabus breakdown) from content delivery (e-book, readings & assessments).
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0 mt-2 md:mt-0 flex gap-3">
          <Link
            href="/admin/schedule"
            className="w-full md:w-auto bg-white border border-[#000666] text-[#000666] hover:bg-slate-50 font-bold text-xs tracking-wider uppercase px-4 py-3.5 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
          >
            <HiOutlineClock className="w-4 h-4 text-[#FF9800]" />
            Manage Timetable
          </Link>
          <button
            onClick={handleOpenCreate}
            className="w-full md:w-auto bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
          >
            <HiOutlinePlus className="w-4 h-4 text-[#FF9800]" />
            Create Module
          </button>
        </div>
      </div>

      {/* Modules Table List */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Lesson & Outline Status</th>
                <th className="px-6 py-3.5">Schedule / Week</th>
                <th className="px-6 py-3.5">Assigned Cohort</th>
                <th className="px-6 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No coursework modules configured. Click "Create Module" to begin.
                  </td>
                </tr>
              ) : (
                modules.map((mod) => (
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
                        <span>{mod.description}</span>
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
                        </div>
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
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEdit(mod)}
                        className="text-[#00B0FF] hover:text-[#00B0FF]/80 inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" /> Edit Outline & Content
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

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {modules.length === 0 ? (
            <p className="px-6 py-12 text-center text-slate-400 text-xs italic">
              No coursework modules configured. Click "Create Module" to begin.
            </p>
          ) : (
            modules.map((mod) => (
              <div key={mod._id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#000666] bg-[#000666]/5 px-2 py-0.5 rounded mr-2">
                      #{mod.order}
                    </span>
                    <span className="font-bold text-[#000666] text-sm">{mod.title}</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded shrink-0">
                    {mod.contentType}
                  </span>
                </div>
                {mod.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{mod.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-[11px]">
                      <HiOutlineCalendar className="w-3 h-3 text-amber-700" /> Week {mod.weekNumber || mod.order}
                    </span>
                    {(mod as any).cohortId ? (
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded">
                        {cohorts.find(c => c._id === (mod as any).cohortId)?.name || "Cohort Linked"}
                      </span>
                    ) : (
                      <span className="bg-slate-50 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded">
                        Global
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(mod)}
                      className="text-[#00B0FF] hover:text-[#00B0FF]/80 inline-flex items-center gap-1 font-bold text-xs"
                    >
                      <HiOutlinePencilSquare className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(mod._id)}
                      className="text-rose-500 hover:text-rose-600 inline-flex items-center gap-1 font-bold text-xs"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coursework & Outline Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <HiOutlineAcademicCap className="w-5 h-5 text-[#FF9800]" /> 
                {editingModule ? "Edit Module Outline & Content" : "Create Learning Module"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("outline")}
                className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "outline"
                    ? "border-[#FF9800] text-[#000666] bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <HiOutlineListBullet className="w-4 h-4 text-[#FF9800]" />
                Tab 1 — Syllabus & Module Outline (What is taught)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "content"
                    ? "border-[#FF9800] text-[#000666] bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <HiOutlineDocumentText className="w-4 h-4 text-[#FF9800]" />
                Tab 2 — Content Delivery & Body (Learning material)
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
              {/* General module info displayed in both tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
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
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                    Module Purpose & Overview Summary *
                  </label>
                  <textarea 
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setPurpose(e.target.value);
                    }}
                    placeholder="Describe why this module exists, its overview summary, and fundamental principles imparted..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 text-xs h-[72px] bg-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
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
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                      Programme Week
                    </label>
                    <select 
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white font-medium"
                    >
                      <option value={1}>Week 1 — Foundations</option>
                      <option value={2}>Week 2 — Core Contracts</option>
                      <option value={3}>Week 3 — Capital Markets</option>
                      <option value={4}>Week 4 — Governance & Capstone</option>
                    </select>
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
                      <div key={tIdx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                          <span className="font-mono text-xs font-bold text-[#000666] bg-slate-100 px-2 py-0.5 rounded shrink-0">
                            Topic #{tIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopicTitle(tIdx, e.target.value)}
                            onPaste={(e) => handlePasteTopicTitle(e, tIdx)}
                            placeholder="e.g. 1.1 Overview of Islamic Social Finance Tools (or paste multi-line topic list)"
                            className="flex-1 font-bold text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          {topics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTopic(tIdx)}
                              className="text-rose-400 hover:text-rose-600 p-1 shrink-0"
                              title="Remove topic"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Subtopics */}
                        <div className="pl-4 border-l-2 border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500">Subtopics / Bullet Points (Multi-line paste supported)</span>
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
                                className="text-[11px] text-[#000666] font-semibold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1"
                              >
                                <HiOutlineClipboardDocumentList className="w-3 h-3" /> Paste Subtopics
                              </button>
                              <button
                                type="button"
                                onClick={() => addSubtopic(tIdx)}
                                className="text-[11px] text-sky-600 hover:underline font-semibold"
                              >
                                + Add Subtopic
                              </button>
                            </div>
                          </div>
                          {(topic.subtopics || []).map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <span className="text-slate-400 text-xs">•</span>
                              <input
                                type="text"
                                value={sub}
                                onChange={(e) => updateSubtopic(tIdx, sIdx, e.target.value)}
                                onPaste={(e) => handlePasteSubtopics(e, tIdx, sIdx)}
                                placeholder="Subtopic key concept (or paste multi-line bullet points)..."
                                className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                              />
                              {(topic.subtopics || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSubtopic(tIdx, sIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-0.5"
                                  title="Remove subtopic"
                                >
                                  <HiOutlineXMark className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Activity & Materials */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                              Learning Activity (Optional)
                            </label>
                            <input
                              type="text"
                              value={topic.learningActivity || ""}
                              onChange={(e) => updateTopicActivity(tIdx, e.target.value)}
                              placeholder="e.g. Breakout group exercise: Waqf structuring"
                              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Required External Materials
                              </label>
                              <button
                                type="button"
                                onClick={() => addMaterial(tIdx)}
                                className="text-[10px] text-sky-600 font-semibold"
                              >
                                + Add Link
                              </button>
                            </div>
                            {(topic.materials || []).map((mat, mIdx) => (
                              <div key={mIdx} className="flex items-center gap-1.5 mb-1">
                                <input
                                  type="text"
                                  value={mat.label}
                                  onChange={(e) => updateMaterial(tIdx, mIdx, "label", e.target.value)}
                                  placeholder="Label (e.g. DisasterReady)"
                                  className="w-1/2 text-[11px] px-2 py-1 border border-slate-200 rounded bg-white"
                                />
                                <input
                                  type="url"
                                  value={mat.url || ""}
                                  onChange={(e) => updateMaterial(tIdx, mIdx, "url", e.target.value)}
                                  placeholder="https://..."
                                  className="w-1/2 text-[11px] px-2 py-1 border border-slate-200 rounded bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeMaterial(tIdx, mIdx)}
                                  className="text-slate-400 hover:text-rose-500"
                                >
                                  <HiOutlineXMark className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
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
                          Expected Outcomes
                        </label>
                        <span className="text-[10px] text-slate-400">Paste multi-line text directly below or use the bulk paste tool</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openBulkPaste({
                            title: "Manage & Paste Expected Outcomes",
                            itemTypeLabel: "Outcomes",
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
                          <HiOutlinePlus className="w-3.5 h-3.5" /> Add Outcome
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
                          placeholder="e.g. Capable of designing Shariah-compliant emergency relief funds (or paste multi-line list)"
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

                  {(contentType === "text" || contentType === "quiz" || contentType === "assignment") && (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block">
                        Curriculum Document Body / E-Book Reading Content
                      </label>
                      <RichTextEditor 
                        value={body}
                        onChange={(html) => setBody(html)}
                        placeholder="Write or paste your e-book learning materials, case studies, embedded references, questions..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-400">
                  {activeTab === "outline" ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("content")}
                      className="text-[#000666] font-bold hover:underline"
                    >
                      Next: Delivery Content &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("outline")}
                      className="text-[#000666] font-bold hover:underline"
                    >
                      &larr; Back to Syllabus Outline
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
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
                    className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
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
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                  bulkPasteTab === "append_new"
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
                className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                  bulkPasteTab === "edit_all"
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
    </div>
  );
}

