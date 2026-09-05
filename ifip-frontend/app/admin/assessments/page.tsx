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
  HiOutlineQuestionMarkCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
  HiOutlineTableCells
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

        <div className="text-slate-700 text-xs leading-relaxed font-normal bg-white p-3 rounded-lg border border-slate-150 shadow-2xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {middleNarrative}
          </ReactMarkdown>
        </div>

        {questionPrompt && (
          <div className="font-bold text-[#000666] text-xs leading-relaxed pt-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {questionPrompt}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-800 leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:text-[#000666] prose-headings:font-bold prose-strong:text-[#000666] prose-strong:font-bold">
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

interface Option {
  _id: string; // client-generated temp ID or server Mongo ID
  text: string;
}

interface Question {
  _id?: string;
  text: string;
  type: 'mcq' | 'multi_select' | 'true_false' | 'short_answer' | 'matching';
  options: Option[];
  matchingPairs?: { left: string; right: string }[];
  correctOptionIds: string[];
  partialCredit: boolean;
  points: number;
  order: number;
  /** Model answer / rubric used by AI grader for short_answer questions */
  explanation?: string;
  /** Accepted keywords for exact-match short_answer auto-grading */
  acceptedKeywords?: string[];
}

export function parseCurriculumDocument(rawDoc: string): { title?: string; questions: Question[] } {
  if (!rawDoc.trim()) return { questions: [] };

  let doc = rawDoc.replace(/\r\n/g, '\n').trim();
  let extractedTitle: string | undefined = undefined;

  // Strip author commentary at bottom if present
  const notesIndex = doc.search(/\n\s*These are\s+\*\*short/i);
  if (notesIndex !== -1) {
    doc = doc.substring(0, notesIndex).trim();
  }

  // Check if document starts with a title e.g. # MODULE 1 KNOWLEDGE CHECK or ## Module 1 Knowledge Check
  const titleMatch = doc.match(/^#+\s*(?:[*_]*)([^\n*#_]+)(?:[*_]*)/m);
  if (titleMatch && titleMatch[1]) {
    const candidate = titleMatch[1].trim();
    if (candidate.toLowerCase().includes('knowledge check') || candidate.toLowerCase().includes('assessment') || candidate.toLowerCase().includes('module')) {
      extractedTitle = candidate;
    }
  }

  // Remove top document title line before splitting questions
  doc = doc.replace(/^#+\s*.*(?:\n+##\s*.*)?\n+/i, '').trim();

  // Split into question chunks using horizontal rules (---) OR question headers (### 1.) OR Scenario headers (**Scenario 1**)
  const rawChunks = doc
    .split(/(?:\n\s*[-_*]{3,}\s*\n|\n(?=###?\s*(?:\*\*)?\d+[\.\)\-:]|\*{0,2}Scenario\s*\d+\s*[-—:]|\*{0,2}Case\s*Study\s*\d*|\*{0,2}Case\s*\d+[-—:]))/i)
    .map(c => c.trim())
    .filter(Boolean);

  const generatedQuestions: Question[] = [];

  rawChunks.forEach((chunk) => {
    if (!chunk.trim()) return;

    let lines = chunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Check if first line is a section heading like "### 1. Complete the thought" or "### **2\. Match"
    let headingTitle = "";
    if (/^#{1,6}\s*/.test(lines[0]) || /^\*\*\d+[\\\.]/.test(lines[0])) {
      headingTitle = lines[0]
        .replace(/^#{1,6}\s*/, '')       // strip ### / ## / #
        .replace(/^\*\*|\*\*$/g, '')    // strip leading/trailing **
        .replace(/\\\./g, '.')           // unescape \.
        .replace(/^\d+[\.\)\-]\s*/, '') // strip leading number like "2. "
        .trim();
      lines.shift(); // remove header
    }

    // Find Answer line if present e.g. "**Answer:** Shariah" or "Answer: All of them"
    let answerLine: string | null = null;
    const answerLineIdx = lines.findIndex(l => /^(\*\*)?Answer:?(\*\*)?/i.test(l));
    if (answerLineIdx !== -1) {
      answerLine = lines[answerLineIdx].replace(/^(\*\*)?Answer:?(\*\*)?\s*/i, '').replace(/^\*\*|\*\*$/g, '').trim();
      lines.splice(answerLineIdx, 1);
    }

    // Check for Matching Table (markdown table syntax: | Concept | Meaning |)
    const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
    if (tableLines.length >= 3) {
      const nonTableLines = lines.filter(l => !(l.startsWith('|') && l.endsWith('|')));
      const prompt = [headingTitle, ...nonTableLines].filter(Boolean).join('\n\n');

      // Parse data rows (skipping header row and separator row |---|---|)
      const dataRows = tableLines.slice(2);
      const matchingPairs: { left: string; right: string }[] = [];

      dataRows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length >= 2) {
          const left = cells[0].replace(/^\*\*|\*\*$/g, '').trim();
          let right = cells[1].replace(/^\*\*|\*\*$/g, '').replace(/^[A-Z][\.\)\-]\s*/, '').trim();
          matchingPairs.push({ left, right });
        }
      });

      if (matchingPairs.length > 0) {
        generatedQuestions.push({
          text: prompt || "Match each concept to what it refers to:",
          type: 'matching',
          options: [],
          matchingPairs,
          correctOptionIds: [],
          partialCredit: true,
          points: matchingPairs.length,
          order: generatedQuestions.length + 1
        });
        return;
      }
    }

    // Check for Checkbox Multi-Select (ONLY match actual checkboxes or bullet items like ☐, [ ], ☑, -, •, NOT bold text with **)
    const checkboxLines = lines.filter(l => /^[☐◻☑✓✔]\s*|^\[\s*[xX]?\s*\]\s*|^[\-\+•]\s+/.test(l));
    if (checkboxLines.length >= 2) {
      const nonOptionLines = lines.filter(l => !/^[☐◻☑✓✔]\s*|^\[\s*[xX]?\s*\]\s*|^[\-\+•]\s+/.test(l));
      const prompt = [headingTitle, ...nonOptionLines].filter(Boolean).join('\n\n');

      const options = checkboxLines.map(line => ({
        _id: 'opt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
        text: line.replace(/^[☐◻☑✓✔]\s*|^\[\s*[xX]?\s*\]\s*|^[\-\+•]\s+/, '').replace(/^\*\*|\*\*$/g, '').trim()
      }));

      const isAllCorrect = answerLine && (answerLine.toLowerCase().includes('all') || answerLine.toLowerCase().includes('every'));
      const correctOptionIds = isAllCorrect ? options.map(o => o._id) : [];

      generatedQuestions.push({
        text: prompt || "Which of the following apply?",
        type: 'multi_select',
        options,
        correctOptionIds,
        partialCredit: true,
        points: 1,
        order: generatedQuestions.length + 1
      });
      return;
    }

    // Check for MCQ Choices (lines starting with A., B., C., D. or **A.**, **B.**)
    const mcqLines = lines.filter(l => /^(\*\*)?[A-Da-d][\.\)\-]\s+/.test(l));
    if (mcqLines.length >= 2) {
      const nonOptionLines = lines.filter(l => !/^(\*\*)?[A-Da-d][\.\)\-]\s+/.test(l));
      const prompt = [headingTitle, ...nonOptionLines].filter(Boolean).join('\n\n');

      const options = mcqLines.map(line => {
        const cleaned = line.replace(/^(\*\*)?[A-Da-d][\.\)\-]\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
        return {
          _id: 'opt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
          text: cleaned
        };
      });

      // Try matching correct option from answerLine
      let correctOptionIds: string[] = [];
      if (answerLine) {
        const letterMatch = answerLine.match(/^[A-Da-d]\b/);
        if (letterMatch) {
          const letterIdx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          if (options[letterIdx]) {
            correctOptionIds = [options[letterIdx]._id];
          }
        } else {
          const found = options.find(o => o.text.toLowerCase().includes(answerLine!.toLowerCase()));
          if (found) correctOptionIds = [found._id];
        }
      }

      generatedQuestions.push({
        text: prompt,
        type: 'mcq',
        options,
        correctOptionIds,
        partialCredit: false,
        points: 1,
        order: generatedQuestions.length + 1
      });
      return;
    }

    // Otherwise: Short answer / Fill in the blank / Scenario
    const fullText = [headingTitle, ...lines].filter(Boolean).join('\n\n');
    // Use extracted answerLine as the model answer / explanation for AI grading
    generatedQuestions.push({
      text: fullText,
      type: 'short_answer',
      options: [],
      correctOptionIds: [],
      partialCredit: false,
      points: 1,
      order: generatedQuestions.length + 1,
      explanation: answerLine || '',
      acceptedKeywords: [],
    });
  });

  return { title: extractedTitle, questions: generatedQuestions };
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

  // Bulk paste modal state for choices
  const [bulkOptionModalOpen, setBulkOptionModalOpen] = useState(false);
  const [bulkOptionTargetQIdx, setBulkOptionTargetQIdx] = useState<number | null>(null);
  const [bulkOptionText, setBulkOptionText] = useState("");

  // Bulk Curriculum Document Import state
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkImportRawText, setBulkImportRawText] = useState("");
  const [bulkImportMode, setBulkImportMode] = useState<'replace' | 'append'>('replace');

  const generateTempId = () => {
    return 'opt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const parseOptionLines = (raw: string): string[] => {
    return raw
      .split(/\r?\n/)
      .map(line => line.replace(/^[\s\t]*([☐◻☑✓✔•\-\*\+\[\]\(\)]|\d+[\.\)\-]|[a-zA-Z][\.\)\-])\s*/, '').trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('answer:'));
  };

  const openBulkOptionModal = (qIndex: number) => {
    setBulkOptionTargetQIdx(qIndex);
    setBulkOptionText("");
    setBulkOptionModalOpen(true);
  };

  const handleApplyBulkOptions = () => {
    if (bulkOptionTargetQIdx === null || !bulkOptionText.trim()) return;

    const rawLines = parseOptionLines(bulkOptionText);

    if (rawLines.length > 0) {
      const updated = [...questions];
      updated[bulkOptionTargetQIdx].options = rawLines.map(text => ({
        _id: generateTempId(),
        text
      }));
      updated[bulkOptionTargetQIdx].correctOptionIds = [];
      setQuestions(updated);
    }

    setBulkOptionModalOpen(false);
  };

  const handleApplyBulkImport = () => {
    const result = parseCurriculumDocument(bulkImportRawText);
    if (result.questions.length === 0) {
      alert("No valid questions could be detected from the pasted text. Please check the text format.");
      return;
    }

    if (result.title && !title.trim()) {
      setTitle(result.title);
    }

    if (bulkImportMode === 'replace') {
      setQuestions(result.questions);
    } else {
      const startOrder = questions.length;
      const reordered = result.questions.map((q, idx) => ({ ...q, order: startOrder + idx + 1 }));
      setQuestions([...questions, ...reordered]);
    }

    setBulkImportModalOpen(false);
    setBulkImportRawText("");
  };

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
      matchingPairs: q.matchingPairs || [],
      correctOptionIds: q.correctOptionIds || [],
      partialCredit: q.partialCredit || false,
      points: q.points || 1,
      order: q.order,
      explanation: q.explanation || '',
      acceptedKeywords: q.acceptedKeywords || [],
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

  const addQuestion = () => {
    const newQuestion: Question = {
      text: "",
      type: "mcq",
      options: [
        { _id: generateTempId(), text: "Option 1" },
        { _id: generateTempId(), text: "Option 2" },
        { _id: generateTempId(), text: "Option 3" },
        { _id: generateTempId(), text: "Option 4" }
      ],
      correctOptionIds: [],
      partialCredit: false,
      points: 1,
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const addQuestionAfter = (qIndex: number) => {
    const newQuestion: Question = {
      text: "",
      type: "mcq",
      options: [
        { _id: generateTempId(), text: "Option 1" },
        { _id: generateTempId(), text: "Option 2" },
        { _id: generateTempId(), text: "Option 3" },
        { _id: generateTempId(), text: "Option 4" }
      ],
      correctOptionIds: [],
      partialCredit: false,
      points: 1,
      order: qIndex + 2
    };
    const updated = [...questions];
    updated.splice(qIndex + 1, 0, newQuestion);
    updated.forEach((q, idx) => { q.order = idx + 1; });
    setQuestions(updated);
  };

  const removeQuestion = (qIndex: number) => {
    const updated = questions.filter((_, idx) => idx !== qIndex).map((q, idx) => ({ ...q, order: idx + 1 }));
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
    } else if (type === 'matching') {
      if (!q.matchingPairs || q.matchingPairs.length === 0) {
        q.matchingPairs = [
          { left: "Concept 1", right: "Definition 1" },
          { left: "Concept 2", right: "Definition 2" }
        ];
      }
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

  const addMatchingPair = (qIndex: number) => {
    const updated = [...questions];
    if (!updated[qIndex].matchingPairs) updated[qIndex].matchingPairs = [];
    updated[qIndex].matchingPairs!.push({ left: "", right: "" });
    setQuestions(updated);
  };

  const removeMatchingPair = (qIndex: number, pIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].matchingPairs) {
      updated[qIndex].matchingPairs = updated[qIndex].matchingPairs!.filter((_, idx) => idx !== pIndex);
    }
    setQuestions(updated);
  };

  const updateMatchingPair = (qIndex: number, pIndex: number, side: 'left' | 'right', val: string) => {
    const updated = [...questions];
    if (updated[qIndex].matchingPairs && updated[qIndex].matchingPairs![pIndex]) {
      updated[qIndex].matchingPairs![pIndex][side] = val;
    }
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({ _id: generateTempId(), text: "" });
    setQuestions(updated);
  };

  const handleOptionPaste = (e: React.ClipboardEvent<HTMLInputElement>, qIndex: number) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || !pasteText.includes("\n")) {
      return; // standard single-line paste
    }
    e.preventDefault();

    // Strip checkboxes (☐, ◻, ☑, ✓, ✔, [ ], ( )), bullets (•, -, *, +), numbers (1., 1)), letters (A., a))
    const rawLines = pasteText
      .split(/\r?\n/)
      .map(line => line.replace(/^[\s\t]*([☐◻☑✓✔•\-\*\+\[\]\(\)]|\d+[\.\)\-]|[a-zA-Z][\.\)\-])\s*/, '').trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('answer:'));

    if (rawLines.length === 0) return;

    const updated = [...questions];
    updated[qIndex].options = rawLines.map(text => ({ _id: generateTempId(), text }));
    updated[qIndex].correctOptionIds = [];
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
      // matching questions use matchingPairs — no correctOptionIds needed
      // short_answer questions use AI grading — no correctOptionIds needed
      const needsCorrectOption = q.type !== 'short_answer' && q.type !== 'matching';
      if (needsCorrectOption && q.correctOptionIds.length === 0) {
        alert(`Question #${i + 1} ("${q.text.substring(0, 30)}...") requires at least one correct option selected.`);
        return;
      }
      // Validate matching pairs are non-empty
      if (q.type === 'matching') {
        const pairs = q.matchingPairs || [];
        if (pairs.length < 2) {
          alert(`Matching question #${i + 1} needs at least 2 pairs.`);
          return;
        }
        const hasEmptyPair = pairs.some(p => !p.left.trim() || !p.right.trim());
        if (hasEmptyPair) {
          alert(`All matching pairs in Question #${i + 1} must have both concept and definition filled in.`);
          return;
        }
      }
      // Validate MCQ/multi_select/true_false options are non-empty
      if (needsCorrectOption) {
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
                              <>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition-all"
                                  title="Edit Assessment"
                                >
                                  <HiOutlinePencilSquare className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleArchive(item._id)}
                                  className="p-2 border border-slate-200 hover:bg-amber-50 text-amber-600 rounded transition-all"
                                  title="Archive Assessment"
                                >
                                  <HiOutlineArchiveBox className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id)}
                                  className="p-2 border border-slate-200 hover:bg-red-50 text-red-500 rounded transition-all"
                                  title="Delete Assessment"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              </>
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
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded transition-all"
                              title="Edit Assessment"
                            >
                              <HiOutlinePencilSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchive(item._id)}
                              className="p-1.5 border border-slate-200 hover:bg-amber-50 text-amber-600 rounded transition-all"
                              title="Archive Assessment"
                            >
                              <HiOutlineArchiveBox className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 border border-slate-200 hover:bg-red-50 text-red-500 rounded transition-all"
                              title="Delete Assessment"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </>
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
            <div className="border-t border-slate-100 pt-8 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#000666]">Questionnaire Builder</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Construct items manually or paste entire curriculum documents in 1 click.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportRawText("");
                    setBulkImportModalOpen(true);
                  }}
                  className="bg-sky-50 hover:bg-sky-100/80 text-[#000666] border border-sky-200 font-bold text-xs px-4 py-2.5 rounded-[4px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Import whole Knowledge Check document"
                >
                  <HiOutlineSparkles className="w-4 h-4 text-[#00B0FF]" /> Smart Import from Curriculum
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="border border-[#000666] hover:bg-slate-50 text-[#000666] font-bold text-xs px-4 py-2.5 rounded-[4px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <HiOutlinePlus className="w-4 h-4" /> Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                <HiOutlineQuestionMarkCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <p className="text-xs text-slate-600 font-bold">No questions created yet.</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Paste a whole curriculum knowledge check or create items manually.</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkImportRawText("");
                      setBulkImportModalOpen(true);
                    }}
                    className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-4 py-2 rounded shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <HiOutlineSparkles className="w-3.5 h-3.5 text-[#00B0FF]" /> Smart Import Document
                  </button>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded shadow-sm transition-all"
                  >
                    + Add Question Manually
                  </button>
                </div>
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
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#000666]">Question #{qIdx + 1}</span>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type:</label>
                            <select
                              value={q.type}
                              onChange={(e) => updateQuestionType(qIdx, e.target.value as any)}
                              className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666] bg-white"
                            >
                              <option value="mcq">Single Choice (MCQ)</option>
                              <option value="multi_select">Multiple Select</option>
                              <option value="matching">Matching Table</option>
                              <option value="true_false">True / False</option>
                              <option value="short_answer">Open text / Scenario</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points:</label>
                            <input
                              type="number"
                              min={1}
                              value={q.points}
                              onChange={(e) => updateQuestionField(qIdx, "points", Math.max(1, Number(e.target.value)))}
                              className="w-16 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#000666] font-bold text-[#000666]"
                            />
                          </div>

                          {q.type === 'multi_select' && (
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase">
                              <input
                                type="checkbox"
                                checked={q.partialCredit}
                                onChange={(e) => updateQuestionField(qIdx, "partialCredit", e.target.checked)}
                                className="w-3.5 h-3.5 text-[#000666] border-slate-200 focus:ring-[#000666]"
                              />
                              <span>Partial Credit</span>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Multi-line Question Prompt */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Question Prompt / Scenario Statement (Multi-line supported)
                        </label>
                        <textarea
                          rows={3}
                          placeholder={`Type or paste your question or scenario...\n\nExample:\nScenario 1 — Riba\nA business takes a conventional loan...\n\nWhich Islamic finance principle does this relate to?`}
                          value={q.text}
                          onChange={(e) => updateQuestionField(qIdx, "text", e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666] leading-relaxed"
                        />

                        {/* Live Formatted Preview */}
                        {q.text.trim().length > 0 && (
                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <HiOutlineEye className="w-3.5 h-3.5 text-[#00B0FF]" /> Participant Preview
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">Scenarios & Markdown auto-styled</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                              <QuestionTextRenderer text={q.text} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question Answers Block: MATCHING TABLE */}
                    {q.type === 'matching' && (
                      <div className="border-t border-slate-50 pt-4 space-y-3 bg-slate-50/50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Matching Pairs (Concept &rarr; Definition)</span>
                          <button
                            type="button"
                            onClick={() => addMatchingPair(qIdx)}
                            className="text-[10px] font-bold uppercase tracking-wider text-[#000666] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            + Add Matching Pair
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {(q.matchingPairs || []).map((pair, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 w-4">{pIdx + 1}.</span>
                              <input
                                type="text"
                                placeholder="Concept / Term (e.g. Riba)"
                                value={pair.left}
                                onChange={(e) => updateMatchingPair(qIdx, pIdx, 'left', e.target.value)}
                                className="w-1/3 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold text-[#000666] focus:outline-none focus:border-[#000666]"
                              />
                              <span className="text-slate-400 text-xs font-bold">&rarr;</span>
                              <input
                                type="text"
                                placeholder="Matching Definition / Meaning"
                                value={pair.right}
                                onChange={(e) => updateMatchingPair(qIdx, pIdx, 'right', e.target.value)}
                                className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#000666]"
                              />
                              {(q.matchingPairs || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeMatchingPair(qIdx, pIdx)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded"
                                  title="Remove Pair"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Question Answers Block: SHORT ANSWER — Model Solution & Keywords */}
                    {q.type === 'short_answer' && (
                      <div className="border-t border-slate-50 pt-4 space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-100/60">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">AI Automatic Grading</span>
                          <span className="text-[9px] text-amber-600 font-medium">(AI automatically evaluates participant responses based on the module's lesson material and curriculum principles. Rubric fields below are purely optional.)</span>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                              Model Answer / Notes <span className="normal-case text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Optional — leave empty to let AI evaluate directly against the module lesson materials. You may add specific points or reference answers here if desired..."
                              value={q.explanation || ''}
                              onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                              className="w-full border border-amber-200 rounded-lg p-3 text-xs focus:outline-none focus:border-amber-400 font-medium text-slate-700 bg-white leading-relaxed resize-none"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Accepted Keywords <span className="normal-case text-slate-400 font-normal">(Optional, comma-separated — instantly awards full marks if matched)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Riba, interest, prohibition, haram (Optional)"
                              value={(q.acceptedKeywords || []).join(', ')}
                              onChange={(e) => {
                                const kw = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                updateQuestionField(qIdx, 'acceptedKeywords', kw);
                              }}
                              className="w-full border border-amber-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-amber-400 font-medium text-slate-700 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Question Answers Block: MCQ / MULTI_SELECT / TRUE_FALSE */}
                    {q.type !== 'short_answer' && q.type !== 'matching' && (
                      <div className="border-t border-slate-50 pt-4 space-y-3 bg-slate-50/50 p-4 rounded-xl">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Options & Correctness</span>
                            <span className="text-[10px] text-sky-600 font-medium hidden sm:inline">&bull; Smart Paste Active (Ctrl+V splits list)</span>
                          </div>
                          {q.type !== 'true_false' && (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openBulkOptionModal(qIdx)}
                                className="text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <HiOutlineClipboardDocumentList className="w-3.5 h-3.5" /> Paste List
                              </button>
                              <button
                                type="button"
                                onClick={() => addOption(qIdx)}
                                className="text-[10px] font-bold uppercase tracking-wider text-[#000666] hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                + Add Option
                              </button>
                            </div>
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
                                className="w-4.5 h-4.5 text-[#000666] border-slate-200 focus:ring-[#000666] cursor-pointer"
                                title="Mark as Correct Answer"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={q.correctOptionIds.includes(opt._id)}
                                onChange={() => toggleOptionCorrectness(qIdx, opt._id)}
                                className="w-4.5 h-4.5 rounded text-[#000666] border-slate-200 focus:ring-[#000666] cursor-pointer"
                                title="Mark as Correct Answer"
                              />
                            )}

                            {/* Option Text Input */}
                            <input
                              type="text"
                              placeholder={`Option ${oIdx + 1} (or paste full list here...)`}
                              value={opt.text}
                              onChange={(e) => updateOptionText(qIdx, oIdx, e.target.value)}
                              onPaste={(e) => handleOptionPaste(e, qIdx)}
                              disabled={q.type === 'true_false'}
                              className="flex-1 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#000666] font-semibold text-[#000666] bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />

                            {/* Remove Option Button */}
                            {q.type !== 'true_false' && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIdx, oIdx)}
                                className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded transition-colors cursor-pointer"
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

                {/* Bottom Add Question Button */}
                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-[#000666] hover:bg-slate-50 text-[#000666] font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <HiOutlinePlus className="w-4 h-4" /> Add Another Question
                </button>
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

      {/* Bulk Curriculum Document Import Modal */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 bg-[#000666]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-[#00B0FF]">
                  <HiOutlineSparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#000666] text-sm font-serif">Smart Import from Curriculum Document</h3>
                  <p className="text-[11px] text-slate-500">Auto-detects MCQs, Multi-selects, Matching Tables, Scenarios & Answer keys</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Paste entire Knowledge Check or Assessment document below:
                </label>
                <textarea
                  autoFocus
                  rows={11}
                  placeholder={`# MODULE 1 KNOWLEDGE CHECK\n\n### 1. Complete the thought\nIslamic finance is financial activity guided by __________ principles.\n**Answer:** Shariah\n\n---\n\n### 2. Match the principle\n| Concept | Meaning |\n| ----- | ----- |\n| Riba | Prohibited increase/interest |\n| Gharar | Excessive uncertainty |\n\n---\n\n### 3. Spot the principle\nA customer enters a financial agreement...\nA. Riba\nB. Gharar\nC. Maysir\nD. Ijarah\nAnswer: B`}
                  value={bulkImportRawText}
                  onChange={(e) => setBulkImportRawText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-xs focus:outline-none focus:border-[#000666] font-mono text-slate-800 bg-slate-50/50 leading-relaxed resize-y placeholder:text-slate-400"
                />
              </div>

              {/* Real-time Detection Summary */}
              {(() => {
                const parsed = parseCurriculumDocument(bulkImportRawText);
                const qList = parsed.questions;
                const mcqCount = qList.filter(q => q.type === 'mcq').length;
                const multiCount = qList.filter(q => q.type === 'multi_select').length;
                const matchCount = qList.filter(q => q.type === 'matching').length;
                const shortCount = qList.filter(q => q.type === 'short_answer').length;

                return (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#000666] flex items-center gap-1.5">
                        <HiOutlineSparkles className="w-4 h-4 text-[#00B0FF]" />
                        {qList.length > 0 ? `${qList.length} Questions Detected` : "Awaiting Document Text..."}
                      </span>
                      {parsed.title && (
                        <span className="bg-[#000666]/10 text-[#000666] px-2 py-0.5 rounded font-bold text-[10px]">
                          Title: {parsed.title}
                        </span>
                      )}
                    </div>

                    {qList.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 pt-1">
                        {mcqCount > 0 && <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">🔘 {mcqCount} MCQ{mcqCount > 1 ? 's' : ''}</span>}
                        {multiCount > 0 && <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">☑️ {multiCount} Multi-Select{multiCount > 1 ? 's' : ''}</span>}
                        {matchCount > 0 && <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">🔄 {matchCount} Matching Table{matchCount > 1 ? 's' : ''}</span>}
                        {shortCount > 0 && <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">📝 {shortCount} Short Answer{shortCount > 1 ? 's' : ''} / Scenario{shortCount > 1 ? 's' : ''}</span>}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Import Mode Option */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Mode:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bulk_import_mode"
                    value="replace"
                    checked={bulkImportMode === 'replace'}
                    onChange={() => setBulkImportMode('replace')}
                    className="w-3.5 h-3.5 text-[#000666] focus:ring-[#000666]"
                  />
                  <span>Replace current questionnaire</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bulk_import_mode"
                    value="append"
                    checked={bulkImportMode === 'append'}
                    onChange={() => setBulkImportMode('append')}
                    className="w-3.5 h-3.5 text-[#000666] focus:ring-[#000666]"
                  />
                  <span>Append to existing items</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Items can be reviewed and edited after import.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBulkImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parseCurriculumDocument(bulkImportRawText).questions.length === 0}
                  onClick={handleApplyBulkImport}
                  className="px-5 py-2 bg-[#000666] hover:bg-[#000666]/90 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-md hover-lift transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <HiOutlineSparkles className="w-3.5 h-3.5 text-[#00B0FF]" />
                  <span>Import {parseCurriculumDocument(bulkImportRawText).questions.length > 0 ? `(${parseCurriculumDocument(bulkImportRawText).questions.length})` : ''} Questions ✓</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Options Import Modal */}
      {bulkOptionModalOpen && bulkOptionTargetQIdx !== null && (
        <div className="fixed inset-0 bg-[#000666]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#000666]/10 flex items-center justify-center text-[#000666]">
                  <HiOutlineClipboardDocumentList className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#000666] text-sm font-serif">Paste Multiple Choice Options</h3>
                  <p className="text-[11px] text-slate-500">Question #{bulkOptionTargetQIdx + 1}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkOptionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Paste your options list below (one option per line):
                </label>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  You can copy-paste from Word, PDF, or Markdown. Leading letters (<code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">A.</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">B)</code>), numbers (<code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">1.</code>), bullets, and checkboxes (<code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">☐</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">[ ]</code>) are automatically cleaned up!
                </p>
                <textarea
                  autoFocus
                  rows={8}
                  placeholder={`A. Principles of Islamic Jurisprudence\nB. Secular legal mandates\nC. High-yield speculative derivatives\nD. Traditional banking statutes`}
                  value={bulkOptionText}
                  onChange={(e) => setBulkOptionText(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-xs focus:outline-none focus:border-[#000666] font-mono text-slate-800 bg-slate-50/50 leading-relaxed resize-y placeholder:text-slate-400"
                />
              </div>

              {/* Real-time preview count badge */}
              <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-100 text-xs">
                <span className="text-slate-600 font-medium">Detected Options:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                  parseOptionLines(bulkOptionText).length > 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {parseOptionLines(bulkOptionText).length} options detected
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkOptionModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parseOptionLines(bulkOptionText).length === 0}
                onClick={handleApplyBulkOptions}
                className="px-5 py-2 bg-[#000666] hover:bg-[#000666]/90 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-md hover-lift transition-all cursor-pointer"
              >
                Import {parseOptionLines(bulkOptionText).length > 0 ? `(${parseOptionLines(bulkOptionText).length})` : ''} Options ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
