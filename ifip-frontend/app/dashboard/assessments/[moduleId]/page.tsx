"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  HiOutlineClipboardDocumentList, 
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineShieldCheck,
  HiOutlineXCircle
} from "react-icons/hi2";
import { 
  getAssessmentForParticipant, 
  getLatestAssessmentResult, 
  startAssessment, 
  submitAssessment,
  getLMSModules,
  LMSModule
} from "@/lib/api/services";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function QuestionTextRenderer({ text }: { text: string }) {
  if (!text) return null;

  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const isScenarioFirst = paragraphs.length > 1 && /^(Scenario\s*\d+|Case\s*Study\s*\d*|Case\s*\d+|Part\s*[A-Z0-9]+)/i.test(paragraphs[0]);

  if (isScenarioFirst) {
    const headerTitle = paragraphs[0].replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '');
    const middleNarrative = paragraphs.slice(1, paragraphs.length > 2 ? -1 : 2).join('\n\n');
    const questionPrompt = paragraphs.length > 2 ? paragraphs[paragraphs.length - 1] : null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-[#000666] text-xs tracking-tight border-b border-slate-100 pb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00B0FF] inline-block shrink-0" />
          <span>{headerTitle}</span>
        </div>

        <div className="text-slate-700 text-xs leading-relaxed font-normal bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {middleNarrative}
          </ReactMarkdown>
        </div>

        {questionPrompt && (
          <div className="font-bold text-[#000666] text-xs leading-relaxed pt-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {questionPrompt}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-800 leading-relaxed prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children, ...props }) => (
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-[#000666]" {...props}>
              {children}
            </strong>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function AssessmentTakingPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const moduleId = resolvedParams.moduleId;

  const [moduleData, setModuleData] = useState<LMSModule | null>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz Taking States
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, { left: string; right: string }[]>>({});
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  // Integrity Guard & Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [unansweredCountState, setUnansweredCountState] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [modulesList, assessmentMeta, resultData] = await Promise.all([
        getLMSModules(),
        getAssessmentForParticipant(moduleId).catch(() => null),
        getLatestAssessmentResult(moduleId).catch(() => null)
      ]);

      const currentMod = modulesList.find(m => m._id === moduleId);
      setModuleData(currentMod || null);

      if (!assessmentMeta) {
        setError("No active or published assessment was found for this module.");
        return;
      }

      setAssessment(assessmentMeta);
      setAssessmentResult(resultData && resultData.status !== 'not_attempted' ? resultData : null);
    } catch (err: any) {
      console.error("Failed to load assessment data:", err);
      setError(err.response?.data?.message || err.message || "Unable to load assessment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessmentData();
  }, [moduleId]);

  // Tab switch anti-cheat detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && assessmentStarted) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          setShowTabSwitchWarning(true);
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [assessmentStarted]);

  // Timer countdown handler
  useEffect(() => {
    if (!assessmentStarted || timeLeftSeconds === null) return;

    if (timeLeftSeconds <= 0) {
      handleAssessmentSubmit(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentStarted, timeLeftSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getAttemptsRemaining = () => {
    if (!assessment) return 0;
    if (assessmentResult && typeof assessmentResult.attemptsRemaining === 'number') {
      return assessmentResult.attemptsRemaining;
    }
    const used = assessmentResult ? (assessmentResult.totalAttempts ?? assessmentResult.attemptNumber ?? 0) : 0;
    return Math.max(0, (assessment.maxAttempts || 3) - used);
  };

  const handleStartAssessment = async () => {
    setLoading(true);
    setAssessmentError(null);
    setTabSwitchCount(0);
    setShowTabSwitchWarning(false);
    try {
      const data = await startAssessment(moduleId);
      setStartedAt(data.startedAt || new Date().toISOString());
      setSelectedAnswers({});
      setTextAnswers({});
      setMatchingAnswers({});
      setCurrentQuestionIndex(0);
      setAssessmentStarted(true);

      if (assessment?.timeLimitMinutes) {
        setTimeLeftSeconds(assessment.timeLimitMinutes * 60);
      } else {
        setTimeLeftSeconds(null);
      }
    } catch (err: any) {
      console.error("Failed to start assessment attempt:", err);
      const msg = err.response?.data?.message || err.message || "Failed to start assessment.";
      setAssessmentError(msg);
      // Re-fetch assessment state to ensure attempts and unlocked solutions are accurately synced
      await fetchAssessmentData();
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (questionId: string, optionId: string, isMulti: boolean) => {
    if (isMulti) {
      const current = selectedAnswers[questionId] || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      setSelectedAnswers({ ...selectedAnswers, [questionId]: updated });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [questionId]: [optionId] });
    }
  };

  const handleTextChange = (questionId: string, text: string) => {
    setTextAnswers({ ...textAnswers, [questionId]: text });
  };

  const handleMatchingChange = (questionId: string, left: string, right: string) => {
    const current = matchingAnswers[questionId] || [];
    const filtered = current.filter(pair => pair.left !== left);
    if (right) {
      filtered.push({ left, right });
    }
    setMatchingAnswers({ ...matchingAnswers, [questionId]: filtered });
  };

  const onPromptSubmit = () => {
    if (!assessment) return;
    const unanswered = assessment.questions.filter((q: any) => {
      if (q.type === 'short_answer') return !(textAnswers[q._id] || '').trim();
      if (q.type === 'matching') {
        const m = matchingAnswers[q._id] || [];
        return m.length < (q.matchingLeft || []).length || m.some(p => !p.right);
      }
      return !(selectedAnswers[q._id] || []).length;
    }).length;

    if (unanswered > 0) {
      setUnansweredCountState(unanswered);
      setShowSubmitModal(true);
    } else {
      executeSubmit();
    }
  };

  const handleReviewUnanswered = () => {
    setShowSubmitModal(false);
    if (assessment?.questions) {
      const firstUnansweredIdx = assessment.questions.findIndex((q: any) => {
        if (q.type === 'short_answer') return !(textAnswers[q._id] || '').trim();
        if (q.type === 'matching') {
          const m = matchingAnswers[q._id] || [];
          return m.length < (q.matchingLeft || []).length || m.some(p => !p.right);
        }
        return !(selectedAnswers[q._id] || []).length;
      });
      if (firstUnansweredIdx !== -1) {
        setCurrentQuestionIndex(firstUnansweredIdx);
      }
    }
  };

  const executeSubmit = async () => {
    if (submittingAssessment) return;
    setSubmittingAssessment(true);
    setAssessmentError(null);

    const answersPayload = assessment.questions.map((q: any) => ({
      questionId: q._id,
      selectedOptionIds: selectedAnswers[q._id] || [],
      textAnswer: textAnswers[q._id] || '',
      matchingAnswers: matchingAnswers[q._id] || [],
    }));

    try {
      await submitAssessment(moduleId, {
        startedAt: startedAt || new Date().toISOString(),
        answers: answersPayload,
      });

      if (timerRef.current) clearInterval(timerRef.current);
      setAssessmentStarted(false);
      await fetchAssessmentData();
    } catch (err: any) {
      console.error("Failed to submit assessment:", err);
      setAssessmentError(err.response?.data?.message || err.message || "Failed to submit assessment.");
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const handleAssessmentSubmit = async (isTimedOut = false) => {
    if (isTimedOut) {
      await executeSubmit();
    } else {
      onPromptSubmit();
    }
  };

  if (loading && !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Preparing secure assessment environment...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <HiOutlineExclamationTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Assessment Unavailable</h2>
        <p className="text-slate-500 text-xs mb-6 max-w-md mx-auto">{error || "This assessment is not available yet."}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard/assessments"
            className="bg-[#000666] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#000666]/90 transition-all shadow-sm"
          >
            Back to Assessments Hub
          </Link>
          {moduleId && (
            <Link
              href={`/dashboard/modules/${moduleId}`}
              className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all"
            >
              Back to Module
            </Link>
          )}
        </div>
      </div>
    );
  }

  const questions = assessment.questions || [];
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-1 sm:px-6 font-sans min-w-0 max-w-full">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 min-w-0 max-w-full">
        <Link
          href="/dashboard/assessments"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#000666] transition-colors shrink-0"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Assessments Hub
        </Link>
        {moduleData && (
          <span className="text-[11px] font-bold text-[#000666] bg-sky-50 px-3 py-1 rounded-full border border-sky-100 truncate max-w-full min-w-0 self-start sm:self-auto">
            Module {moduleData.order}: {moduleData.title}
          </span>
        )}
      </div>

      {/* Main Assessment Container */}
      <div 
        onContextMenu={(e) => assessmentStarted && e.preventDefault()}
        onCopy={(e) => assessmentStarted && e.preventDefault()}
        className={`bg-white border border-[#E7E2D8] rounded-3xl p-4 sm:p-8 shadow-sm space-y-6 min-w-0 max-w-full overflow-x-hidden ${assessmentStarted ? 'select-none' : ''}`}
      >
        {/* Anti-Cheat Tab Switch Warning */}
        {showTabSwitchWarning && assessmentStarted && (
          <div className="bg-amber-500 text-white text-xs font-bold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0 text-white" />
              <span>Warning: Tab switching is monitored during evaluations ({tabSwitchCount} switch recorded). Please remain on this screen.</span>
            </div>
            <button 
              type="button"
              onClick={() => setShowTabSwitchWarning(false)}
              className="text-[10px] bg-white/20 px-2 py-1 rounded uppercase font-bold hover:bg-white/30 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION A: START SCREEN (NOT STARTED YET & NO PREVIOUS RESULT) */}
        {!assessmentStarted && !assessmentResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#000666] flex items-center justify-center mx-auto border border-sky-100 shadow-xs">
              <HiOutlineClipboardDocumentList className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#000666] mb-2">{assessment.title}</h1>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Complete this knowledge evaluation to test your understanding of the concepts taught in this module.
              </p>
            </div>

            {assessment.instructions && (
              <div className="text-xs text-slate-600 font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left max-w-xl mx-auto leading-relaxed">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Instructions:</span>
                <p>{assessment.instructions}</p>
              </div>
            )}

            {/* Assessment Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs max-w-xl mx-auto bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-left">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Pass Mark</span>
                <span className="font-bold text-[#000666] text-sm">{assessment.passMark}%</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Questions</span>
                <span className="font-bold text-[#000666] text-sm">{questions.length} Items</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Attempts</span>
                <span className="font-bold text-[#000666] text-sm">{assessment.maxAttempts} Allowed</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Time Limit</span>
                <span className="font-bold text-[#000666] text-sm">
                  {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} mins` : "Untimed"}
                </span>
              </div>
            </div>

            <div className="pt-2 max-w-md mx-auto space-y-3">
              <button
                onClick={handleStartAssessment}
                className="w-full bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs py-3.5 rounded-xl shadow-sm transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <HiOutlineShieldCheck className="w-4 h-4 text-[#00B0FF]" /> Start Assessment Attempt
              </button>
              {assessmentError && (
                <p className="text-red-500 text-xs font-bold">{assessmentError}</p>
              )}
            </div>
          </div>
        )}

        {/* SECTION B: RESULTS & SOLUTIONS REVIEW SCREEN */}
        {!assessmentStarted && assessmentResult && (
          <div className="space-y-6">
            {/* Outcome Banner */}
            {assessmentResult.status === 'passed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
                <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-emerald-950">Assessment Passed!</h4>
                  <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
                    Congratulations! You scored <strong>{assessmentResult.score}%</strong> (Pass mark: {assessment.passMark}%). This module coursework is officially credited.
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
                      You scored <strong>{assessmentResult.score}%</strong> (Required passing score: {assessment.passMark}%).
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
                      className="bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Re-Attempt Assessment
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-red-700 font-bold border-t border-red-100 pt-4 text-center">
                    <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>You have exhausted all attempts. Please review the solutions below.</span>
                  </div>
                )}
              </div>
            )}

            {/* Answer & Solution Review Panel */}
            {assessmentResult.answers && assessmentResult.answers.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 border-b border-slate-150 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlineAcademicCap className="w-4 h-4 text-[#000666]" />
                    <span className="text-xs font-bold text-[#000666]">
                      {assessmentResult.revealAnswers ? "Complete Solutions & Answer Review" : "Question Evaluation Feedback"}
                    </span>
                  </div>
                  {assessmentResult.revealAnswers && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      Answers Unlocked
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {assessmentResult.answers.map((a: any, idx: number) => {
                    const q = questions.find((qq: any) => qq._id === a.questionId);
                    const isCorrect = a.isCorrect === true;
                    const isRevealed = Boolean(assessmentResult.revealAnswers);

                    return (
                      <div key={idx} className="px-5 py-4 space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Question {idx + 1} &bull; {q?.type === 'short_answer' ? 'Short Answer' : q?.type === 'matching' ? 'Matching' : 'Multiple Choice'}
                            </span>
                            {q && (
                              <div className="text-xs font-semibold text-slate-800 leading-snug">
                                <QuestionTextRenderer text={q.text} />
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {a.pointsAwarded} / {q?.points ?? 1} pt(s)
                          </span>
                        </div>

                        {/* Direct Feedback Banner */}
                        <div className={`flex items-start gap-2.5 p-3 rounded-xl text-xs font-semibold leading-relaxed ${
                          isCorrect
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                            : 'bg-red-50 text-red-900 border border-red-100'
                        }`}>
                          {isCorrect ? (
                            <HiOutlineCheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                          ) : (
                            <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                          )}
                          <span>{a.feedback || (isCorrect ? "Correct. Your response is correct." : "Incorrect. Your answer is incorrect.")}</span>
                        </div>

                        {/* Participant's Submitted Answer Display */}
                        <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Your Submitted Answer:
                          </span>

                          {/* Short Answer Display */}
                          {q?.type === 'short_answer' && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <p className={`font-semibold leading-relaxed whitespace-pre-wrap ${!a.textAnswer ? 'text-slate-400 italic' : isCorrect ? 'text-emerald-950' : 'text-red-950'}`}>
                                {a.textAnswer ? `"${a.textAnswer}"` : "No response provided."}
                              </p>
                            </div>
                          )}

                          {/* MCQ / True-False / Multi-Select Display */}
                          {(q?.type === 'mcq' || q?.type === 'true_false' || q?.type === 'multi_select') && (
                            <div>
                              {(!a.selectedOptionIds || a.selectedOptionIds.length === 0) ? (
                                <p className="text-slate-400 italic text-xs">No option selected</p>
                              ) : (
                                <div className="space-y-1.5 pt-0.5">
                                  {q.options
                                    .filter((opt: any) => (a.selectedOptionIds || []).includes(opt._id))
                                    .map((opt: any, oIdx: number) => (
                                      <div key={oIdx} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                                        isCorrect 
                                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                                          : 'bg-red-50/80 border-red-200 text-red-950'
                                      }`}>
                                        {isCorrect ? (
                                          <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ) : (
                                          <HiOutlineXCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        )}
                                        <span className="leading-relaxed">{opt.text}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Matching Pairs Display */}
                          {q?.type === 'matching' && (
                            <div>
                              {(!a.matchingAnswers || a.matchingAnswers.length === 0) ? (
                                <p className="text-slate-400 italic text-xs">No pairs matched</p>
                              ) : (
                                <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                                  {a.matchingAnswers.map((pair: any, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-800">
                                      <span className="font-bold text-[#000666] sm:w-1/3">{pair.left}</span>
                                      <span className="text-slate-400 font-bold hidden sm:inline">&rarr;</span>
                                      <span className={`font-medium sm:w-2/3 ${!pair.right ? 'text-slate-400 italic' : isCorrect ? 'text-emerald-950' : 'text-slate-800'}`}>
                                        {pair.right || "Unmatched"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Revealed Solutions Box (After 3 attempts or passing) */}
                        {isRevealed && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#000666] block">
                              Reference Solution / Model Answer:
                            </span>

                            {/* MCQ / Multi-Select Choices */}
                            {q && (q.type === 'mcq' || q.type === 'true_false' || q.type === 'multi_select') && a.correctOptionIds && (
                              <div className="space-y-1.5 pt-0.5">
                                <span className="text-slate-500 text-[11px] font-medium block">Correct Choice(s):</span>
                                {q.options.filter((opt: any) => (a.correctOptionIds || []).includes(opt._id)).map((opt: any, oIdx: number) => (
                                  <div key={oIdx} className="flex items-center gap-2 font-bold text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/50">
                                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Matching Pairs */}
                            {q && q.type === 'matching' && a.matchingPairs && (
                              <div className="space-y-1.5 pt-0.5">
                                <span className="text-slate-500 text-[11px] font-medium block">Correct Matching Pairs:</span>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {a.matchingPairs.map((pair: any, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                                      <span className="font-bold text-[#000666]">{pair.left}</span>
                                      <span className="text-slate-400 font-bold">&rarr;</span>
                                      <span className="font-medium text-slate-800">{pair.right}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Short Answer Exact Solution from Lesson */}
                            {q && q.type === 'short_answer' && (
                              <div className="space-y-1 pt-0.5 text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
                                <p>{a.explanation || q.explanation || "Please refer to the contract definitions in the module lesson."}</p>
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
          </div>
        )}

        {/* SECTION C: INTERACTIVE QUIZ WIZARD (STEP-BY-STEP SINGLE QUESTION) */}
        {assessmentStarted && (
          <div className="space-y-6 text-left">
            {/* Timer & Header */}
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#000666]">
                  Attempt {assessmentResult ? assessmentResult.attemptNumber + 1 : 1} of {assessment.maxAttempts}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs font-semibold text-slate-500">
                  Passing Score: {assessment.passMark}%
                </span>
              </div>

              {timeLeftSeconds !== null && (
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  timeLeftSeconds < 120 
                    ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <HiOutlineClock className="w-4 h-4" />
                  Timer: {formatTime(timeLeftSeconds)}
                </span>
              )}
            </div>

            {/* Progress Bar & Jump Number Pills */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#000666]">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Completed
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#000666] h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Jump Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {questions.map((q: any, qIdx: number) => {
                  const isCurrent = qIdx === currentQuestionIndex;
                  let isAnswered = false;
                  if (q.type === 'short_answer') {
                    isAnswered = Boolean((textAnswers[q._id] || '').trim());
                  } else if (q.type === 'matching') {
                    const matches = matchingAnswers[q._id] || [];
                    isAnswered = matches.length > 0 && matches.every(m => Boolean(m.right));
                  } else {
                    isAnswered = (selectedAnswers[q._id] || []).length > 0;
                  }

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(qIdx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'bg-[#000666] text-white ring-2 ring-[#00B0FF] ring-offset-1'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`Jump to Question ${qIdx + 1}${isAnswered ? ' (Answered)' : ''}`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question Card */}
            {currentQ && (
              <div className="border border-slate-150 rounded-2xl p-6 bg-white space-y-5 shadow-sm min-h-[220px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00B0FF]" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Question {currentQuestionIndex + 1}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {currentQ.points} pt(s)
                  </span>
                </div>

                <div className="pt-1">
                  <QuestionTextRenderer text={currentQ.text} />
                </div>

                {/* MCQ / TRUE_FALSE / MULTI_SELECT */}
                {(currentQ.type === 'mcq' || currentQ.type === 'true_false' || currentQ.type === 'multi_select') && (
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options.map((opt: any, oIdx: number) => {
                      const isChecked = (selectedAnswers[currentQ._id] || []).includes(opt._id);
                      const isMulti = currentQ.type === 'multi_select';
                      const letterLabel = String.fromCharCode(65 + oIdx);

                      return (
                        <label 
                          key={opt._id} 
                          className={`flex items-center gap-3.5 border rounded-xl p-3.5 text-xs font-semibold cursor-pointer transition-all hover:bg-slate-50/70 ${
                            isChecked 
                              ? 'border-[#00B0FF] bg-sky-50/30 text-[#000666] ring-1 ring-[#00B0FF]' 
                              : 'border-slate-200 text-slate-700 bg-white'
                          }`}
                        >
                          <input
                            type={isMulti ? "checkbox" : "radio"}
                            name={`take_q_${currentQ._id}`}
                            checked={isChecked}
                            onChange={() => handleOptionChange(currentQ._id, opt._id, isMulti)}
                            className="w-4.5 h-4.5 text-[#00B0FF] border-slate-300 focus:ring-[#00B0FF] cursor-pointer"
                          />
                          {currentQ.type !== 'true_false' && (
                            <span className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 border ${
                              isChecked 
                                ? 'bg-[#000666] text-white border-[#000666]' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {letterLabel}
                            </span>
                          )}
                          <span className="flex-1 leading-relaxed min-w-0 break-words">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* MATCHING */}
                {currentQ.type === 'matching' && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-semibold text-slate-500 italic">Select the matching definition for each concept:</p>
                    <div className="space-y-2.5">
                      {(currentQ.matchingLeft || []).map((leftItem: string, lIdx: number) => {
                        const selectedMatch = (matchingAnswers[currentQ._id] || []).find(p => p.left === leftItem)?.right || '';
                        return (
                          <div key={lIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                            <span className="text-xs font-bold text-[#000666] sm:w-1/3">{leftItem}</span>
                            <span className="text-slate-400 text-xs hidden sm:inline">&rarr;</span>
                            <select
                              value={selectedMatch}
                              onChange={(e) => handleMatchingChange(currentQ._id, leftItem, e.target.value)}
                              className="sm:w-3/5 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
                            >
                              <option value="">-- Choose matching definition --</option>
                              {(currentQ.matchingRight || []).map((rightItem: string, rIdx: number) => (
                                <option key={rIdx} value={rightItem}>{rightItem}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SHORT ANSWER */}
                {currentQ.type === 'short_answer' && (
                  <div className="pt-2">
                    <textarea
                      rows={4}
                      placeholder="Type your answer here based on what you learned in the module..."
                      value={textAnswers[currentQ._id] || ''}
                      onChange={(e) => handleTextChange(currentQ._id, e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-4 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666]"
                      maxLength={500}
                    />
                    <div className="text-right text-[10px] text-slate-400 font-semibold mt-1">
                      {(textAnswers[currentQ._id] || '').length} / 500 chars
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full sm:w-auto border border-slate-250 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all bg-white cursor-pointer"
              >
                Cancel Attempt
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="flex-1 sm:flex-initial border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  &larr; Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="flex-1 sm:flex-initial bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Next Question &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAssessmentSubmit(false)}
                    disabled={submittingAssessment}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-all hover:shadow-md cursor-pointer disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {submittingAssessment ? "Submitting..." : "Submit Assessment ✓"}
                  </button>
                )}
              </div>
            </div>

            {assessmentError && (
              <p className="text-red-500 text-xs font-bold text-center mt-2">{assessmentError}</p>
            )}
          </div>
        )}

        {/* SUBMIT CONFIRMATION MODAL (For Unanswered Questions) */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <HiOutlineExclamationTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold font-display text-[#000666]">
                  Unanswered Questions Detected
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  You have <strong className="text-amber-700 font-bold">{unansweredCountState} unanswered question(s)</strong> remaining. Are you sure you want to submit your assessment now? Any unanswered questions will receive 0 points.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReviewUnanswered}
                  className="w-full sm:w-1/2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Review Questions
                </button>
                <button
                  type="button"
                  disabled={submittingAssessment}
                  onClick={() => {
                    setShowSubmitModal(false);
                    executeSubmit();
                  }}
                  className="w-full sm:w-1/2 bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingAssessment ? "Submitting..." : "Submit Anyway"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL ATTEMPT CONFIRMATION MODAL */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <HiOutlineXCircle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold font-display text-[#000666]">
                  Cancel Assessment Attempt?
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Are you sure you want to exit? Your answers for this in-progress attempt will not be submitted.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="w-full sm:w-1/2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Continue Test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setAssessmentStarted(false);
                    if (timerRef.current) clearInterval(timerRef.current);
                  }}
                  className="w-full sm:w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
