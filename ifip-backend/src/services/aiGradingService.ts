import axios from 'axios';

interface IEvaluateOpenAnswerParams {
  questionText: string;
  modelAnswer?: string;
  acceptedKeywords?: string[];
  studentAnswer: string;
  moduleTitle: string;
  moduleContent?: string;
  maxPoints: number;
}

export interface IGradingResult {
  scoreRatio: number; // 0.0 to 1.0
  isCorrect: boolean;
  pointsAwarded: number;
  feedback: string;
  modelAnswer?: string;
  evaluatedBy: 'ai_gemini' | 'ai_openai' | 'semantic_heuristic' | 'exact_keyword';
}

/**
 * Generates an authoritative model solution/answer directly from module lesson content.
 */
export async function generateModelSolutionFromModule(params: {
  questionText: string;
  moduleTitle: string;
  moduleContent?: string;
  existingExplanation?: string;
}): Promise<string> {
  const { questionText, moduleTitle, moduleContent, existingExplanation } = params;
  if (
    existingExplanation && 
    existingExplanation.trim() && 
    !existingExplanation.includes('Correct conceptual understanding required') &&
    !existingExplanation.toLowerCase().includes('not available') &&
    !existingExplanation.toLowerCase().includes('based strictly on the module')
  ) {
    return existingExplanation.trim();
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiApiKey) {
    try {
      const prompt = `You are an expert academic instructor in Islamic banking and finance.
Module Title: "${moduleTitle}"
Lesson Material Context: "${(moduleContent || '').substring(0, 3500)}"

Question/Fill-in-the-blank/Scenario: "${questionText}"

Provide the direct, authoritative, clean model answer or completed sentence for this question according to standard Islamic finance principles and the module curriculum.
CRITICAL RULES:
- Output ONLY the clean, direct answer/completed sentence.
- NEVER output disclaimers like "Based strictly on the module lesson content...", "the information is not available", or any meta-commentary.
- If the exact wording is not in the excerpt, formulate the standard authoritative Islamic finance definition or solution directly (e.g. for "Mudarabah involves: One party provides the ____, while another provides the ____", write "One party provides the capital (Rab-ul-Mal), while another provides the management expertise and labor (Mudarib).").`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        { timeout: 8000 }
      );

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        const clean = text.trim();
        if (!clean.toLowerCase().includes('is not available') && !clean.toLowerCase().includes('based strictly on')) {
          return clean;
        }
      }
    } catch (e: any) {
      console.warn("Error generating model solution with Gemini:", e?.message || e);
    }
  }

  // OpenAI fallback
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Islamic finance professor. Provide ONLY the direct, standard correct answer or completed sentence. NEVER output meta disclaimers or commentary.'
            },
            {
              role: 'user',
              content: `Module: ${moduleTitle}\nLesson Content: ${(moduleContent || '').substring(0, 2500)}\nQuestion: ${questionText}`
            }
          ]
        },
        { headers: { Authorization: `Bearer ${openaiApiKey}` }, timeout: 8000 }
      );
      const content = res.data?.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        const clean = content.trim();
        if (!clean.toLowerCase().includes('is not available') && !clean.toLowerCase().includes('based strictly on')) {
          return clean;
        }
      }
    } catch (e: any) {
      console.warn("Error generating model solution with OpenAI:", e?.message || e);
    }
  }

  return "Please refer to the contract principles and rules presented in the module coursework.";
}

/**
 * Evaluates open-ended short answer and scenario responses using
 * Module Lesson Material as context and the model answer / rubric.
 */
