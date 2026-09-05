"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  HiOutlineClipboardDocumentCheck,
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUserMinus,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineChatBubbleLeftRight,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles
} from "react-icons/hi2";
import { 
  adminGetAssessmentById, 
  adminGetAssessmentSubmissions, 
  adminGradeSubmission, 
  adminResetAttempts 
} from "@/lib/api/services";

interface ParticipantGroup {
  userId: string;
  user: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  totalAttempts: number;
  latestSubmission: any;
  highestScore: number;
  latestScore: number;
  isPassed: boolean;
  status: 'passed' | 'failed' | 'pending_review';
  latestSubmittedAt: string;
  history: any[];
}

export default function AssessmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = use(params);
  
  const [assessment, setAssessment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});

  // Grading modal states
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradingAnswers, setGradingAnswers] = useState<any[]>([]);
  const [savingGrade, setSavingGrade] = useState(false);

  const fetchData = async () => {
    try {
      const [assessmentData, submissionsData] = await Promise.all([
        adminGetAssessmentById(assessmentId),
        adminGetAssessmentSubmissions(assessmentId)
      ]);
      setAssessment(assessmentData);
      setSubmissions(submissionsData || []);
    } catch (err) {
      console.error("Failed to load submission data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assessmentId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserIds(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleReset = async (userId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to reset all assessment submissions and attempts for ${studentName}?\n\nThis will completely delete all their prior attempts from the database. The student will be able to take the assessment afresh with all attempts restored.`)) return;
    try {
      await adminResetAttempts(assessmentId, userId);
      alert(`Attempts reset successfully for ${studentName}. The participant can now start completely fresh.`);
      fetchData();
    } catch (err: any) {
      console.error("Failed to reset attempts:", err);
      alert(err.response?.data?.message || err.message || "Failed to reset attempts.");
    }
  };

  // --- Group Submissions by Participant ---
  const getParticipantGroups = (): ParticipantGroup[] => {
    const map = new Map<string, any[]>();
    
    for (const sub of submissions) {
      const uId = sub.userId?._id?.toString() || sub.userId?.toString() || sub._id?.toString();
      if (!map.has(uId)) {
        map.set(uId, []);
      }
      map.get(uId)!.push(sub);
    }

    const groups: ParticipantGroup[] = [];

    for (const [uId, subs] of map.entries()) {
      subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      
      const latest = subs[0];
      const isPassed = subs.some(s => s.passed === true || s.status === 'passed');
      const highestScore = Math.max(...subs.map(s => Number(s.score) || 0));
      const hasPending = subs.some(s => s.status === 'pending_review');

      let overallStatus: 'passed' | 'failed' | 'pending_review' = 'failed';
      if (isPassed) {
        overallStatus = 'passed';
      } else if (hasPending) {
        overallStatus = 'pending_review';
      } else {
        overallStatus = 'failed';
      }

      groups.push({
        userId: uId,
        user: latest.userId || { _id: uId, fullName: "Student", email: "" },
        totalAttempts: subs.length,
        latestSubmission: latest,
        highestScore,
        latestScore: latest.score || 0,
        isPassed,
        status: overallStatus,
        latestSubmittedAt: latest.submittedAt,
        history: subs,
      });
    }

    return groups;
  };

  const participantGroups = getParticipantGroups();

  // --- Manual Grading Modal Actions ---

  const openGradingModal = (sub: any) => {
    setSelectedSubmission(sub);
    
    const shortAnswerQuestions = assessment?.questions?.filter((q: any) => q.type === 'short_answer') || [];
    const shortAnsIds = new Set(shortAnswerQuestions.map((q: any) => q._id.toString()));

    const shortAnswersToGrade = (sub.answers || [])
      .filter((ans: any) => shortAnsIds.has(ans.questionId.toString()))
      .map((ans: any) => {
        const questionMeta = assessment.questions.find((q: any) => q._id.toString() === ans.questionId.toString());
        return {
          questionId: ans.questionId,
          text: questionMeta?.text || "Short Answer Question",
          maxPoints: questionMeta?.points || 1,
          textAnswer: ans.textAnswer || "",
          isCorrect: ans.isCorrect === null ? true : ans.isCorrect,
          pointsAwarded: ans.pointsAwarded || (questionMeta?.points || 1),
        };
      });

    setGradingAnswers(shortAnswersToGrade);
  };

  const closeGradingModal = () => {
    setSelectedSubmission(null);
    setGradingAnswers([]);
  };

  const updateGradeField = (index: number, field: 'isCorrect' | 'pointsAwarded', value: any) => {
    const updated = [...gradingAnswers];
    if (field === 'isCorrect') {
      updated[index].isCorrect = value;
      if (!value) {
        updated[index].pointsAwarded = 0;
      } else {
        updated[index].pointsAwarded = updated[index].maxPoints;
      }
    } else if (field === 'pointsAwarded') {
      const maxPts = updated[index].maxPoints;
      const pts = Math.max(0, Math.min(maxPts, Number(value)));
      updated[index].pointsAwarded = pts;
      updated[index].isCorrect = pts > 0;
    }
    setGradingAnswers(updated);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGrade) return;

    setSavingGrade(true);
    
    const gradesPayload = gradingAnswers.map(ans => ({
      questionId: ans.questionId,
      isCorrect: ans.isCorrect,
      pointsAwarded: Number(ans.pointsAwarded),
    }));

    try {
      await adminGradeSubmission(assessmentId, selectedSubmission._id, gradesPayload);
      alert("Submission graded and progress updated successfully!");
      closeGradingModal();
      fetchData();
    } catch (err: any) {
      console.error("Failed to submit grading details:", err);
      alert(err.message || "Failed to grade submission.");
    } finally {
      setSavingGrade(false);
    }
  };

  // --- Statistics Calculations ---
  const getStats = () => {
    const total = participantGroups.length;
    if (total === 0) return { passRate: 0, avgScore: 0, pending: 0, totalAttempts: submissions.length };
    
    const passedCount = participantGroups.filter(g => g.isPassed).length;
    const pendingCount = participantGroups.filter(g => g.status === 'pending_review').length;
    const totalScore = participantGroups.reduce((sum, g) => sum + g.highestScore, 0);

    return {
      passRate: Math.round((passedCount / total) * 100),
      avgScore: Math.round(totalScore / total),
      pending: pendingCount,
      totalAttempts: submissions.length,
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading submission logs...</p>
      </div>
    );
  }

  const { passRate, avgScore, pending, totalAttempts } = getStats();
  const maxAttemptsAllowed = assessment?.maxAttempts || 3;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] text-left">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/admin/assessments" className="text-xs font-bold text-[#000666] hover:underline flex items-center gap-1">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
        </Link>
      </div>

      {/* Header Info */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display text-[#000666]">{assessment?.title}</h1>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              assessment?.status === 'published' 
                ? 'bg-emerald-55/10 border border-emerald-100 text-emerald-700' 
                : assessment?.status === 'archived'
                ? 'bg-red-50 border border-red-100 text-red-600'
                : 'bg-slate-100 border border-slate-200 text-slate-600'
            }`}>
              {assessment?.status}
            </span>
          </div>
          {assessment?.moduleId && (
            <p className="text-xs text-slate-500 font-medium mt-1">
              Course Gating: <span className="font-bold text-[#000666]">Module {assessment.moduleId.order} - {assessment.moduleId.title}</span> (Requires {assessment.passMark}% &bull; {maxAttemptsAllowed} max attempts)
            </p>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all bg-white disabled:opacity-50 cursor-pointer"
        >
          <HiOutlineArrowPath className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? "Refreshing..." : "Refresh Submissions"}
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Participants</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-black text-[#000666]">{participantGroups.length}</span>
            <span className="text-xs text-slate-400 font-medium">({totalAttempts} total attempts)</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pass Rate</span>
          <span className="text-2xl font-display font-black text-emerald-600">{passRate}%</span>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Average Best Score</span>
          <span className="text-2xl font-display font-black text-[#000666]">{avgScore}%</span>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col gap-1 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pending Review</span>
          <span className={`text-2xl font-display font-black ${pending > 0 ? 'text-amber-500' : 'text-[#000666]'}`}>{pending}</span>
          {pending > 0 && <span className="absolute w-2 h-2 rounded-full bg-amber-500 animate-ping top-5 right-5"></span>}
        </div>
      </div>

      {/* Merged Participant Submissions Section */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-bold font-display text-[#000666]">Participant Submissions</h3>
          <p className="text-xs text-slate-500 font-medium">All attempts are consolidated per participant. Click Reset Attempts to give a fresh 3 attempts.</p>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg">
          {participantGroups.length} Participant(s)
        </span>
      </div>

      {participantGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <HiOutlineClipboardDocumentCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-[#000666]">No Submissions Yet</h4>
          <p className="text-xs text-slate-500 mt-1">No participants have submitted answers for this assessment yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {participantGroups.map((group) => {
            const isExpanded = Boolean(expandedUserIds[group.userId]);
            const isExhausted = group.totalAttempts >= maxAttemptsAllowed;
            const remainingAttempts = Math.max(0, maxAttemptsAllowed - group.totalAttempts);

            return (
              <div 
                key={group.userId} 
                className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Main Summary Header Row */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Participant Information */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-[#000666] text-sm font-bold shrink-0">
                      <HiOutlineUser className="w-5 h-5 text-[#000666]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#000666] text-sm sm:text-base">
                          {group.user?.fullName || "Student"}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          group.status === 'passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : group.status === 'pending_review'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {group.status === 'pending_review' ? 'Pending Review' : group.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        {group.user?.email || "No email available"}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Metrics and Attempts Count */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Attempts</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-[#000666] text-sm">
                          {group.totalAttempts} of {maxAttemptsAllowed}
                        </span>
                        {isExhausted && (
                          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                            Exhausted
                          </span>
                        )}
                        {!isExhausted && (
                          <span className="text-[9px] bg-sky-100 text-[#000666] px-1.5 py-0.5 rounded font-bold">
                            {remainingAttempts} left
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scores</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-slate-800 text-sm">
                          Latest: {group.latestScore}%
                        </span>
                        {group.totalAttempts > 1 && (
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            Best: {group.highestScore}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Last Active</span>
                      <span className="font-medium text-slate-600 text-xs flex items-center gap-1 mt-0.5">
                        <HiOutlineClock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(group.latestSubmittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {/* View / Grade Button */}
                    <button
                      type="button"
                      onClick={() => openGradingModal(group.latestSubmission)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-[#000666] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                      <span>{group.status === 'pending_review' ? 'Grade Review' : 'View / Regrade'}</span>
                    </button>

                    {/* Reset All Attempts Button */}
                    <button
                      type="button"
                      onClick={() => handleReset(group.userId, group.user?.fullName || "Student")}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:border-red-300 shadow-2xs"
                      title="Reset all attempts so the student can start completely fresh"
                    >
                      <HiOutlineUserMinus className="w-4 h-4 text-red-600" />
                      <span>Reset Attempts</span>
                    </button>

                    {/* Toggle History Dropdown */}
                    {group.totalAttempts > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.userId)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer"
                        title="Toggle Attempt History Breakdown"
                      >
                        {isExpanded ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Attempt History Drawer */}
                {isExpanded && group.history.length > 0 && (
                  <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-4 space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Individual Attempt Breakdown ({group.history.length} attempts)
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {group.history.map((att: any, attIdx: number) => (
                        <div 
                          key={att._id} 
                          className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              #{att.attemptNumber || (group.history.length - attIdx)}
                            </span>
                            <span className="font-bold text-[#000666]">
                              Score: {att.score}%
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              att.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {att.passed ? 'Passed' : 'Failed'}
                            </span>
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <HiOutlineClock className="w-3 h-3" />
                              {new Date(att.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => openGradingModal(att)}
                            className="text-[11px] font-bold text-[#000666] hover:underline"
                          >
                            Review This Attempt &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-[#000666]/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={handleSaveGrade} className="bg-white border border-slate-100 shadow-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            <div className="bg-[#000666] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold font-display text-sm uppercase tracking-wider">Manual Score Review</h3>
                <p className="text-[10px] text-white/70 font-semibold mt-0.5">
                  Student: {selectedSubmission.userId?.fullName} | Attempt #{selectedSubmission.attemptNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGradingModal}
                className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded transition-all cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#FDFBF7]">
              {gradingAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500 font-semibold">No open-ended short answer questions in this submission requiring manual grading.</p>
                </div>
              ) : (
                gradingAnswers.map((ans, idx) => (
                  <div key={ans.questionId.toString()} className="bg-white border border-slate-150/70 p-5 rounded-2xl shadow-sm space-y-4">
                    {/* Question Title */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Question #{idx + 1}</h4>
                      <p className="text-sm font-bold text-[#000666] mt-1">{ans.text}</p>
                    </div>

                    {/* Submission Answer */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Student Submission</span>
                      <p className="text-xs text-[#000666] font-semibold whitespace-pre-wrap leading-relaxed italic">
                        "{ans.textAnswer || <span className="text-slate-300 italic">No answer submitted</span>}"
                      </p>
                    </div>

                    {/* Grading Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50 pt-4 items-center">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`isCorrect_${idx}`}
                            checked={ans.isCorrect === true}
                            onChange={() => updateGradeField(idx, 'isCorrect', true)}
                            className="w-4 h-4 text-[#000666] border-slate-200 focus:ring-[#000666]"
                          />
                          <span className="text-xs font-bold text-[#000666] flex items-center gap-1">
                            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" /> Correct
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`isCorrect_${idx}`}
                            checked={ans.isCorrect === false}
                            onChange={() => updateGradeField(idx, 'isCorrect', false)}
                            className="w-4 h-4 text-[#000666] border-slate-200 focus:ring-[#000666]"
                          />
                          <span className="text-xs font-bold text-[#000666] flex items-center gap-1">
                            <HiOutlineXCircle className="w-4 h-4 text-red-500" /> Incorrect
                          </span>
                        </label>
                      </div>

                      <div className="flex justify-end items-center gap-2 text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Points Awarded</span>
                        <input
                          type="number"
                          min={0}
                          max={ans.maxPoints}
                          step={0.5}
                          value={ans.pointsAwarded}
                          onChange={(e) => updateGradeField(idx, 'pointsAwarded', e.target.value)}
                          className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-[#000666]"
                        />
                        <span className="text-slate-400 font-bold">/ {ans.maxPoints} pts</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={closeGradingModal}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingGrade || gradingAnswers.length === 0}
                className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingGrade ? "Saving Grades..." : "Apply Grade Verdict ✓"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
