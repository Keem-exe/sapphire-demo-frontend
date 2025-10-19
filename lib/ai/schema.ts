import { z } from "zod"

export const FlashcardsInput = z.object({
  subjectId: z.string().min(1),
  topics: z.array(z.string()).default([]),
  count: z.number().int().min(1).max(50).default(10),
})

export const Flashcard = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
})

// lib/ai/schema.ts
export type QuestionType = "mcq" | "tf" | "short" | "fill";

export interface QuizQuestion {
  index: number;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answerKey: string;       // canonical answer
  explanation?: string;
}

export interface QuizPayload {
  subjectId: string;
  topics: string[];
  difficulty: "easy" | "medium" | "hard";
  questionTypes: QuestionType[];
  numQuestions: number;
}

export interface QuizOutput { quiz: QuizQuestion[]; }

export interface GradeReport {
  total: number;
  correct: number;
  scorePercent: number;
  perQuestion: { index: number; correct: boolean; explanation: string; reinforcement: string }[];
  summaryFeedback: string;
  nextRecommendations: string[];
}