export async function evaluateOpenAnswerWithAI(params: IEvaluateOpenAnswerParams): Promise<IGradingResult> {
  const { questionText, modelAnswer, acceptedKeywords, studentAnswer, moduleTitle, moduleContent, maxPoints } = params;
  
  const cleanStudentAns = (studentAnswer || '').trim();
  if (!cleanStudentAns) {
    return {
      scoreRatio: 0,
      isCorrect: false,
      pointsAwarded: 0,
      feedback: "Incorrect. No response was provided.",
      evaluatedBy: 'semantic_heuristic'
    };
  }

  // 1. Direct Exact / Model Answer / Keyword Match
  const normalizedInput = cleanStudentAns.toLowerCase().replace(/['"`\-_.,;:()]/g, '').trim();
  
  // Check direct equality or containment with model answer
  if (modelAnswer && modelAnswer.trim()) {
    const normalizedModel = modelAnswer.toLowerCase().replace(/['"`\-_.,;:()]/g, '').trim();
    if (
      normalizedInput === normalizedModel ||
      (normalizedInput.length >= 3 && normalizedModel.includes(normalizedInput)) ||
      (normalizedModel.length >= 3 && normalizedInput.includes(normalizedModel))
    ) {
      return {
        scoreRatio: 1.0,
        isCorrect: true,
        pointsAwarded: maxPoints,
        feedback: "Correct. Your response is correct.",
        modelAnswer: modelAnswer,
        evaluatedBy: 'exact_keyword'
      };
    }
  }

  // Check accepted keywords
  if (acceptedKeywords && acceptedKeywords.length > 0) {
    const matched = acceptedKeywords.some(kw => {
      const normalizedKw = kw.toLowerCase().replace(/['"`\-_.,;:()]/g, '').trim();
      return (
        normalizedInput === normalizedKw ||
        (normalizedKw.length >= 3 && normalizedInput.includes(normalizedKw)) ||
        (normalizedInput.length >= 3 && normalizedKw.includes(normalizedInput))
      );
    });

    if (matched) {
      return {
        scoreRatio: 1.0,
        isCorrect: true,
        pointsAwarded: maxPoints,
        feedback: "Correct. Your response is correct.",
        modelAnswer: modelAnswer || cleanStudentAns,
        evaluatedBy: 'exact_keyword'
      };
    }
  }

  // 2. Google Gemini AI Evaluation
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiApiKey) {
    try {
      const prompt = `You are an expert Islamic finance academic evaluator grading a student's answer.
Module Context: "${moduleTitle}"
Lesson Content: "${(moduleContent || '').substring(0, 3500)}"

Question/Scenario: "${questionText}"
Reference/Model Solution: "${modelAnswer || 'Standard Islamic finance principles and curriculum.'}"
Student's Submitted Answer: "${cleanStudentAns}"

Tasks:
1. Evaluate whether the student's answer demonstrates the correct understanding based on Islamic finance principles and module content.
2. If the student is correct, set isCorrect to true, scoreRatio to 1.0, and feedback to "Correct. Your response is correct."
3. If the student is incorrect or incomplete, set isCorrect to false, scoreRatio to 0.0, and feedback to "Incorrect. Your answer is incorrect." (DO NOT give away the answer or provide clues).
4. Provide a clean, direct model answer for the question under "modelAnswer" (NO disclaimers).

Respond ONLY with a JSON object in this exact format (no markdown formatting, just JSON):
{
  "scoreRatio": 1.0,
  "isCorrect": true,
  "feedback": "Correct. Your response is correct.",
  "modelAnswer": "Clean, direct correct solution."
}`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        },
        { timeout: 8000 }
      );

      const responseText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        const scoreRatio = Math.max(0, Math.min(1, Number(parsed.scoreRatio) || 0));
        const isCorrect = Boolean(parsed.isCorrect || scoreRatio >= 0.7);
        const feedback = isCorrect 
          ? "Correct. Your response is correct." 
          : "Incorrect. Your answer is incorrect.";
        
        let extractedModelAnswer = parsed.modelAnswer || modelAnswer;
        if (extractedModelAnswer && (extractedModelAnswer.toLowerCase().includes('not available') || extractedModelAnswer.toLowerCase().includes('based strictly on'))) {
          extractedModelAnswer = undefined;
        }

        return {
          scoreRatio: isCorrect ? 1.0 : 0,
          isCorrect,
          pointsAwarded: isCorrect ? maxPoints : 0,
          feedback,
          modelAnswer: extractedModelAnswer,
          evaluatedBy: 'ai_gemini'
        };
      }
    } catch (err: any) {
      console.warn("Gemini AI grading API error, falling back to heuristic:", err?.message || err);
    }
  }

  // 3. OpenAI API Evaluation
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Islamic finance assessment grader. Respond in JSON with { "scoreRatio": number (0 or 1), "isCorrect": boolean, "feedback": string, "modelAnswer": string }. If incorrect, feedback must be "Incorrect. Your answer is incorrect."'
            },
            {
              role: 'user',
              content: `Module: ${moduleTitle}\nLesson Content: ${(moduleContent || '').substring(0, 2500)}\nQuestion: ${questionText}\nModel Answer: ${modelAnswer || ''}\nStudent Answer: ${cleanStudentAns}`
            }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: { Authorization: `Bearer ${openaiApiKey}` },
          timeout: 8000
        }
      );

      const parsed = JSON.parse(res.data.choices[0].message.content);
      const scoreRatio = Math.max(0, Math.min(1, Number(parsed.scoreRatio) || 0));
      const isCorrect = Boolean(parsed.isCorrect || scoreRatio >= 0.7);
      const feedback = isCorrect 
        ? "Correct. Your response is correct." 
        : "Incorrect. Your answer is incorrect.";

      let extractedModelAnswer = parsed.modelAnswer || modelAnswer;
      if (extractedModelAnswer && (extractedModelAnswer.toLowerCase().includes('not available') || extractedModelAnswer.toLowerCase().includes('based strictly on'))) {
        extractedModelAnswer = undefined;
      }

      return {
        scoreRatio: isCorrect ? 1.0 : 0,
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
        feedback,
        modelAnswer: extractedModelAnswer,
        evaluatedBy: 'ai_openai'
      };
    } catch (err: any) {
      console.warn("OpenAI API grading error, falling back to heuristic:", err?.message || err);
    }
  }

  // 4. Semantic Heuristic Fallback
  return evaluateWithHeuristics(cleanStudentAns, modelAnswer, questionText, maxPoints, moduleContent);
}

