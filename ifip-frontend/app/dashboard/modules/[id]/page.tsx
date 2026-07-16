"use client";

import { useEffect, useState, useRef } from "react";
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
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle
} from "react-icons/hi2";
import { 
  getLMSModules, 
  completeLMSModule, 
  LMSModule,
  getAssessmentForParticipant,
  startAssessment,
  submitAssessment,
  getLatestAssessmentResult
} from "@/lib/api/services";

interface Option {
  _id: string;
  text: string;
}

interface Question {
  _id: string;
  text: string;
  type: 'mcq' | 'multi_select' | 'true_false' | 'short_answer';
  options: Option[];
  points: number;
  order: number;
}

interface AssessmentData {
  _id: string;
  moduleId: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  passMark: number;
  maxAttempts: number;
  retakeCooldownHours: number;
  questions: Question[];
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

  // Assessment flow states
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  
  // Quiz taking state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({}); // questionId -> selectedOptionIds[]
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({}); // questionId -> text
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  // Timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        getAssessmentForParticipant(modId),
        getLatestAssessmentResult(modId)
      ]);
      setAssessment(assessmentMeta);
      setAssessmentResult(resultData.status === 'not_attempted' ? null : resultData);
      setAssessmentStarted(false);
    } catch (err: any) {
      console.error("Failed to load assessment data:", err);
    } finally {
      setLoadingAssessment(false);
    }
  };

  useEffect(() => {
    if (!moduleId) return;
    fetchViewerData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [moduleId]);

  // Timer countdown hook
  useEffect(() => {
    if (timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      // Auto-submit on expiry
      handleAssessmentSubmit(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeftSeconds]);

  // Formats seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const handleMarkComplete = async () => {
    if (!currentModule || completing) return;
    setCompleting(true);
    try {
      await completeLMSModule(currentModule._id);
      navigateToNext();
    } catch (err: any) {
      console.error("Failed to mark module as complete:", err);
      alert("Failed to update course progress. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const navigateToNext = async () => {
    // Refresh modules data to get updated lock states
    const data = await getLMSModules();
    const currentIndex = data.findIndex(m => m._id === moduleId);
    const nextModule = data[currentIndex + 1];

    if (nextModule && nextModule.status !== 'locked') {
      router.push(`/dashboard/modules/${nextModule._id}`);
    } else {
      router.push("/dashboard/modules?completed=cohort");
    }
  };

  // --- Assessment taking handlers ---

  const handleStartAssessment = async () => {
    setLoadingAssessment(true);
    setAssessmentError(null);
    try {
      const data = await startAssessment(moduleId);
      setStartedAt(data.startedAt || new Date().toISOString());
      setSelectedAnswers({});
      setTextAnswers({});
      setAssessmentStarted(true);

      // Start timer if time limit exists
      if (assessment?.timeLimitMinutes) {
        setTimeLeftSeconds(assessment.timeLimitMinutes * 60);
      } else {
        setTimeLeftSeconds(null);
      }
    } catch (err: any) {
      console.error("Failed to start assessment attempt:", err);
      setAssessmentError(err.response?.data?.message || err.message || "Failed to start assessment.");
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleOptionChange = (questionId: string, optionId: string, isMultiSelect: boolean) => {
    setSelectedAnswers(prev => {
      const currentSelected = prev[questionId] || [];
      if (isMultiSelect) {
        if (currentSelected.includes(optionId)) {
          return { ...prev, [questionId]: currentSelected.filter(id => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...currentSelected, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setTextAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleAssessmentSubmit = async (isAutoSubmit = false) => {
    if (submittingAssessment) return;
    
    // Check completeness if not auto-submit
    if (!isAutoSubmit && assessment) {
      const unanswered = assessment.questions.some(q => {
        if (q.type === 'short_answer') {
          return !textAnswers[q._id]?.trim();
        } else {
          return !selectedAnswers[q._id] || selectedAnswers[q._id].length === 0;
        }
      });

      if (unanswered && !confirm("You have unanswered questions. Are you sure you want to submit your assessment?")) {
        return;
      }
    }

    setSubmittingAssessment(true);
    setAssessmentError(null);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeftSeconds(null);

    // Compile payload
    const compiledAnswers = (assessment?.questions || []).map((q) => ({
      questionId: q._id,
      selectedOptionIds: selectedAnswers[q._id] || [],
      textAnswer: textAnswers[q._id] || '',
    }));

    try {
      await submitAssessment(moduleId, {
        startedAt: startedAt || new Date().toISOString(),
        answers: compiledAnswers,
      });

      // Reload assessment state to show result card
      await fetchAssessmentState(moduleId);
    } catch (err: any) {
      console.error("Failed to submit assessment:", err);
      setAssessmentError(err.response?.data?.message || err.message || "Failed to submit assessment answers.");
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const getAttemptsRemaining = () => {
    if (!assessment) return 0;
    const attemptsTaken = assessmentResult ? assessmentResult.attemptNumber : 0;
    return Math.max(0, assessment.maxAttempts - attemptsTaken);
  };

  // Find index of current module
  const currentIndex = modules.findIndex(m => m._id === moduleId);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  const currentMod = currentModule!;

  return (
    <div className="flex min-h-[calc(100vh-64px)] font-sans">
      {/* 1. Left Course Outline Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E7E2D8] flex flex-col justify-between shrink-0 select-none hidden md:flex text-left">
        <div className="py-6 px-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Course Outline</h2>
          <div className="space-y-1">
            {modules.map((mod) => {
              const isActive = mod._id === moduleId;
              const isLocked = mod.status === "locked";
              const isCompleted = mod.status === "completed";

              return (
                <div key={mod._id}>
                  {isLocked ? (
                    <div className="flex items-center justify-between text-slate-400 text-xs px-3 py-3 rounded-xl cursor-not-allowed font-medium">
                      <span className="truncate pr-2">{mod.title}</span>
                      <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
                    </div>
                  ) : (
                    <Link
                      href={`/dashboard/modules/${mod._id}`}
                      className={`flex items-center justify-between text-xs px-3 py-3 rounded-xl transition-all font-semibold ${
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
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-[#000666] font-bold py-2 border border-slate-200 rounded-xl bg-white transition-colors"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* 2. Main Content Viewer Pane */}
      <main className="flex-1 bg-[#FDFBF7] p-6 sm:p-10 lg:p-12 overflow-y-auto text-left">
        <div className="max-w-3xl mx-auto">
          {/* Top Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00B0FF]">
              Module {currentMod.order}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 capitalize">
              {currentMod.contentType}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] mb-6 font-display leading-tight">
            {currentMod.title}
          </h1>

          {/* Module Content Body */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
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
              <div className="prose prose-slate max-w-none font-serif text-slate-700 leading-relaxed text-sm sm:text-base space-y-6">
                {currentMod.body.split("\n\n").map((para, pIdx) => {
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
                          <li key={lIdx} className="text-slate-600 font-sans text-xs sm:text-sm">{li.replace(/^\d+\.\s*|-\s*/, "").trim()}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={pIdx}>{para}</p>;
                })}
              </div>
            )}
          </div>

          {/* 3. ASSESSMENT RENDERING PANEL */}
          {currentMod.assessmentId && assessment && (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8 shadow-sm mb-8 space-y-6">
              <h2 className="text-lg font-bold font-display text-[#000666] border-b border-slate-100 pb-3">Module Assessment</h2>

              {loadingAssessment ? (
                <div className="py-8 text-center flex flex-col items-center gap-2 text-slate-400">
                  <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs font-semibold">Updating evaluation details...</span>
                </div>
              ) : !assessmentStarted && !assessmentResult ? (
                /* Scenario A: Not Started yet */
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#000666]">{assessment.title}</h3>
                  {assessment.instructions && (
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {assessment.instructions}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Passing Score</span>
                      <span className="font-bold text-[#000666]">{assessment.passMark}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Max Attempts Allowed</span>
                      <span className="font-bold text-[#000666]">{assessment.maxAttempts} Attempts</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Time Limit</span>
                      <span className="font-bold text-[#000666]">
                        {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} minutes` : "Untimed"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">Retake Cooldown</span>
                      <span className="font-bold text-[#000666]">
                        {assessment.retakeCooldownHours > 0 ? `${assessment.retakeCooldownHours} hours` : "None"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartAssessment}
                    className="w-full bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs py-3 rounded-xl shadow transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    Start Assessment Attempt
                  </button>
                  {assessmentError && (
                    <p className="text-red-500 text-xs font-bold text-center mt-2">{assessmentError}</p>
                  )}
                </div>
              ) : !assessmentStarted && assessmentResult ? (
                /* Scenario B: Attempted - Show Result Badge / Banner */
                <div className="space-y-6">
                  {assessmentResult.status === 'passed' && (
                    <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-6 flex items-start gap-4">
                      <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-emerald-950">Assessment Passed!</h4>
                        <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
                          Congratulations! You scored <strong>{assessmentResult.score}%</strong> (Required: {assessment.passMark}%). This module coursework has been successfully credited to your workspace portfolio.
                        </p>
                      </div>
                    </div>
                  )}

                  {assessmentResult.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <HiOutlineExclamationTriangle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <h4 className="text-sm font-bold text-red-950">Passing Target Not Met</h4>
                          <p className="text-xs text-red-700 font-semibold leading-relaxed">
                            You scored <strong>{assessmentResult.score}%</strong> (Required: {assessment.passMark}%).
                          </p>
                        </div>
                      </div>

                      {getAttemptsRemaining() > 0 ? (
                        <div className="border-t border-red-100 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                          <span className="text-xs text-red-700 font-bold">
                            You have {getAttemptsRemaining()} of {assessment.maxAttempts} attempt(s) remaining.
                          </span>
                          <button
                            onClick={handleStartAssessment}
                            className="bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Re-Attempt Assessment
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-red-700 font-bold border-t border-red-100 pt-4 text-center">
                          ⚠️ You have exhausted all attempts. Please contact your coordinator to request a reset.
                        </p>
                      )}
                    </div>
                  )}

                  {assessmentResult.status === 'pending_review' && (
                    <div className="bg-amber-50 border border-amber-250 rounded-2xl p-6 flex items-start gap-4">
                      <HiOutlineInformationCircle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-amber-950">Submission Under Review</h4>
                        <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                          Your assessment has been submitted. Because it contains short-answer text fields, a coordinator must manually verify the scoring before your module lock status is evaluated. You will receive an in-app notification once graded.
                        </p>
                      </div>
                    </div>
                  )}

                  {assessmentError && (
                    <p className="text-red-500 text-xs font-bold text-center mt-2">{assessmentError}</p>
                  )}
                </div>
              ) : (
                /* Scenario C: Taking Assessment Quiz renderer */
                <div className="space-y-8 text-left">
                  {/* Timer Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
                    <span className="text-xs font-bold text-[#000666]">Attempt {assessmentResult ? assessmentResult.attemptNumber + 1 : 1} of {assessment.maxAttempts}</span>
                    {timeLeftSeconds !== null && (
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                        timeLeftSeconds < 120 
                          ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <HiOutlineClock className="w-4 h-4" />
                        Timer: {formatTime(timeLeftSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Questions list */}
                  <div className="space-y-6">
                    {assessment.questions.map((q, idx) => (
                      <div key={q._id} className="border border-slate-150 rounded-2xl p-5 bg-white space-y-4 shadow-sm">
                        <div className="flex justify-between">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Question {idx + 1}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{q.points} pt(s)</span>
                        </div>
                        <p className="text-sm font-bold text-[#000666] leading-snug">{q.text}</p>

                        {/* RENDER TYPES MCQ & TRUE/FALSE */}
                        {(q.type === 'mcq' || q.type === 'true_false' || q.type === 'multi_select') && (
                          <div className="space-y-2.5 pt-2">
                            {q.options.map((opt) => {
                              const isChecked = (selectedAnswers[q._id] || []).includes(opt._id);
                              const isMulti = q.type === 'multi_select';

                              return (
                                <label 
                                  key={opt._id} 
                                  className={`flex items-center gap-3 border rounded-xl p-3 text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50/50 ${
                                    isChecked 
                                      ? 'border-[#00B0FF] bg-sky-50/20 text-[#000666]' 
                                      : 'border-slate-150 text-slate-600'
                                  }`}
                                >
                                  <input
                                    type={isMulti ? "checkbox" : "radio"}
                                    name={`take_q_${q._id}`}
                                    checked={isChecked}
                                    onChange={() => handleOptionChange(q._id, opt._id, isMulti)}
                                    className="w-4.5 h-4.5 text-[#00B0FF] border-slate-200 focus:ring-[#00B0FF] cursor-pointer"
                                  />
                                  <span>{opt.text}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* RENDER TYPE SHORT ANSWER */}
                        {q.type === 'short_answer' && (
                          <div className="pt-2">
                            <textarea
                              rows={4}
                              placeholder="Type your answer here (maximum 500 characters)..."
                              value={textAnswers[q._id] || ''}
                              onChange={(e) => handleTextChange(q._id, e.target.value)}
                              className="w-full border border-slate-200 rounded-xl p-4 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666]"
                              maxLength={500}
                            />
                            <div className="text-right text-[10px] text-slate-400 font-semibold mt-1">
                              {(textAnswers[q._id] || '').length} / 500 chars
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Submission buttons */}
                  <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel? This attempt history will not be saved.")) {
                          setAssessmentStarted(false);
                          if (timerRef.current) clearInterval(timerRef.current);
                        }
                      }}
                      className="border border-slate-250 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all bg-white"
                    >
                      Cancel Attempt
                    </button>

                    <button
                      onClick={() => handleAssessmentSubmit(false)}
                      disabled={submittingAssessment}
                      className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition-all hover:shadow-md cursor-pointer disabled:bg-slate-200 disabled:cursor-not-allowed"
                    >
                      {submittingAssessment ? "Submitting Answers..." : "Submit Completed Assessment"}
                    </button>
                  </div>
                  {assessmentError && (
                    <p className="text-red-500 text-xs font-bold text-center mt-2">{assessmentError}</p>
                  )}
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

            {/* Complete / Next CTA Button */}
            {!currentMod.assessmentId ? (
              /* No assessment, standard Mark Complete button */
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
            ) : (
              /* Has assessment, can only click Next if already passed */
              <button
                onClick={navigateToNext}
                disabled={!assessmentResult || assessmentResult.status !== 'passed'}
                className={`w-full sm:w-auto font-bold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  !assessmentResult || assessmentResult.status !== 'passed'
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-600/95 hover:scale-[1.01] text-white hover:shadow-lg cursor-pointer"
                }`}
              >
                Next Lesson <HiOutlineArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
