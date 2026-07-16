import { z } from 'zod';

const optionSchema = z.object({
    _id: z.string().optional(),
    text: z.string().min(1, 'Option text is required'),
});

const questionSchema = z.object({
    _id: z.string().optional(),
    text: z.string().min(1, 'Question text is required'),
    type: z.enum(['mcq', 'multi_select', 'true_false', 'short_answer']),
    options: z.array(optionSchema).default([]),
    correctOptionIds: z.array(z.string()).default([]),
    partialCredit: z.boolean().default(false),
    points: z.number().int().min(1).default(1),
    order: z.number().int().nonnegative(),
});

export const createAssessmentSchema = z.object({
    moduleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Module ID'),
    title: z.string().min(1, 'Title is required').trim(),
    instructions: z.string().default(''),
    passMark: z.number().int().min(1).max(100).default(70),
    maxAttempts: z.number().int().min(1).default(3),
    timeLimitMinutes: z.number().int().min(1).nullable().default(null),
    retakeCooldownHours: z.number().int().min(0).default(0),
    questions: z.array(questionSchema).default([]),
});

export const updateAssessmentSchema = createAssessmentSchema.partial().omit({ moduleId: true });

export const submitAnswerSchema = z.object({
    questionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    selectedOptionIds: z.array(z.string()).default([]),
    textAnswer: z.string().optional(),
});

export const submitAssessmentSchema = z.object({
    startedAt: z.string().datetime(),
    answers: z.array(submitAnswerSchema),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
