/**
 * Learning Intelligence Service
 * Client-side service for interacting with the Learning Intelligence Engine API
 */

import { ApiClient } from '../api-client'

// Types for API responses
export interface MasteryLevel {
  id: number
  userId: number
  subjectId: number
  topicId: number
  masteryScore: number
  confidence: number
  totalAttempts: number
  correctAttempts: number
  averageTime: number | null
  recallStrength: number
  lastReviewed: string | null
  nextReviewDue: string | null
  status: 'not_started' | 'struggling' | 'learning' | 'proficient' | 'mastered'
  createdAt: string
  updatedAt: string
}

export interface RiskIndicator {
  id: number
  userId: number
  subjectId: number | null
  riskType: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  description: string
  recommendedAction: string
  evidence: any
  isActive: boolean
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdaptiveRecommendation {
  id: number
  userId: number
  subjectId: number | null
  topicId: number | null
  recommendationType: string
  priority: number
  title: string
  description: string
  actionData: any
  reason: string
  isActive: boolean
  isCompleted: boolean
  completedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LearningDashboard {
  user_id: number
  mastery_levels: MasteryLevel[]
  active_risks: RiskIndicator[]
  recommendations: AdaptiveRecommendation[]
  total_interactions: number
  study_streak: number
}

export interface NextContentRecommendation {
  subject_id: number
  topic_id: number
  topic_name: string
  difficulty: string
  reason: string
  mastery_level: number
  estimated_duration: number
  priority: number
}

export interface KnowledgeGap {
  topic_id: number
  topic_name: string
  subject_id: number
  mastery_score: number
  gap_severity: 'low' | 'medium' | 'high'
  recent_performance: number
  recommended_actions: string[]
}

export interface LearningInsights {
  user_id: number
  total_study_time: number
  average_accuracy: number
  topics_mastered: number
  topics_in_progress: number
  strengths: string[]
  areas_for_improvement: string[]
  study_patterns: {
    peak_performance_time: string
    average_session_length: number
    study_frequency: string
  }
}

export interface PacingRecommendation {
  current_pace: 'too_fast' | 'appropriate' | 'too_slow'
  recommended_pace: string
  reason: string
  suggested_adjustments: string[]
}

/**
 * Service class for Learning Intelligence API
 */
export class LearningIntelligenceService {
  private api: ApiClient

  constructor() {
    this.api = new ApiClient()
  }

  /**
   * Get comprehensive learning dashboard for a user
   */
  async getDashboard(userId: number): Promise<LearningDashboard> {
    return this.api.get<LearningDashboard>('/api/learning/dashboard', {
      user_id: userId.toString(),
    })
  }

  /**
   * Get next content recommendation
   */
  async getNextContent(userId: number, subjectId?: number): Promise<NextContentRecommendation> {
    const params: Record<string, string> = { user_id: userId.toString() }
    if (subjectId) params.subject_id = subjectId.toString()
    
    return this.api.get<NextContentRecommendation>('/api/learning/next-content', params)
  }

  /**
   * Get mastery level for a specific topic
   */
  async getMasteryLevel(userId: number, subjectId: number, topicId: number): Promise<MasteryLevel> {
    return this.api.get<MasteryLevel>('/api/learning/mastery', {
      user_id: userId.toString(),
      subject_id: subjectId.toString(),
      topic_id: topicId.toString(),
    })
  }

  /**
   * Get knowledge gaps for a user
   */
  async getKnowledgeGaps(userId: number, subjectId?: number): Promise<KnowledgeGap[]> {
    const params: Record<string, string> = { user_id: userId.toString() }
    if (subjectId) params.subject_id = subjectId.toString()
    
    return this.api.get<KnowledgeGap[]>('/api/learning/knowledge-gaps', params)
  }

  /**
   * Get learning insights
   */
  async getInsights(userId: number, timeframe: string = '30d'): Promise<LearningInsights> {
    return this.api.get<LearningInsights>('/api/learning/insights', {
      user_id: userId.toString(),
      timeframe,
    })
  }

  /**
   * Get pacing recommendation
   */
  async getPacing(userId: number, subjectId: number): Promise<PacingRecommendation> {
    return this.api.get<PacingRecommendation>('/api/learning/pacing', {
      user_id: userId.toString(),
      subject_id: subjectId.toString(),
    })
  }

  /**
   * Adjust difficulty based on performance
   */
  async adjustDifficulty(userId: number, subjectId: number, topicId: number): Promise<{ recommended_difficulty: string; reason: string }> {
    return this.api.post('/api/learning/adjust-difficulty', {
      user_id: userId,
      subject_id: subjectId,
      topic_id: topicId,
    })
  }

  /**
   * Get active risk indicators
   */
  async getRisks(userId: number): Promise<RiskIndicator[]> {
    return this.api.get<RiskIndicator[]>('/api/learning/risks', {
      user_id: userId.toString(),
    })
  }

  /**
   * Detect new risks for a user
   */
  async detectRisks(userId: number): Promise<{ detected_risks: RiskIndicator[] }> {
    return this.api.post('/api/learning/detect-risks', {
      user_id: userId,
    })
  }

  /**
   * Get intervention details for a specific risk
   */
  async getIntervention(riskId: number): Promise<any> {
    return this.api.get(`/api/learning/intervention/${riskId}`)
  }

  /**
   * Record quiz completion (called after grading)
   */
  async recordQuizCompletion(data: {
    userId: number
    subjectId: number
    topicId: number
    quizId: number
    score: number
    durationSeconds: number
  }): Promise<{ success: boolean; mastery_updated: boolean }> {
    return this.api.post('/api/learning/record-quiz', data)
  }

  /**
   * Record flashcard practice session
   */
  async recordFlashcardPractice(data: {
    userId: number
    flashcardId: number
    wasCorrect: boolean
    responseTimeMs: number
    userGuessed?: boolean
  }): Promise<{ success: boolean; recall_updated: boolean }> {
    return this.api.post('/api/learning/record-flashcard', data)
  }

  /**
   * Get personalized feedback for an answer
   */
  async getPersonalizedFeedback(data: {
    userId: number
    subjectId: number
    topicId: number
    wasCorrect: boolean
    questionId?: number
  }): Promise<{ feedback: string; learning_tip: string; next_step: string }> {
    return this.api.post('/api/learning/feedback', data)
  }
}

// Export singleton instance
export const learningIntelligenceService = new LearningIntelligenceService()
