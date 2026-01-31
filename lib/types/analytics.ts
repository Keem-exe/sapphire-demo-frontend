/**
 * Learning Intelligence Engine - Type Definitions
 * Tracks student learning signals and provides personalized learning actions
 */

export type LearningActivity = 
  | "quiz"
  | "flashcard"
  | "notebook"
  | "chat"
  | "reels"
  | "assignment";

export type MasteryLevel = "beginner" | "developing" | "proficient" | "mastery";
export type RiskLevel = "none" | "low" | "medium" | "high";

// Student Learning Signals (Inputs to Intelligence Engine)

export interface QuizPerformance {
  quiz_id: string;
  subject_id: string;
  topic: string;
  score: number; // 0-100
  total_questions: number;
  correct_answers: number;
  time_taken: number; // seconds
  difficulty: "easy" | "medium" | "hard";
  completed_at: Date;
  knowledge_gaps: string[]; // topics where student struggled
}

export interface FlashcardSession {
  session_id: string;
  subject_id: string;
  topic: string;
  cards_reviewed: number;
  cards_mastered: number;
  recall_strength: number; // 0-100 (percentage correct)
  time_spent: number; // seconds
  completed_at: Date;
  weak_cards: string[]; // card IDs student struggled with
}

export interface NotebookActivity {
  note_id: string;
  subject_id: string;
  topic: string;
  word_count: number;
  thinking_patterns: string[]; // e.g., "analytical", "visual", "sequential"
  key_concepts: string[];
  created_at: Date;
  last_edited: Date;
}

export interface ChatSession {
  session_id: string;
  subject_id: string;
  topics_discussed: string[];
  questions_asked: number;
  study_duration: number; // seconds
  motivation_level: "low" | "medium" | "high";
  engagement_score: number; // 0-100
  completed_at: Date;
}

export interface StudySession {
  session_id: string;
  user_id: number;
  subject_id: string;
  activity_type: LearningActivity;
  start_time: Date;
  end_time?: Date;
  duration: number; // seconds
  completed: boolean;
}

// Personalized Learning Actions (Outputs from Intelligence Engine)

export interface PersonalizedContent {
  recommended_topics: string[];
  next_study_suggestion: {
    topic: string;
    reason: string;
    priority: "high" | "medium" | "low";
  };
  review_topics: string[]; // topics needing reinforcement
}

export interface AdaptivePacing {
  current_topic: string;
  should_advance: boolean;
  should_reinforce: boolean;
  recommendation: string;
  pace_level: "slow" | "moderate" | "fast";
}

export interface TargetedFeedback {
  topic: string;
  common_mistakes: string[];
  misconceptions: string[];
  improvement_suggestions: string[];
  resources: Array<{
    type: "video" | "article" | "practice";
    title: string;
    url?: string;
  }>;
}

export interface StudyGuidance {
  daily_goal: number; // minutes
  current_streak: number; // days
  suggested_break_time: number; // minutes
  motivation_message: string;
  accountability_check: {
    last_study_date: Date;
    days_since_study: number;
    needs_nudge: boolean;
  };
}

export interface EarlyRiskAlert {
  user_id: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  intervention_needed: boolean;
  suggested_actions: string[];
  struggling_topics: string[];
  last_activity: Date;
}

// Aggregate Analytics

export interface TopicMastery {
  topic: string;
  subject_id: string;
  mastery_level: MasteryLevel;
  confidence_score: number; // 0-100
  quiz_average: number;
  flashcard_accuracy: number;
  last_practiced: Date;
  practice_count: number;
}

export interface StudentAnalytics {
  user_id: number;
  total_study_time: number; // minutes
  sessions_completed: number;
  current_streak: number;
  longest_streak: number;
  quiz_performance: {
    total_quizzes: number;
    average_score: number;
    best_subject: string;
    improvement_rate: number;
  };
  flashcard_performance: {
    total_sessions: number;
    average_recall: number;
    cards_mastered: number;
  };
  topic_mastery: TopicMastery[];
  knowledge_gaps: string[];
  risk_level: RiskLevel;
  last_active: Date;
}

// Learning Intelligence Engine State

export interface LearningIntelligence {
  user_id: number;
  student_signals: {
    recent_quizzes: QuizPerformance[];
    recent_flashcards: FlashcardSession[];
    recent_notebooks: NotebookActivity[];
    recent_chats: ChatSession[];
    active_sessions: StudySession[];
  };
  personalized_actions: {
    content_recommendations: PersonalizedContent;
    pacing_guidance: AdaptivePacing;
    feedback: TargetedFeedback[];
    study_guidance: StudyGuidance;
    risk_alerts: EarlyRiskAlert | null;
  };
  analytics: StudentAnalytics;
  last_updated: Date;
}
