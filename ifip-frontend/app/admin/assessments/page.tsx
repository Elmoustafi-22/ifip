"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { 
  HiOutlineDocumentText, 
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineAcademicCap,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineArrowRight,
  HiOutlinePlay,
  HiOutlineArchiveBox,
  HiOutlineQuestionMarkCircle
} from "react-icons/hi2";
import { 
  adminGetAssessments, 
  adminCreateAssessment, 
  adminUpdateAssessment, 
  adminPublishAssessment, 
  adminArchiveAssessment, 
  adminDeleteAssessment,
  getLMSModules,
  LMSModule
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

interface Option {
  _id: string; // client-generated temp ID or server Mongo ID
  text: string;
}

interface Question {
  _id?: string;
  text: string;
  type: 'mcq' | 'multi_select' | 'true_false' | 'short_answer';
  options: Option[];
  correctOptionIds: string[];
  partialCredit: boolean;
  points: number;
  order: number;
}

export default function AdminAssessmentsPage() {
  const { cohorts } = useContext(AdminCohortContext);
  
  // View states: 'list' | 'builder'
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [modules, setModules] = useState<LMSModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [passMark, setPassMark] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [retakeCooldownHours, setRetakeCooldownHours] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [assessmentsData, modulesData] = await Promise.all([
        adminGetAssessments(),
        getLMSModules()
      ]);
      setAssessments(assessmentsData);
      setModules(modulesData);
    } catch (err) {
      console.error("Failed to load assessments page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenCreate = () => {
    setEditingAssessmentId(null);
    setTitle("");
    setInstructions("");
    // Find first module without assessment
    const unlinkedModule = modules.find(m => !assessments.some(a => a.moduleId?._id === m._id));
    setModuleId(unlinkedModule ? unlinkedModule._id : "");
    setPassMark(70);
    setMaxAttempts(3);
    setHasTimeLimit(false);
    setTimeLimitMinutes(30);
    setRetakeCooldownHours(0);
    setQuestions([]);
    setView('builder');
  };

  const handleOpenEdit = async (assessment: any) => {
    setEditingAssessmentId(assessment._id);
    setTitle(assessment.title);
    setInstructions(assessment.instructions || "");
    setModuleId(assessment.moduleId?._id || "");
    setPassMark(assessment.passMark);
    setMaxAttempts(assessment.maxAttempts);
    setHasTimeLimit(assessment.timeLimitMinutes !== null);
    setTimeLimitMinutes(assessment.timeLimitMinutes || 30);
    setRetakeCooldownHours(assessment.retakeCooldownHours || 0);
    
    // Format options with correct IDs and cast questions
    const formattedQuestions = assessment.questions.map((q: any) => ({
      _id: q._id,
      text: q.text,
      type: q.type,
      options: q.options || [],
      correctOptionIds: q.correctOptionIds || [],
      partialCredit: q.partialCredit || false,
      points: q.points || 1,
      order: q.order
    }));

    setQuestions(formattedQuestions.sort((a: any, b: any) => a.order - b.order));
    setView('builder');
  };

  const handlePublish = async (id: string) => {
    if (!confirm("Are you sure you want to publish this assessment? Participants will be able to take it immediately upon unlocking the module coursework.")) return;
    try {
      await adminPublishAssessment(id);
      alert("Assessment published successfully!");
      fetchInitialData();
    } catch (err) {
      console.error("Failed to publish assessment:", err);
      alert("Failed to publish assessment.");
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this assessment? It will no longer be visible to participants, and cannot be edited further.")) return;
    try {
      await adminArchiveAssessment(id);
      alert("Assessment archived successfully.");
      fetchInitialData();
    } catch (err) {
      console.error("Failed to archive assessment:", err);
      alert("Failed to archive assessment.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment draft? This action is irreversible.")) return;
    try {
      await adminDeleteAssessment(id);
      alert("Assessment deleted successfully.");
      fetchInitialData();
    } catch (err) {
      console.error("Failed to delete assessment:", err);
      alert("Failed to delete assessment.");
    }
  };

  // --- Question Builder Helpers ---

  const generateTempId = () => {
    return 'opt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      text: "",
      type: "mcq",
      options: [
        { _id: generateTempId(), text: "Option 1" },
        { _id: generateTempId(), text: "Option 2" }
      ],
      correctOptionIds: [],
      partialCredit: false,
      points: 1,
      order: questions.length
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (qIndex: number) => {
    const updated = questions.filter((_, idx) => idx !== qIndex).map((q, idx) => ({ ...q, order: idx }));
    setQuestions(updated);
  };

  const updateQuestionField = (qIndex: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], [field]: value };
    setQuestions(updated);
  };

  const updateQuestionType = (qIndex: number, type: Question['type']) => {
    const updated = [...questions];
    const q = updated[qIndex];
    q.type = type;
    
    if (type === 'true_false') {
      const optTrueId = generateTempId();
      const optFalseId = generateTempId();
      q.options = [
        { _id: optTrueId, text: "True" },
        { _id: optFalseId, text: "False" }
      ];
      q.correctOptionIds = [optTrueId]; // default correct True
    } else if (type === 'short_answer') {
      q.options = [];
      q.correctOptionIds = [];
    } else if (q.options.length === 0) {
      q.options = [
        { _id: generateTempId(), text: "Option 1" },
        { _id: generateTempId(), text: "Option 2" }
      ];
      q.correctOptionIds = [];
    }
    
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({ _id: generateTempId(), text: "" });
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    const q = updated[qIndex];
    const removedOptionId = q.options[oIndex]._id;
    q.options = q.options.filter((_, idx) => idx !== oIndex);
    q.correctOptionIds = q.correctOptionIds.filter(id => id !== removedOptionId);
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex].text = text;
    setQuestions(updated);
  };

  const toggleOptionCorrectness = (qIndex: number, optionId: string) => {
    const updated = [...questions];
    const q = updated[qIndex];
    
    if (q.type === 'mcq' || q.type === 'true_false') {
      q.correctOptionIds = [optionId];
    } else if (q.type === 'multi_select') {
      if (q.correctOptionIds.includes(optionId)) {
        q.correctOptionIds = q.correctOptionIds.filter(id => id !== optionId);
      } else {
        q.correctOptionIds.push(optionId);
      }
    }
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate form
    if (!moduleId) {
      alert("Please select a module to attach this assessment to.");
      return;
    }
    if (!title.trim()) {
      alert("Assessment title is required.");
      return;
    }
    if (questions.length === 0) {
      alert("Please add at least one question to the assessment.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        alert(`Question #${i + 1} text cannot be empty.`);
        return;
      }
      if (q.type !== 'short_answer' && q.correctOptionIds.length === 0) {
        alert(`Question #${i + 1} ("${q.text.substring(0, 20)}...") requires at least one correct option selected.`);
        return;
      }
      if (q.type !== 'short_answer') {
        const hasEmptyOption = q.options.some(opt => !opt.text.trim());
        if (hasEmptyOption) {
          alert(`All options in Question #${i + 1} must have descriptive text.`);
          return;
        }
      }
    }

    setSubmitting(true);

    const payload = {
      moduleId,
      title,
      instructions,
      passMark: Number(passMark),
      maxAttempts: Number(maxAttempts),
      timeLimitMinutes: hasTimeLimit ? Number(timeLimitMinutes) : null,
      retakeCooldownHours: Number(retakeCooldownHours),
      questions
    };

    try {
      if (editingAssessmentId) {
        await adminUpdateAssessment(editingAssessmentId, payload);
        alert("Assessment saved successfully.");
      } else {
        await adminCreateAssessment(payload);
        alert("New assessment created as Draft successfully.");
      }
      setView('list');
      fetchInitialData();
    } catch (err: any) {
      console.error("Failed to save assessment:", err);
      alert(err.message || "Failed to save assessment. Please check input requirements.");
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
        <p className="text-slate-500 font-medium text-sm">Opening assessments dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {view === 'list' ? (
        <>
          {/* List View Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="mb-2">
                <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
                  ← Back to Overview
                </Link>
              </div>
              <h1 className="text-2xl font-bold font-display text-[#000666]">Course Assessments</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configure module-gating assessments, view submissions, and grade participant coursework.
              </p>
            </div>
            
            <button
              onClick={handleOpenCreate}
              className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 py-3 rounded-[4px] flex items-center gap-2 shadow-sm transition-all"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Create Assessment
            </button>
          </div>

          {/* Assessment Table */}
          {assessments.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <HiOutlineDocumentText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-[#000666] mb-1">No Assessments Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6 font-medium">
                Create evaluations to gate the module transition in the Islamic Finance curriculum.
              </p>
              <button
                onClick={handleOpenCreate}
                className="border border-[#000666] hover:bg-slate-50 text-[#000666] font-bold text-xs px-4 py-2.5 rounded-[4px] transition-all"
              >
                Set Up First Assessment
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-150/70 rounded-2xl overflow-hidden shadow-sm">
              {/* Desktop view Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Assessment Title</th>
                      <th className="py-4 px-6">Linked Module</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Pass Mark</th>
                      <th className="py-4 px-6 text-center">Attempts Allowed</th>
                      <th className="py-4 px-6 text-center">Questions</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-[#000666]">
                    {assessments.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold">{item.title}</td>
                        <td className="py-4 px-6">
                          {item.moduleId ? (
                            <span className="bg-slate-100 border border-slate-200/50 rounded px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Mod {item.moduleId.order}: {item.moduleId.title}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unlinked</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            item.status === 'published' 
                              ? 'bg-emerald-55/10 border border-emerald-100 text-emerald-700' 
                              : item.status === 'archived'
                              ? 'bg-red-50 border border-red-100 text-red-600'
                              : 'bg-slate-100 border border-slate-200 text-slate-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-500">{item.passMark}%</td>
                        <td className="py-4 px-6 text-center text-slate-500">{item.maxAttempts}</td>
                        <td className="py-4 px-6 text-center text-slate-500">{item.questions?.length || 0}</td>
                        <td className="py-4 px-6 text-right font-medium">
                          <div className="flex justify-end gap-1.5">
                            <Link
                              href={`/admin/assessments/${item._id}`}
                              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all"
                              title="View Submissions"
                            >
                              <HiOutlineEye className="w-4 h-4" /> Submissions
                            </Link>
                            
                            {item.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition-all"
                                  title="Edit Draft"
                                >
                                  <HiOutlinePencilSquare className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePublish(item._id)}
                                  className="p-2 border border-slate-200 hover:bg-emerald-50 text-emerald-600 rounded transition-all"
                                  title="Publish Assessment"
                                >
                                  <HiOutlinePlay className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id)}
                                  className="p-2 border border-slate-200 hover:bg-red-50 text-red-500 rounded transition-all"
                                  title="Delete Draft"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {item.status === 'published' && (
                              <button
                                onClick={() => handleArchive(item._id)}
                                className="p-2 border border-slate-200 hover:bg-amber-50 text-amber-600 rounded transition-all"
                                title="Archive Assessment"
                              >
                                <HiOutlineArchiveBox className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="block md:hidden divide-y divide-slate-100 bg-white">
                {assessments.map((item) => (
                  <div key={item._id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-[#000666] text-sm">{item.title}</h4>
                        <div className="mt-1">
                          {item.moduleId ? (
                            <span className="bg-slate-100 border border-slate-200/50 rounded px-2 py-0.5 text-[9px] font-bold text-slate-600">
                              Mod {item.moduleId.order}: {item.moduleId.title}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Unlinked</span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        item.status === 'published' 
                          ? 'bg-emerald-55/10 border border-emerald-100 text-emerald-700' 
                          : item.status === 'archived'
                          ? 'bg-red-55/10 border border-red-100 text-red-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-650'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-center text-xs">
                      <div>
                        <span className="text-slate-405 text-[9px] block uppercase font-bold">Pass Mark</span>
                        <span className="font-bold text-slate-700">{item.passMark}%</span>
                      </div>
                      <div>
                        <span className="text-slate-405 text-[9px] block uppercase font-bold">Attempts</span>
                        <span className="font-bold text-slate-700">{item.maxAttempts}</span>
                      </div>
                      <div>
                        <span className="text-slate-405 text-[9px] block uppercase font-bold">Questions</span>
                        <span className="font-bold text-slate-700">{item.questions?.length || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-55 text-xs">
                      <Link
                        href={`/admin/assessments/${item._id}`}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5" /> Submissions
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {item.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded transition-all"
                              title="Edit Draft"
                            >
                              <HiOutlinePencilSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePublish(item._id)}
                              className="p-1.5 border border-slate-200 hover:bg-emerald-50 text-emerald-600 rounded transition-all"
                              title="Publish Assessment"
                            >
                              <HiOutlinePlay className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 border border-slate-200 hover:bg-red-50 text-red-500 rounded transition-all"
                              title="Delete Draft"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {item.status === 'published' && (
                          <button
                            onClick={() => handleArchive(item._id)}
                            className="p-1.5 border border-slate-200 hover:bg-amber-50 text-amber-600 rounded transition-all"
                            title="Archive Assessment"
                          >
                            <HiOutlineArchiveBox className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Builder Form View */
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white border border-slate-150/70 rounded-3xl shadow-sm p-8 text-left">
          {/* Builder Header */}
          <div className="border-b border-slate-100 pb-6 mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold font-display text-[#000666]">
                {editingAssessmentId ? "Edit Assessment Draft" : "Create Gating Assessment"}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {editingAssessmentId 
                  ? "Modifying draft properties. Once published, configurations become read-only." 
                  : "Set up evaluation parameters and construct the module questionnaire."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('list')}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
            >
              <HiOutlineXMark className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Row 1: Module and Title */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Module Link</label>
                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  disabled={!!editingAssessmentId}
                  className="w-full border border-slate-200 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#000666] bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed font-semibold text-[#000666]"
                >
                  <option value="">-- Choose Module --</option>
                  {modules.map((m) => {
                    const hasAssessment = assessments.some(a => a.moduleId?._id === m._id && a._id !== editingAssessmentId);
                    return (
                      <option key={m._id} value={m._id} disabled={hasAssessment}>
                        Mod {m.order}: {m.title} {hasAssessment ? "(Assigned)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Assessment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Module 1 Assessment: Introduction to Shariah Gating"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666]"
                />
              </div>
            </div>

            {/* Row 2: Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 bg-slate-50/50 p-6 border border-slate-100 rounded-2xl">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Pass Mark (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passMark}
                  onChange={(e) => setPassMark(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-full border border-slate-200 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Max Attempts</label>
                <input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-200 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Retake Cooldown (Hours)</label>
                <input
                  type="number"
                  min={0}
                  value={retakeCooldownHours}
                  onChange={(e) => setRetakeCooldownHours(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-200 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                  placeholder="0 = No cooldown"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">Time Limit</label>
                <div className="flex items-center gap-3 h-10">
                  <input
                    type="checkbox"
                    id="hasTimeLimit"
                    checked={hasTimeLimit}
                    onChange={(e) => setHasTimeLimit(e.target.checked)}
                    className="w-4 h-4 rounded text-[#000666] border-slate-200 focus:ring-[#000666]"
                  />
                  {hasTimeLimit ? (
                    <input
                      type="number"
                      min={1}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Math.max(1, Number(e.target.value)))}
                      className="w-20 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No limit</span>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Instructions (Visible above questions)</label>
              <textarea
                rows={3}
                placeholder="Provide instructions regarding assessment duration, attempt counts, and expectations..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full border border-slate-200 rounded p-4 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666]"
              />
            </div>

            {/* Questions Header */}
            <div className="border-t border-slate-100 pt-8 mt-8 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#000666]">Questionnaire Builder</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Construct the items. Supported formats: MCQs, Multi-selects, True/False, and Open Text.</p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="border border-[#000666] hover:bg-slate-50 text-[#000666] font-bold text-xs px-4 py-2.5 rounded-[4px] flex items-center gap-1.5 shadow-sm transition-all"
              >
                <HiOutlinePlus className="w-4 h-4" /> Add Question
              </button>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <HiOutlineQuestionMarkCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-4">No questions created yet. Click the button to add your first question.</p>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-[#000666] font-bold text-xs px-3.5 py-2 rounded shadow-sm transition-all"
                >
                  Create Question
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="border border-slate-150/70 rounded-2xl p-6 relative bg-white shadow-sm space-y-4 hover:border-slate-300 transition-colors">
                    {/* Floating Delete */}
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-50 transition-colors"
                      title="Remove Question"
                    >
                      <HiOutlineTrash className="w-4.5 h-4.5" />
                    </button>

                    {/* Question Meta Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Question #{qIdx + 1}</label>
                        <input
                          type="text"
                          placeholder="e.g. What does 'Riba' translate to?"
                          value={q.text}
                          onChange={(e) => updateQuestionField(qIdx, "text", e.target.value)}
                          className="w-full border border-slate-200 rounded px-3 py-2.5 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666]"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Type</label>
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestionType(qIdx, e.target.value as any)}
                          className="w-full border border-slate-200 rounded px-3 py-2.5 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                        >
                          <option value="mcq">Single Choice (MCQ)</option>
                          <option value="multi_select">Multiple Select</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Open text (Short Answer)</option>
                        </select>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Points</label>
                          <input
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={(e) => updateQuestionField(qIdx, "points", Math.max(1, Number(e.target.value)))}
                            className="w-full border border-slate-200 rounded px-3 py-2.5 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666]"
                          />
                        </div>
                        {q.type === 'multi_select' && (
                          <div className="flex flex-col items-start min-h-[38px] justify-end">
                            <label className="flex items-center gap-2 cursor-pointer pb-2">
                              <input
                                type="checkbox"
                                checked={q.partialCredit}
                                onChange={(e) => updateQuestionField(qIdx, "partialCredit", e.target.checked)}
                                className="w-3.5 h-3.5 text-[#000666] border-slate-200 focus:ring-[#000666]"
                              />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Partial Cred.</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question Answers Block */}
                    {q.type !== 'short_answer' && (
                      <div className="border-t border-slate-50 pt-4 space-y-3 bg-slate-50/50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Options & Correct Correctness</span>
                          {q.type !== 'true_false' && (
                            <button
                              type="button"
                              onClick={() => addOption(qIdx)}
                              className="text-[9px] font-bold uppercase tracking-wider text-[#000666] hover:underline flex items-center gap-0.5"
                            >
                              + Add Option
                            </button>
                          )}
                        </div>

                        {q.options.map((opt, oIdx) => (
                          <div key={opt._id} className="flex items-center gap-3">
                            {/* Marker check */}
                            {q.type === 'mcq' || q.type === 'true_false' ? (
                              <input
                                type="radio"
                                name={`q_correct_${qIdx}`}
                                checked={q.correctOptionIds.includes(opt._id)}
                                onChange={() => toggleOptionCorrectness(qIdx, opt._id)}
                                className="w-4.5 h-4.5 text-[#000666] border-slate-200 focus:ring-[#000666]"
                                title="Mark as Correct Answer"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={q.correctOptionIds.includes(opt._id)}
                                onChange={() => toggleOptionCorrectness(qIdx, opt._id)}
                                className="w-4.5 h-4.5 rounded text-[#000666] border-slate-200 focus:ring-[#000666]"
                                title="Mark as Correct Answer"
                              />
                            )}

                            {/* Option Text Input */}
                            <input
                              type="text"
                              placeholder={`Option ${oIdx + 1}`}
                              value={opt.text}
                              onChange={(e) => updateOptionText(qIdx, oIdx, e.target.value)}
                              disabled={q.type === 'true_false'}
                              className="flex-1 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666] bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />

                            {/* Remove Option Button */}
                            {q.type !== 'true_false' && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIdx, oIdx)}
                                className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded transition-colors"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form Footer */}
            <div className="border-t border-slate-100 pt-8 mt-8 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setView('list')}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-5 py-3 rounded-[4px] transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-6 py-3.5 rounded-[4px] shadow-md hover-lift transition-all disabled:bg-slate-300"
              >
                {submitting ? "Saving Draft..." : editingAssessmentId ? "Update Assessment ✓" : "Create Assessment Draft ✓"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
