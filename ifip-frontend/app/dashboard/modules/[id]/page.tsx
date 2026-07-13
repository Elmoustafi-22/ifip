"use strict";

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  HiOutlinePlay, 
  HiOutlineBookOpen, 
  HiOutlineClipboardDocumentList, 
  HiOutlineLockClosed, 
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineArrowPath
} from "react-icons/hi2";
import { getLMSModules, completeLMSModule, LMSModule } from "@/lib/api/services";

export default function ModuleViewerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params?.id as string;

  const [modules, setModules] = useState<LMSModule[]>([]);
  const [currentModule, setCurrentModule] = useState<LMSModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock quiz answers state
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!moduleId) return;

    const fetchViewerData = async () => {
      try {
        const data = await getLMSModules();
        setModules(data);
        const current = data.find(m => m._id === moduleId);
        if (!current) {
          setError("Requested module could not be found.");
        } else if (current.status === "locked") {
          setError("This module is currently locked. Please complete the preceding modules first.");
        } else {
          setCurrentModule(current);
          setError(null);
        }
      } catch (err: any) {
        console.error("Failed to load viewer data:", err);
        setError("Error loading course content. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchViewerData();
  }, [moduleId]);

  const handleMarkComplete = async () => {
    if (!currentModule || completing) return;
    setCompleting(true);
    try {
      await completeLMSModule(currentModule._id);
      
      // Find the next module in order
      const currentIndex = modules.findIndex(m => m._id === currentModule._id);
      const nextModule = modules[currentIndex + 1];

      if (nextModule) {
        // Automatically route to next module
        router.push(`/dashboard/modules/${nextModule._id}`);
      } else {
        // If it was the last module, redirect to modules list
        router.push("/dashboard/modules?completed=cohort");
      }
    } catch (err: any) {
      console.error("Failed to mark module as complete:", err);
      alert("Failed to update course progress. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate score calculation
    if (Object.keys(answers).length < 2) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setQuizScore(100); // 100% score for correct inputs
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening workspace lesson viewer...</p>
      </div>
    );
  }

  if (error || !currentModule) {
    return (
      <div className="max-w-md mx-auto my-16 text-center p-8 bg-rose-50 border border-rose-100 rounded-2xl">
        <p className="text-rose-700 font-medium text-sm mb-6">{error || "Module not accessible."}</p>
        <Link 
          href="/dashboard/modules" 
          className="inline-flex items-center gap-2 bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Modules
        </Link>
      </div>
    );
  }

  // Find index of current module
  const currentIndex = modules.findIndex(m => m._id === currentModule._id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  return (
    <div className="flex min-h-[calc(100vh-64px)] font-sans">
      {/* 1. Left Course Outline Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E7E2D8] flex flex-col justify-between shrink-0 select-none hidden md:flex">
        <div className="py-6 px-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Course Outline</h2>
          <div className="space-y-1">
            {modules.map((mod) => {
              const isActive = mod._id === currentModule._id;
              const isLocked = mod.status === "locked";
              const isCompleted = mod.status === "completed";

              return (
                <div key={mod._id}>
                  {isLocked ? (
                    <div className="flex items-center justify-between text-slate-400 text-xs px-3 py-3 rounded-xl cursor-not-allowed">
                      <span className="truncate pr-2">{mod.title}</span>
                      <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
                    </div>
                  ) : (
                    <Link
                      href={`/dashboard/modules/${mod._id}`}
                      className={`flex items-center justify-between text-xs px-3 py-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-sky-50 text-[#00B0FF] font-bold border-l-4 border-[#00B0FF]"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate pr-2">{mod.title}</span>
                      {isCompleted && <HiOutlineCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[#E7E2D8]">
          <Link 
            href="/dashboard/modules"
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-[#000666] font-bold py-2 border border-slate-200 rounded-xl"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* 2. Main Content Viewer Pane */}
      <main className="flex-1 bg-[#FDFBF7] p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Top Breadcrumb & Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00B0FF]">
              Module {currentModule.order}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 capitalize">
              {currentModule.contentType}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] mb-6 font-display leading-tight">
            {currentModule.title}
          </h1>

          {/* Module Content Body Renderer */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
            {/* CONTENT TYPE: VIDEO */}
            {currentModule.contentType === "video" && (
              <div className="mb-6">
                <div className="aspect-video w-full rounded-xl bg-black overflow-hidden relative shadow-inner border border-slate-200">
                  <video 
                    src={currentModule.contentUrl} 
                    controls
                    className="w-full h-full object-cover"
                    poster="/images/video-fallback-banner.jpg"
                  />
                </div>
                <p className="text-slate-400 text-xs italic mt-3 text-center">Video lesson: Use media controls to pause, review, or adjust speed.</p>
              </div>
            )}

            {/* CONTENT TYPE: TEXT */}
            {currentModule.body && currentModule.contentType === "text" && (
              <div className="prose prose-slate max-w-none font-serif text-slate-700 leading-relaxed text-sm sm:text-base space-y-6">
                {/* Simulated rendering of markdown text blocks */}
                {currentModule.body.split("\n\n").map((para, pIdx) => {
                  if (para.startsWith("###")) {
                    return <h3 key={pIdx} className="text-lg font-bold font-sans text-[#000666] pt-2">{para.replace("###", "").trim()}</h3>;
                  }
                  if (para.startsWith("####")) {
                    return <h4 key={pIdx} className="text-sm font-bold font-sans text-slate-700 pt-1">{para.replace("####", "").trim()}</h4>;
                  }
                  if (para.startsWith("1.") || para.startsWith("-")) {
                    return (
                      <ul key={pIdx} className="list-disc pl-5 space-y-2">
                        {para.split("\n").map((li, lIdx) => (
                          <li key={lIdx} className="text-slate-600">{li.replace(/^\d+\.\s*|-\s*/, "").trim()}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={pIdx}>{para}</p>;
                })}
              </div>
            )}

            {/* CONTENT TYPE: QUIZ */}
            {currentModule.contentType === "quiz" && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-[#000666]">Knowledge Check Quiz</h3>
                <p className="text-slate-500 text-sm">Please answer the questions below to test your understanding of this module's objectives.</p>
                
                {quizScore !== null ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                    <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <h4 className="font-bold text-emerald-800 text-sm mb-1">Assessment Passed!</h4>
                    <p className="text-emerald-700 text-xs">Score: {quizScore}% — You have mastered this lesson. Proceed below to unlock the next level.</p>
                  </div>
                ) : (
                  <form onSubmit={handleQuizSubmit} className="space-y-4 text-sm">
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="font-medium text-[#000666] mb-3">1. Mudarabah represents which type of arrangement?</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="radio" name="q1" value="a" onChange={() => setAnswers(prev => ({...prev, 1: 'a'}))} className="text-[#00B0FF] focus:ring-[#00B0FF]" />
                          <span>Cost-Plus financing sale</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="radio" name="q1" value="b" onChange={() => setAnswers(prev => ({...prev, 1: 'b'}))} className="text-[#00B0FF] focus:ring-[#00B0FF]" />
                          <span>Partnership of capital provider and expert labor</span>
                        </label>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="font-medium text-[#000666] mb-3">2. In Mudarabah, who bears the financial losses?</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="radio" name="q2" value="a" onChange={() => setAnswers(prev => ({...prev, 2: 'a'}))} className="text-[#00B0FF] focus:ring-[#00B0FF]" />
                          <span>Capital Provider (Rab-ul-Mal) solely</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="radio" name="q2" value="b" onChange={() => setAnswers(prev => ({...prev, 2: 'b'}))} className="text-[#00B0FF] focus:ring-[#00B0FF]" />
                          <span>Mudarib (managing partner) solely</span>
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
                    >
                      Submit Quiz
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Bottom Module Navigation Panel */}
          <div className="border-t border-[#E7E2D8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Prev Button */}
            {prevModule ? (
              <Link
                href={`/dashboard/modules/${prevModule._id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-slate-500 hover:text-[#000666] font-bold text-xs px-5 py-3 border border-slate-200 rounded-xl transition-all hover:bg-slate-50"
              >
                <HiOutlineArrowLeft className="w-4 h-4" /> Previous Lesson
              </Link>
            ) : (
              <div className="w-full sm:w-auto invisible" />
            )}

            {/* Complete / Next CTA Button */}
            <button
              onClick={handleMarkComplete}
              disabled={completing || (currentModule.contentType === "quiz" && quizScore === null)}
              className={`w-full sm:w-auto font-bold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                completing || (currentModule.contentType === "quiz" && quizScore === null)
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
          </div>
        </div>
      </main>
    </div>
  );
}
