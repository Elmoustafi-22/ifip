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
  HiOutlineChevronRight,
  HiOutlineChatBubbleLeftRight,
  HiOutlineXMark
} from "react-icons/hi2";
import { 
  adminGetAssessmentById, 
  adminGetAssessmentSubmissions, 
  adminGradeSubmission, 
  adminResetAttempts 
} from "@/lib/api/services";

export default function AssessmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = use(params);
  
  const [assessment, setAssessment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setSubmissions(submissionsData);
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

  const handleReset = async (userId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to reset all assessment attempts for ${studentName}? This will delete all prior attempt history and reset their LMS course progress to in-progress.`)) return;
    try {
      await adminResetAttempts(assessmentId, userId);
      alert(`Attempts reset successfully for ${studentName}.`);
      fetchData();
    } catch (err) {
      console.error("Failed to reset attempts:", err);
      alert("Failed to reset attempts.");
    }
  };

  // --- Manual Grading Modal Actions ---

  const openGradingModal = (sub: any) => {
    setSelectedSubmission(sub);
    
    // Extract short answer questions from assessment to align answers
    const shortAnswerQuestions = assessment?.questions?.filter((q: any) => q.type === 'short_answer') || [];
    const shortAnsIds = new Set(shortAnswerQuestions.map((q: any) => q._id.toString()));

    // Filter submission answers that are for short_answer questions
    const shortAnswersToGrade = sub.answers
      .filter((ans: any) => shortAnsIds.has(ans.questionId.toString()))
      .map((ans: any) => {
        const questionMeta = assessment.questions.find((q: any) => q._id.toString() === ans.questionId.toString());
        return {
          questionId: ans.questionId,
          text: questionMeta?.text || "Short Answer Question",
          maxPoints: questionMeta?.points || 1,
          textAnswer: ans.textAnswer || "",
          isCorrect: ans.isCorrect === null ? true : ans.isCorrect, // default to correct on edit
          pointsAwarded: ans.pointsAwarded || (questionMeta?.points || 1), // default to full points on edit
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
      // Automatically adjust points awarded to 0 if marked incorrect
      if (!value) {
        updated[index].pointsAwarded = 0;
      } else {
        updated[index].pointsAwarded = updated[index].maxPoints;
      }
    } else if (field === 'pointsAwarded') {
      const maxPts = updated[index].maxPoints;
      const pts = Math.max(0, Math.min(maxPts, Number(value)));
      updated[index].pointsAwarded = pts;
      // Automatically mark correct if points > 0
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

  // --- Dashboard Statistics Calculations ---

  const getStats = () => {
    const total = submissions.length;
    if (total === 0) return { passRate: 0, avgScore: 0, pending: 0 };
    
    const passedCount = submissions.filter(s => s.passed === true).length;
    const pendingCount = submissions.filter(s => s.status === 'pending_review').length;
    const totalScore = submissions.reduce((sum, s) => sum + s.score, 0);

    return {
      passRate: Math.round((passedCount / total) * 100),
      avgScore: Math.round(totalScore / total),
      pending: pendingCount
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

  const { passRate, avgScore, pending } = getStats();

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
          <div className="flex items-center gap-3">
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
              Course Gating: <span className="font-bold text-[#000666]">Module {assessment.moduleId.order} - {assessment.moduleId.title}</span> (Requires {assessment.passMark}% to unlock next)
            </p>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-[4px] flex items-center gap-2 shadow-sm transition-all bg-white disabled:opacity-50"
        >
          <HiOutlineArrowPath className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? "Refreshing..." : "Refresh Logs"}
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-150/70 p-6 rounded-2xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Attempts</span>
          <span className="text-3xl font-display font-black text-[#000666]">{submissions.length}</span>
        </div>
        <div className="bg-white border border-slate-150/70 p-6 rounded-2xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Completion Pass Rate</span>
          <span className="text-3xl font-display font-black text-emerald-600">{passRate}%</span>
        </div>
        <div className="bg-white border border-slate-150/70 p-6 rounded-2xl shadow-sm flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Average Score</span>
          <span className="text-3xl font-display font-black text-[#000666]">{avgScore}%</span>
        </div>
        <div className="bg-white border border-slate-150/70 p-6 rounded-2xl shadow-sm flex flex-col gap-1 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-slate-400">Awaiting Grade Reviews</span>
          <span className={`text-3xl font-display font-black ${pending > 0 ? 'text-amber-500' : 'text-[#000666]'}`}>{pending}</span>
          {pending > 0 && <span className="absolute w-2 h-2 rounded-full bg-amber-500 animate-ping top-6 right-6"></span>}
        </div>
      </div>

      {/* Submissions Table Section */}
      <h3 className="text-sm font-bold text-[#000666] mb-4">Submission History Log</h3>
      {submissions.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <HiOutlineClipboardDocumentCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">No attempts submitted yet for this assessment.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-150/70 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-6">Participant</th>
                <th className="py-4 px-6 text-center">Attempt #</th>
                <th className="py-4 px-6 text-center">Score (%)</th>
                <th className="py-4 px-6 text-center">Outcome</th>
                <th className="py-4 px-6 text-center">Time-Out</th>
                <th className="py-4 px-6">Submitted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-[#000666]">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                        <HiOutlineUser className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#000666]">{sub.userId?.fullName || "Student"}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{sub.userId?.email || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-slate-500">Attempt {sub.attemptNumber}</td>
                  <td className="py-4 px-6 text-center font-bold text-slate-600">{sub.score}%</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      sub.status === 'passed' 
                        ? 'bg-emerald-55/10 border border-emerald-100 text-emerald-700' 
                        : sub.status === 'failed'
                        ? 'bg-red-50 border border-red-100 text-red-600'
                        : 'bg-amber-50 border border-amber-100 text-amber-700'
                    }`}>
                      {sub.status === 'pending_review' ? 'pending grade' : sub.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {sub.timedOut ? (
                      <span className="text-red-500 text-[10px] font-bold">Timed Out ⚠️</span>
                    ) : (
                      <span className="text-slate-400 text-[10px] font-medium">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <HiOutlineClock className="w-3.5 h-3.5" />
                      {new Date(sub.submittedAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    <div className="flex justify-end gap-1.5">
                      {sub.status === 'pending_review' ? (
                        <button
                          onClick={() => openGradingModal(sub)}
                          className="px-3 py-1.5 bg-[#000666] hover:bg-[#000666]/90 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                        >
                          <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" /> Grade Review
                        </button>
                      ) : (
                        <button
                          onClick={() => openGradingModal(sub)}
                          className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Re-Grade
                        </button>
                      )}
                      <button
                        onClick={() => handleReset(sub.userId?._id, sub.userId?.fullName || "Student")}
                        className="p-1.5 border border-slate-200 hover:bg-red-55/10 hover:text-red-500 hover:border-red-100 rounded text-slate-400 transition-all"
                        title="Reset Attempt History & Lock Module"
                      >
                        <HiOutlineUserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-[#000666]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveGrade} className="bg-white border border-slate-100 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            <div className="bg-[#000666] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold font-display text-sm uppercase tracking-wider">Manual Score Review</h3>
                <p className="text-[10px] text-white/70 font-semibold mt-0.5">Student: {selectedSubmission.userId?.fullName} | Attempt #{selectedSubmission.attemptNumber}</p>
              </div>
              <button
                type="button"
                onClick={closeGradingModal}
                className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded transition-all"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#FDFBF7]">
              {gradingAnswers.map((ans, idx) => (
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
                        className="w-16 border border-slate-200 rounded px-2 py-1 text-center font-bold text-[#000666]"
                      />
                      <span className="text-slate-400 font-bold">/ {ans.maxPoints} pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={closeGradingModal}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingGrade}
                className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-5 py-2.5 rounded shadow-sm hover-lift transition-all disabled:opacity-50"
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
