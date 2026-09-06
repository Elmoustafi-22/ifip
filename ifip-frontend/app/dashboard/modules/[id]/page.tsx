"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  HiOutlinePlay, 
  HiOutlineBookOpen, 
  HiOutlineClipboardDocumentList, 
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineAcademicCap,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineArrowUpTray,
  HiOutlineDocumentCheck
} from "react-icons/hi2";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  getLMSModules, 
  completeLMSModule, 
  LMSModule,
  getAssessmentForParticipant,
  getLatestAssessmentResult,
  getModuleTaskStatus,
  submitModuleTask,
  uploadModuleTaskEvidenceAuth,
  ModuleTaskStatusResponse,
  ModuleTaskSubmission
} from "@/lib/api/services";

interface AssessmentData {
  _id: string;
  moduleId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  passMark: number;
  maxAttempts: number;
  retakeCooldownHours: number;
}

export default function ModuleViewerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params?.id as string;

  const [modules, setModules] = useState<LMSModule[]>([]);
  const [currentModule, setCurrentModule] = useState<LMSModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assessment metadata and result status
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [taskUploadedFiles, setTaskUploadedFiles] = useState<{ fileUrl: string; fileName?: string }[]>([]);
  const [uploadingFilesCount, setUploadingFilesCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [taskSubmissionNote, setTaskSubmissionNote] = useState("");
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [taskStatus, setTaskStatus] = useState<ModuleTaskStatusResponse | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  const assessmentSectionRef = useRef<HTMLDivElement>(null);

  const fetchViewerData = async () => {
    try {
      setLoading(true);
      const data = await getLMSModules();
      setModules(data);
      const current = data.find(m => m._id === moduleId);
      if (!current) {
        setError("Requested module could not be found.");
        return;
      }
      
      if (current.status === "locked") {
        setError("This module is currently locked. Please complete the preceding modules first.");
        return;
      }
      
      setCurrentModule(current);
      setError(null);

      // If the module has an assessment, load its status/result
      if (current.assessmentId) {
        await fetchAssessmentState(current._id);
      } else {
        setAssessment(null);
        setAssessmentResult(null);
      }

      if (current.moduleTask) {
        await fetchTaskState(current._id);
      } else {
        setTaskStatus(null);
        setTaskSubmitted(false);
      }
    } catch (err: any) {
      console.error("Failed to load viewer data:", err);
      setError("Error loading course content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentState = async (modId: string) => {
    setLoadingAssessment(true);
    try {
      const [assessmentMeta, resultData] = await Promise.all([
        getAssessmentForParticipant(modId).catch(() => null),
        getLatestAssessmentResult(modId).catch(() => null)
      ]);
      setAssessment(assessmentMeta);
      setAssessmentResult(resultData && resultData.status !== 'not_attempted' ? resultData : null);
    } catch (err: any) {
      console.error("Failed to load assessment data:", err);
      setAssessment(null);
      setAssessmentResult(null);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const fetchTaskState = async (modId: string) => {
    try {
      const response = await getModuleTaskStatus(modId).catch(() => null);
      setTaskStatus(response);
      setTaskSubmitted(Boolean(response?.latestSubmission));
    } catch (err: any) {
      console.error("Failed to load task status:", err);
      setTaskStatus(null);
      setTaskSubmitted(false);
    }
  };

  useEffect(() => {
    if (!moduleId) return;
    fetchViewerData();
  }, [moduleId]);

  const handleMarkComplete = async () => {
    if (!currentModule || completing) return;
    setCompleting(true);
    try {
      await completeLMSModule(currentModule._id);
      await navigateToNext();
    } catch (err: any) {
      console.error("Failed to mark module as complete:", err);
      alert(err.message || "Failed to update course progress. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const navigateToNext = async () => {
    try {
      // Refresh modules data to get updated lock states
      const data = await getLMSModules();
      const currIdx = data.findIndex(m => m._id === moduleId);
      const nextMod = data[currIdx + 1];

      if (nextMod && nextMod.status !== 'locked') {
        router.push(`/dashboard/modules/${nextMod._id}`);
      } else {
        router.push("/dashboard/modules?completed=cohort");
      }
    } catch (err: any) {
      console.error("Failed to navigate to next module:", err);
      router.push("/dashboard/modules");
    }
  };

  // Find index of current module
  const currentIndex = modules.findIndex(m => m._id === moduleId);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center font-sans bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-3">
          <HiOutlineArrowPath className="w-8 h-8 text-[#000666] animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading lesson content...</p>
        </div>
      </div>
    );
  }

  if (error || !currentModule) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center font-sans bg-[#FDFBF7] p-6">
        <div className="max-w-md w-full bg-white border border-[#E7E2D8] rounded-2xl p-8 text-center shadow-sm">
          <HiOutlineExclamationTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#000666] mb-2 font-display">Module Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6">{error || "Could not load the requested module."}</p>
          <Link
            href="/dashboard/modules"
            className="inline-flex items-center gap-2 bg-[#000666] text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-[#000666]/90 transition-all"
          >
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  const currentMod = currentModule;
  const moduleTask = currentMod.moduleTask;
  const hasVisibleModuleTask = Boolean(
    moduleTask && (
      moduleTask.title ||
      moduleTask.description ||
      moduleTask.instructions ||
      moduleTask.dueText ||
      moduleTask.requiresUpload ||
      (moduleTask.allowedFileTypes && moduleTask.allowedFileTypes.length > 0)
    )
  );
  const taskAcceptList = moduleTask?.allowedFileTypes && moduleTask.allowedFileTypes.length > 0
    ? moduleTask.allowedFileTypes.map(type => `.${type.trim().replace(/^\./, "")}`).join(",")
    : ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx";

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setUploadError(null);
    setUploadingFilesCount((prev) => prev + selectedFiles.length);

    for (const file of selectedFiles) {
      try {
        const res = await uploadModuleTaskEvidenceAuth(file);
        setTaskUploadedFiles((prev) => [...prev, { fileUrl: res.fileUrl, fileName: file.name }]);
      } catch (err: any) {
        console.error("Failed to upload evidence file:", err);
        setUploadError(err?.response?.data?.message || err?.message || `Failed to upload ${file.name}`);
      } finally {
        setUploadingFilesCount((prev) => Math.max(0, prev - 1));
      }
    }

    event.target.value = "";
  };

  const handleRemoveUploadedFile = (index: number) => {
    setTaskUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTaskSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentModule || !currentModule.moduleTask) {
      alert("This module does not have a task attached.");
      return;
    }

    if (taskUploadedFiles.length === 0 && !taskSubmissionNote.trim()) {
      alert("Please upload at least one evidence file or add a short note before submitting your task.");
      return;
    }

    if (!taskStatus?.submissionWindowOpen) {
      alert("The submission window for this task is closed.");
      return;
    }

    setSubmittingTask(true);

    try {
      const payload = {
        files: taskUploadedFiles,
        fileUrl: taskUploadedFiles[0]?.fileUrl,
        fileName: taskUploadedFiles[0]?.fileName,
        note: taskSubmissionNote.trim() || undefined,
      };

      const result = await submitModuleTask(currentModule._id, payload);
      setTaskStatus((prev) => ({
        ...prev!,
        latestSubmission: result?.submission || prev?.latestSubmission || null,
        submissionWindowOpen: true,
      }));
      setTaskSubmitted(true);
      setTaskUploadedFiles([]);
      setTaskSubmissionNote("");
      alert(result?.message || "Task submitted successfully.");
    } catch (err: any) {
      console.error("Failed to submit task:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to submit the task. Please try again.");
    } finally {
      setSubmittingTask(false);
    }
  };

  // Preprocess body to unwrap markdown headings pasted inside HTML tags and normalize spacing
  const formatBodyContent = (raw: string) => {
    if (!raw) return "";
    return raw
      // Convert <p>### Heading</p> or <p>## Heading</p> or <p># Heading</p> to real markdown headings
      .replace(/<p>\s*(#{1,6})\s+([^<]+)<\/p>/gi, "$1 $2\n\n")
      // Convert <p><strong>1. Heading</strong></p> into structured headings if standalone
      .replace(/<p>\s*<strong>\s*(\d+\s*[-—–]\s*[^<]+)<\/strong>\s*<\/p>/gi, "### $1\n\n")
      // Remove repetitive empty paragraph breaks
      .replace(/(<p>\s*(<br\s*\/?>|&nbsp;|\s*)\s*<\/p>\s*){2,}/gi, "<p><br></p>")
      .replace(/(\n\s*){3,}/g, "\n\n");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDFBF7] font-sans">
      {/* Main Content Viewer Pane */}
      <main className="max-w-4xl mx-auto px-1 sm:px-6 lg:px-8 py-4 sm:py-10 text-left min-w-0 max-w-full">
        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-[#E7E2D8] rounded-xl p-3 sm:px-4 sm:py-3 shadow-2xs min-w-0 max-w-full">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              href="/dashboard/modules"
              className="text-xs font-semibold text-slate-500 hover:text-[#000666] flex items-center gap-1 transition-colors"
            >
              <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Modules
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#00B0FF]">
              Week {currentMod.weekNumber || currentMod.order} &bull; Module {currentMod.order}
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded capitalize hidden sm:inline">
              {currentMod.contentType === "text" ? "E-Book Document" : currentMod.contentType}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {currentMod.assessmentId && assessment ? (
              <button
                type="button"
                onClick={() => assessmentSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#000666] hover:text-[#00B0FF] bg-sky-50 hover:bg-sky-100/70 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Scroll to Assessment"
              >
                <HiOutlineClipboardDocumentList className="w-3.5 h-3.5 text-[#00B0FF]" />
                <span>Knowledge Check</span>
              </button>
            ) : (
              <Link
                href="/dashboard/assessments"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                title="View Assessments Hub"
              >
                <HiOutlineClipboardDocumentList className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Assessments Hub</span>
              </Link>
            )}

            <Link
              href={`/dashboard/modules/${moduleId}/outline`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#000666] hover:text-[#FF9800] bg-slate-50 hover:bg-amber-50/60 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <HiOutlineBookOpen className="w-3.5 h-3.5 text-[#FF9800]" />
              <span>Syllabus Outline</span>
            </Link>
          </div>
        </div>

        {/* Module Title Header */}
        <div className="mb-6 min-w-0 max-w-full break-words">
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] font-display leading-tight tracking-tight break-words">
            {currentMod.title}
          </h1>
          {currentMod.description && (
            <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed break-words">
              {currentMod.description}
            </p>
          )}
        </div>

        {/* Module Content Body */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-4 sm:p-8 md:p-10 shadow-sm mb-8 min-w-0 max-w-full overflow-x-hidden">
          {/* CONTENT TYPE: VIDEO */}
          {currentMod.contentType === "video" && (
            <div className="mb-6">
              <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative shadow-inner border border-slate-200">
                <video 
                  src={currentMod.contentUrl} 
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-slate-400 text-xs italic mt-3 text-center">Video lesson: Use media controls to pause, review, or adjust speed.</p>
            </div>
          )}

          {/* CONTENT TYPE: TEXT */}
          {currentMod.body && currentMod.contentType === "text" && (
            <div className="prose prose-slate max-w-full min-w-0 break-words font-sans text-slate-800 text-sm sm:text-base leading-relaxed overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl sm:text-3xl font-black text-[#000666] font-display mt-8 mb-4 border-b border-slate-200 pb-2.5 leading-tight break-words" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl sm:text-2xl font-bold text-[#000666] font-display mt-6 mb-3 leading-snug break-words" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-bold text-[#000666] font-sans mt-5 mb-2 leading-snug break-words" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-base font-bold text-slate-800 font-sans mt-4 mb-1.5 break-words" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed my-3 font-normal break-words" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-bold text-slate-900" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="italic text-slate-800" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-5 my-3 space-y-1 text-sm sm:text-base text-slate-700 break-words" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-5 my-3 space-y-1 text-sm sm:text-base text-slate-700 font-medium break-words" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed pl-1 break-words" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-[#00B0FF] bg-sky-50/60 rounded-r-xl p-3.5 my-4 text-slate-700 text-sm sm:text-base italic leading-relaxed break-words" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="w-full overflow-x-auto my-5 rounded-xl border border-slate-200 shadow-2xs bg-white">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-slate-100/90 text-[#000666] font-bold border-b border-slate-200" {...props} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="divide-y divide-slate-100" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-slate-50/70 transition-colors even:bg-slate-50/30" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-3 font-bold text-slate-800 border-r last:border-r-0 border-slate-200 uppercase tracking-wider text-[11px]" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-3 text-slate-600 border-r last:border-r-0 border-slate-200 align-top leading-relaxed" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-6 border-slate-200" {...props} />
                  ),
                  code: ({ node, className, children, ...props }) => (
                    <code className="bg-slate-100 text-[#000666] px-1.5 py-0.5 rounded text-xs font-mono font-medium" {...props}>
                      {children}
                    </code>
                  ),
                }}
              >
                {formatBodyContent(currentMod.body)}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* End of Lesson: Assessment Available State */}
        {currentMod.assessmentId && assessment && (!assessmentResult || assessmentResult.status !== 'passed') && (
          <div className="mb-8 border border-amber-200 bg-gradient-to-r from-amber-50/90 to-orange-50/70 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#FF9800]/20 flex items-center justify-center text-[#FF9800] shrink-0">
                <HiOutlineAcademicCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#000666]">Lesson Material Completed</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  You have finished the study material. Proceed to the <strong>Week {currentMod.weekNumber || currentMod.order} Knowledge Check</strong> on the dedicated Assessments Page to test your understanding and unlock the next module.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/assessments/${currentMod._id}`}
                className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.02]"
              >
                <span>Take Knowledge Check</span> &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Module task CTA when a task is attached */}
        {hasVisibleModuleTask && (
          <div className="mb-8 border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-[#FF9800]/20 flex items-center justify-center text-[#FF9800] shrink-0">
                  <HiOutlineClipboardDocumentList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-bold text-[#000666]">{moduleTask?.title || "Module Task"}</h4>
                    {moduleTask?.requiresUpload && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        Upload required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {moduleTask?.instructions || moduleTask?.description || "Complete the required task for this module before moving on."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-600">
                    {moduleTask?.dueText && (
                      <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">{moduleTask.dueText}</span>
                    )}
                    {moduleTask?.requiresUpload && (
                      <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">
                        Evidence: {moduleTask.evidenceLabel || "Certificate or proof of completion"}
                      </span>
                    )}
                    {moduleTask?.allowedFileTypes && moduleTask.allowedFileTypes.length > 0 && (
                      <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">
                        Accepted: {moduleTask.allowedFileTypes.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href={`/dashboard/modules/${moduleId}/outline`}
                className="shrink-0 bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Review Task</span> <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <form onSubmit={handleTaskSubmit} className="rounded-2xl border border-amber-200 bg-white/60 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h5 className="text-sm font-black text-[#000666]">Submit your task</h5>
                  <p className="text-[11px] text-slate-500">
                    {moduleTask?.requiresUpload
                      ? `Upload your ${moduleTask.evidenceLabel || "evidence file"} to complete this task.`
                      : "Add your final note or completion update for this task."}
                  </p>
                </div>
                {taskStatus?.latestSubmission && (
                  <span className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${
                    taskStatus.latestSubmission.status === 'approved'
                      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                      : taskStatus.latestSubmission.status === 'rejected'
                        ? 'text-rose-700 bg-rose-100 border-rose-200'
                        : taskStatus.latestSubmission.status === 'needs_resubmission'
                          ? 'text-amber-700 bg-amber-100 border-amber-200'
                          : 'text-sky-700 bg-sky-100 border-sky-200'
                  }`}>
                    {taskStatus.latestSubmission.status === 'approved'
                      ? 'Passed'
                      : taskStatus.latestSubmission.status === 'rejected'
                        ? 'Rejected'
                        : taskStatus.latestSubmission.status === 'needs_resubmission'
                          ? 'Needs resubmission'
                          : taskStatus.latestSubmission.status === 'pending_review'
                            ? 'Under review'
                            : 'Submitted'}
                  </span>
                )}
              </div>

              {taskStatus?.latestSubmission && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-700">
                    <span>Latest submission</span>
                    <span className="text-slate-400">•</span>
                    <span>{taskStatus.latestSubmission.submittedAt ? new Date(taskStatus.latestSubmission.submittedAt).toLocaleString() : 'Just now'}</span>
                  </div>
                  {taskStatus.latestSubmission.files && taskStatus.latestSubmission.files.length > 0 ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-700">Submitted Files ({taskStatus.latestSubmission.files.length}):</div>
                      <div className="flex flex-wrap gap-2">
                        {taskStatus.latestSubmission.files.map((f, idx) => (
                          <a
                            key={idx}
                            href={f.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-[#000666] font-medium text-[11px]"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            <span>{f.fileName || `File ${idx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : taskStatus.latestSubmission.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <span>File: {taskStatus.latestSubmission.fileName || 'Evidence file'}</span>
                      <a
                        href={taskStatus.latestSubmission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#000666] font-bold hover:underline"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5" /> Open
                      </a>
                    </div>
                  ) : null}
                  {taskStatus.latestSubmission.note && (
                    <div>Note: {taskStatus.latestSubmission.note}</div>
                  )}
                  {taskStatus.latestSubmission.adminFeedback && (
                    <div className="text-emerald-700">Feedback: {taskStatus.latestSubmission.adminFeedback}</div>
                  )}
                  {taskStatus.latestSubmission.pointsAwarded ? (
                    <div className="text-emerald-700 font-bold">Awarded points: {taskStatus.latestSubmission.pointsAwarded}</div>
                  ) : null}
                </div>
              )}

              {moduleTask?.requiresUpload && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Upload evidence files
                    </label>
                    {taskUploadedFiles.length > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600">
                        {taskUploadedFiles.length} file{taskUploadedFiles.length > 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-slate-200 hover:border-[#000666]/40 rounded-xl p-4 transition-all bg-slate-50/50 text-center">
                    <input
                      type="file"
                      multiple
                      accept={taskAcceptList}
                      onChange={handleFileUpload}
                      disabled={uploadingFilesCount > 0}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                      {uploadingFilesCount > 0 ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-[#000666]">
                          <HiOutlineArrowPath className="w-4 h-4 animate-spin text-[#FF9800]" />
                          <span>Uploading {uploadingFilesCount} file(s)...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-sky-50 text-[#000666] flex items-center justify-center border border-sky-100 mx-auto">
                            <HiOutlineArrowUpTray className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            Click or drag files here to upload instantly
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Supported formats: {taskAcceptList.replace(/\./g, ' ').toUpperCase()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {taskUploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Uploaded Evidence ({taskUploadedFiles.length})</p>
                      <div className="space-y-2">
                        {taskUploadedFiles.map((fileItem, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs group hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <HiOutlineDocumentCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{fileItem.fileName || `Evidence file ${idx + 1}`}</p>
                                <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Uploaded</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={fileItem.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all inline-flex items-center gap-1"
                              >
                                <HiOutlineEye className="w-3.5 h-3.5 text-[#000666]" />
                                <span>View</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadedFile(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Remove file"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {moduleTask?.requiresUpload ? "Short note (optional)" : "Task note"}
                </label>
                <textarea
                  value={taskSubmissionNote}
                  onChange={(e) => setTaskSubmissionNote(e.target.value)}
                  placeholder={moduleTask?.requiresUpload ? "Add a short note explaining your submission." : "Summarise what you completed for this task."}
                  className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingTask || !taskStatus?.submissionWindowOpen}
                  className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingTask ? 'Submitting...' : taskStatus?.submissionWindowOpen ? 'Submit task' : 'Submission closed'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. ASSESSMENT CTA / STATUS CARD */}
        {currentMod.assessmentId && assessment && (
          <div ref={assessmentSectionRef} className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm mb-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#000666] flex items-center justify-center border border-sky-100 shrink-0">
                  <HiOutlineClipboardDocumentList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display text-[#000666]">
                    Week {currentMod.weekNumber || currentMod.order} Knowledge Check
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{assessment.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {assessment.timeLimitMinutes && (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <HiOutlineClock className="w-3.5 h-3.5 text-[#FF9800]" /> {assessment.timeLimitMinutes} mins
                  </span>
                )}
                <span className="text-xs font-bold text-[#000666] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                  Pass Mark: {assessment.passMark}%
                </span>
              </div>
            </div>

            {assessmentResult ? (
              /* Already attempted */
              <div className="space-y-4">
                {assessmentResult.status === 'passed' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">Assessment Passed ({assessmentResult.score}%)</h4>
                        <p className="text-[11px] text-emerald-700 font-medium">Coursework credited. You may review solutions and feedback anytime.</p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/assessments/${currentMod._id}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1"
                    >
                      Review Solutions &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">
                          Latest Score: {assessmentResult.score}% (Required: {assessment.passMark}%)
                        </h4>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Attempt {assessmentResult.attemptNumber} of {assessment.maxAttempts} completed.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/assessments/${currentMod._id}`}
                      className="bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-1"
                    >
                      {assessmentResult.attemptNumber < assessment.maxAttempts ? "Re-Attempt on Assessments Page →" : "View Solutions & Review →"}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Not yet attempted */
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#000666]">Ready for your evaluation?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Assessments are conducted in a focused, secure environment on the Assessments Hub to test your understanding.
                  </p>
                </div>
                <Link
                  href={`/dashboard/assessments/${currentMod._id}`}
                  className="w-full sm:w-auto bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 flex items-center justify-center gap-1.5"
                >
                  <span>Take Assessment on Assessments Page</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bottom Module Navigation Panel */}
        <div className="border-t border-[#E7E2D8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Prev Button */}
          {prevModule ? (
            <Link
              href={`/dashboard/modules/${prevModule._id}`}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-slate-500 hover:text-[#000666] font-bold text-xs px-5 py-3 border border-slate-200 rounded-xl transition-all hover:bg-slate-50 bg-white"
            >
              <HiOutlineArrowLeft className="w-4 h-4" /> Previous Lesson
            </Link>
          ) : (
            <div className="w-full sm:w-auto invisible" />
          )}

          {/* Complete / Assessment / Next CTA Action Button */}
          {currentMod.assessmentId && assessment && assessmentResult?.status === 'passed' ? (
            /* 1. Has assessment & passed -> Next Lesson */
            <button
              onClick={navigateToNext}
              className="w-full sm:w-auto font-bold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:scale-[1.01]"
            >
              <span>Next Lesson</span> <HiOutlineArrowRight className="w-4 h-4" />
            </button>
          ) : currentMod.assessmentId && assessment ? (
            /* 2. Has assessment & NOT passed -> Take Assessment */
            <Link
              href={`/dashboard/assessments/${currentMod._id}`}
              className="w-full sm:w-auto font-bold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 bg-[#000666] hover:bg-[#000666]/90 text-white cursor-pointer hover:scale-[1.01]"
            >
              <HiOutlineAcademicCap className="w-4.5 h-4.5 text-[#FF9800]" />
              <span>Take Knowledge Check</span> <HiOutlineArrowRight className="w-4 h-4 text-[#FF9800]" />
            </Link>
          ) : (
            /* 3. No gating assessment -> Standard Mark as Complete & Next */
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              className={`w-full sm:w-auto font-bold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                completing
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-[#FF9800] hover:bg-[#FF9800]/95 hover:scale-[1.01] text-white hover:shadow-lg"
              }`}
            >
              {completing ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> Saving progress...
                </>
              ) : (
                <>
                  Mark as Complete & Next <HiOutlineArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
