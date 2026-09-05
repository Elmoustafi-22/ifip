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
  HiOutlineAcademicCap
} from "react-icons/hi2";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  getLMSModules, 
  completeLMSModule, 
  LMSModule,
  getAssessmentForParticipant,
  getLatestAssessmentResult
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

        {/* End of Lesson: Assessment Not Uploaded State */}
        {(!currentMod.assessmentId || !assessment) && (
          <div className="mb-8 border border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600 shrink-0">
                <HiOutlineInformationCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-[#000666]">Assessment Not Yet Uploaded</h4>
                  <span className="bg-amber-100/80 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200/60">
                    Pending Coordinator Upload
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The knowledge check evaluation for <strong>Module {currentMod.order}: {currentMod.title}</strong> has not yet been uploaded or published. You can mark this lesson as complete below and continue to the next module.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/assessments"
              className="shrink-0 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all shadow-xs flex items-center gap-1.5"
            >
              <HiOutlineClipboardDocumentList className="w-4 h-4 text-[#000666]" />
              <span>View All Assessments</span>
            </Link>
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
