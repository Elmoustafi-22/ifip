"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  HiOutlineBookOpen,
  HiOutlinePlay,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineChevronDown,
  HiOutlineChevronUp
} from "react-icons/hi2";
import { getModuleOutline, LMSModule } from "@/lib/api/services";
import { linkifyText } from "@/lib/utils/linkify";

export default function ModuleOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [module, setModule] = useState<LMSModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTopicIndex, setOpenTopicIndex] = useState<number | null>(0);

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        const data = await getModuleOutline(resolvedParams.id);
        setModule(data);
      } catch (err: any) {
        console.error("Failed to load module outline:", err);
        setError(err.message || "Failed to load module outline.");
      } finally {
        setLoading(false);
      }
    };
    fetchOutline();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading syllabus & outline...</p>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8">
          <p className="text-rose-700 font-bold mb-4">{error || "Module not found."}</p>
          <Link
            href="/dashboard/modules"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#000666] bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50"
          >
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  const outline = module.outline || {};
  const moduleTask = module.moduleTask;
  const isLocked = module.isLocked || module.status === "locked";
  const isCompleted = module.status === "completed";
  const isInProgress = module.status === "in_progress";

  const topics = outline.topics || [];
  const objectives = outline.learningObjectives || [];
  const outcomes = outline.expectedOutcomes || [];
  const taskDescription = moduleTask?.instructions || moduleTask?.description || "";
  const formattedDueDate = moduleTask?.dueDate
    ? new Date(moduleTask.dueDate).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : "";

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8 font-sans min-w-0 max-w-full">
      {/* Top Breadcrumb */}
      <div className="mb-6 flex items-center justify-between min-w-0 max-w-full">
        <Link
          href="/dashboard/modules"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#000666] hover:text-[#FF9800] transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to All Modules
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Curriculum Syllabus
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-gradient-to-br from-[#000666] to-[#0A1A80] text-white rounded-3xl p-5 sm:p-10 shadow-xl relative overflow-hidden mb-8 min-w-0 max-w-full break-words">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-white/10 backdrop-blur-md text-[#FF9800] border border-white/15 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
              Week {module.weekNumber || module.order}
            </span>
            <span className="bg-white/10 backdrop-blur-md text-white/90 text-xs font-semibold px-3 py-1 rounded-full capitalize">
              {module.contentType}
            </span>
            {module.assessmentId && (
              <span className="bg-[#FF9800]/20 text-[#FF9800] border border-[#FF9800]/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <HiOutlineAcademicCap className="w-3.5 h-3.5" /> Assessment Gated
              </span>
            )}
            {isCompleted && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Completed
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight leading-tight">
            {module.title}
          </h1>

          <div
            className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl font-normal"
            dangerouslySetInnerHTML={{ __html: linkifyText(outline.purpose || module.description) }}
          />

          {/* Quick CTA inside header */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            {isLocked ? (
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/70 px-6 py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase cursor-not-allowed">
                <HiOutlineLockClosed className="w-4 h-4 text-[#FF9800]" /> Content Locked (Prerequisites Required)
              </div>
            ) : (
              <Link
                href={`/dashboard/modules/${module._id}`}
                className="inline-flex items-center gap-2 bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold text-xs tracking-wider uppercase px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <span>{isCompleted ? "Review Learning Material" : isInProgress ? "Resume Coursework" : "Start Learning"}</span>
                <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Outline Grid */}
      <div className="space-y-8">
        {moduleTask && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Module Task</p>
                <h2 className="text-xl font-black text-[#000666] mt-1">{moduleTask.title || "Action required"}</h2>
              </div>
              {moduleTask.requiresUpload && (
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Upload required
                </span>
              )}
            </div>

            {taskDescription && (
              <div
                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: linkifyText(taskDescription) }}
              />
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
              {moduleTask.requiresUpload && (
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5">
                  Evidence: {moduleTask.evidenceLabel || "Certificate or proof of completion"}
                </span>
              )}
              {moduleTask.allowedFileTypes && moduleTask.allowedFileTypes.length > 0 && (
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5">
                  Accepted: {moduleTask.allowedFileTypes.join(", ")}
                </span>
              )}
              {(formattedDueDate || moduleTask.dueText) && (
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5">
                  {formattedDueDate || moduleTask.dueText}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Learning Objectives */}
        {objectives.length > 0 && (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-[#FF9800] flex items-center justify-center">
                <HiOutlineSparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000666]">Learning Objectives</h2>
                <p className="text-xs text-slate-500">Key competencies and knowledge you will acquire.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {objectives.map((obj, i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-[#000666] text-white flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                    {obj}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Topics Breakdown */}
        {topics.length > 0 && (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                <HiOutlineAcademicCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000666]">Topic Breakdown & Syllabus</h2>
                <p className="text-xs text-slate-500">{topics.length} structured learning sections with activities.</p>
              </div>
            </div>

            <div className="space-y-4">
              {topics.map((topic, tIdx) => {
                const isOpen = openTopicIndex === tIdx;
                return (
                  <div 
                    key={tIdx} 
                    className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenTopicIndex(isOpen ? null : tIdx)}
                      className="w-full text-left px-5 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-[#000666] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {tIdx + 1}
                        </span>
                        <span className="font-bold text-sm text-[#000666] truncate">
                          {topic.title}
                        </span>
                      </div>
                      {isOpen ? (
                        <HiOutlineChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <HiOutlineChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="p-5 bg-white border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                        {/* Subtopics */}
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div>
                            <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                              Key Topics & Concepts Covered
                            </h4>
                            <ul className="space-y-2">
                              {topic.subtopics.map((sub, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                                  <span className="text-[#FF9800] font-bold mt-0.5">•</span>
                                  <span dangerouslySetInnerHTML={{ __html: linkifyText(sub) }} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Learning Activity */}
                        {topic.learningActivity && (
                          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block mb-1">
                              Recommended Learning Activity
                            </span>
                            <div
                              className="text-xs text-amber-950 font-medium leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: linkifyText(topic.learningActivity) }}
                            />
                          </div>
                        )}

                        {/* Materials */}
                        {topic.materials && topic.materials.length > 0 && (
                          <div>
                            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                              External Resources & References
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {topic.materials.map((mat, mIdx) => (
                                <a
                                  key={mIdx}
                                  href={mat.url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <span>{mat.label}</span>
                                  <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expected Outcomes */}
        {outcomes.length > 0 && (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <HiOutlineCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000666]">Expected Learning Outcomes</h2>
                <p className="text-xs text-slate-500">Practical skills you can apply upon completion.</p>
              </div>
            </div>

            <ul className="space-y-3">
              {outcomes.map((outc, i) => (
                <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                  <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: linkifyText(outc) }} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Navigation & CTA Banner */}
        <div className="bg-slate-50 border border-[#E7E2D8] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#000666] text-sm mb-0.5">Ready to begin this module?</h3>
            <p className="text-xs text-slate-500">Access full reading texts, video streams, case studies, and assessments.</p>
          </div>

          {isLocked ? (
            <button
              disabled
              className="w-full sm:w-auto bg-slate-200 text-slate-400 text-xs font-bold tracking-wider uppercase px-6 py-3.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <HiOutlineLockClosed className="w-4 h-4" /> Locked
            </button>
          ) : (
            <Link
              href={`/dashboard/modules/${module._id}`}
              className="w-full sm:w-auto bg-[#000666] hover:bg-[#000666]/90 text-white text-xs font-bold tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-sm text-center flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
            >
              <span>{isCompleted ? "Review Material" : "Start Coursework"}</span>
              <HiOutlineArrowRight className="w-4 h-4 text-[#FF9800]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