function evaluateWithHeuristics(
  studentAns: string,
  modelAns: string | undefined,
  question: string,
  maxPoints: number,
  moduleContent?: string
): IGradingResult {
  const normalizedStudent = studentAns.toLowerCase().replace(/['"`\-_.,;:()]/g, '').trim();
  const normalizedModel = (modelAns || '').toLowerCase().replace(/['"`\-_.,;:()]/g, '').trim();

  // If model answer exists, compare directly against model answer terms
  if (normalizedModel) {
    const modelTerms = normalizedModel
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(w));
    
    if (modelTerms.length > 0) {
      const matches = modelTerms.filter(term => normalizedStudent.includes(term));
      const modelMatchRatio = matches.length / modelTerms.length;
      if (modelMatchRatio >= 0.5 || normalizedStudent === normalizedModel || normalizedModel.includes(normalizedStudent) || normalizedStudent.includes(normalizedModel)) {
        return {
          scoreRatio: 1.0,
          isCorrect: true,
          pointsAwarded: maxPoints,
          feedback: "Correct. Your response is correct.",
          modelAnswer: modelAns,
          evaluatedBy: 'semantic_heuristic'
        };
      }
    }
  }

  // Fallback: check against question and module context
  const normalizedContent = (moduleContent || '').toLowerCase().substring(0, 3000);
  const sourceText = `${normalizedContent} ${question.toLowerCase()}`;
  const words = sourceText
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'which', 'this', 'that', 'with', 'from', 'does', 'have', 'been', 'would', 'could', 'should', 'about', 'their', 'there', 'these', 'those'].includes(w));

  const uniqueTerms = Array.from(new Set(words));
  let matchedCount = 0;

  for (const term of uniqueTerms) {
    if (normalizedStudent.includes(term)) {
      matchedCount++;
    }
  }

  const ratio = uniqueTerms.length > 0 ? matchedCount / Math.min(uniqueTerms.length, 12) : (normalizedStudent.length > 20 ? 0.8 : 0.4);
  const isCorrect = ratio >= 0.4;
  const scoreRatio = isCorrect ? 1.0 : 0.0;

  return {
    scoreRatio,
    isCorrect,
    pointsAwarded: isCorrect ? maxPoints : 0,
    feedback: isCorrect 
      ? "Correct. Your response is correct."
      : "Incorrect. Your answer is incorrect.",
    evaluatedBy: 'semantic_heuristic'
  };
}
