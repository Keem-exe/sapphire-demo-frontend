/**
 * Learning Intelligence Engine Types
 * Defines the learner model structure and signal events for real-time demo
 */

// Student Profile (baseline)
export interface StudentProfile {
  student_id: string
  name: string
  grade_level: string
  subjects: string[]
  baseline_learning_style: {
    primary: string
    secondary: string
    avoid: string[]
    attention_span_minutes: number
    best_study_window: string
    motivation_triggers: string[]
    confidence_pattern: string
  }
  starting_assumptions: Record<string, {
    strengths: string[]
    weaknesses: string[]
    test_anxiety?: string
  }>
}

// Signal Events (what students do)
export type SignalEvent = QuizSignal | FlashcardSignal | ShortResponseSignal

export interface QuizSignal {
  type: 'quiz_result'
  subject: string
  topic: string
  timestamp: string
  items: Array<{
    id: number
    skill: string
    correct: boolean
    time_sec: number
    chosen?: string
    correct_answer?: string
  }>
  session_behavior: {
    hesitation: 'low' | 'medium' | 'high'
    changed_answers: number
  }
}

export interface FlashcardSignal {
  type: 'flashcard_review'
  subject: string
  topic: string
  timestamp: string
  cards: Array<{
    card_id: string
    answer_quality: 'wrong' | 'partial' | 'good' | 'perfect'
    seconds: number
  }>
}

export interface ShortResponseSignal {
  type: 'short_response'
  subject: string
  topic: string
  prompt: string
  student_answer: string
  timestamp: string
}

// Learner Model (the "brain" that updates)
export interface LearnerModel {
  student_id: string
  updated_at: string
  learning_signals_summary: {
    effort_level: 'low' | 'medium' | 'high'
    hesitation: 'low' | 'medium' | 'high'
    confidence_trend: string
  }
  mastery: Array<{
    skill: string
    level: number // 0-1
  }>
  misconceptions: Array<{
    skill: string
    pattern: string
    evidence: string[]
  }>
  recall_strength: Record<string, 'low' | 'medium' | 'high'>
  next_best_actions: Array<{
    action: 'targeted_practice' | 'worked_example' | 'review' | 'rest'
    topic: string
    why: string
    difficulty?: string
  }>
  pacing_recommendation: {
    mode: 'speed_up' | 'maintain' | 'slow_down'
    reason: string
  }
  motivation_nudge: {
    type: 'micro_goal' | 'encouragement' | 'break_reminder' | 'streak'
    message: string
  }
  risk_alert: {
    level: 'none' | 'low' | 'medium' | 'high'
    reason: string
    recommended_intervention?: string
  }
}

// Personalized Actions (what the engine outputs)
export interface PersonalizedQuizRequest {
  learner_model: LearnerModel
  count?: number
  target_skill?: string
}

export interface PersonalizedFlashcardsRequest {
  learner_model: LearnerModel
  count?: number
  target_misconception?: string
}

export interface FeedbackRequest {
  learner_model: LearnerModel
  assignment_prompt: string
  student_answer: string
}

export interface FeedbackResponse {
  diagnosis: string
  corrected_steps: string[]
  encouragement: string
  next_micro_task: string
}
