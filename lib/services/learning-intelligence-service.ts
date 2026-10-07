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
  status: 'not_started' | 'learning' | 'reviewing' | 'mastered' | 'needs_review'
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

/** Backend `GET /api/learning/insights` -> `{ insights }` */
export interface LearningInsights {
  study_patterns: Record<string, any>
  thinking_patterns: Record<string, any>
  motivation: Record<string, any>
}

/** Backend `GET /api/learning/pacing` -> `{ pacing }` (shape owned by the backend) */
export type PacingRecommendation = Record<string, any>

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/**
 * Service class for Learning Intelligence API
 *
 * The backend returns `{ success, <key>: ... }` (user comes from the JWT), not a bare payload,
 * so each method adapts the response to the shape the UI expects. Lists are always arrays.
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
    const res: any = await this.api.get('/api/learning/dashboard')
    const d = res?.dashboard ?? res?.data ?? res ?? {}
    return {
      ...d,
      user_id: userId,
      mastery_levels: asArray(d.mastery_levels),
      active_risks: asArray(d.active_risks ?? d.risks),
      recommendations: asArray(d.recommendations),
      total_interactions: d.total_interactions ?? 0,
      study_streak: d.study_streak ?? 0,
    } as LearningDashboard
  }

  /**
   * Get next content recommendation
   */
  async getNextContent(userId: number, subjectId?: number): Promise<NextContentRecommendation> {
    const params: Record<string, string> = {}
    if (subjectId) params.subject_id = subjectId.toString()

    const res: any = await this.api.get('/api/learning/next-content', params)
    return (res?.recommendation ?? res?.data ?? res) as NextContentRecommendation
  }

  /**
   * Get mastery level for a specific topic
   */
  async getMasteryLevel(userId: number, subjectId: number, topicId: number): Promise<MasteryLevel | null> {
    const res: any = await this.api.get('/api/learning/mastery', {
      subject_id: subjectId.toString(),
      topic_id: topicId.toString(),
    })
    return res?.mastery ?? null // null = no record yet (treat as not_started)
  }

  /**
   * Get knowledge gaps for a user
   */
  async getKnowledgeGaps(userId: number, subjectId?: number): Promise<KnowledgeGap[]> {
    const params: Record<string, string> = {}
    if (subjectId) params.subject_id = subjectId.toString()
    
    const res: any = await this.api.get('/api/learning/knowledge-gaps', params)
    return asArray<KnowledgeGap>(res?.knowledge_gaps ?? res?.data ?? res)
  }

  /**
   * Get learning insights
   */
  async getInsights(userId: number, daysBack: number = 30, subjectId?: number): Promise<LearningInsights> {
    const params: Record<string, string> = { days_back: daysBack.toString() }
    if (subjectId) params.subject_id = subjectId.toString()
    const res: any = await this.api.get('/api/learning/insights', params)
    return (res?.insights ?? {}) as LearningInsights
  }

  /**
   * Get pacing recommendation
   */
  async getPacing(userId: number, subjectId: number, topicId: number): Promise<PacingRecommendation> {
    const res: any = await this.api.get('/api/learning/pacing', {
      subject_id: subjectId.toString(),
      topic_id: topicId.toString(),
    })
    return res?.pacing ?? {}
  }

  /**
   * Adjust difficulty based on performance
   */
  async adjustDifficulty(
    subjectId: number,
    currentDifficulty: 'Easy' | 'Medium' | 'Hard'
  ): Promise<{ recommended_difficulty: string; previous_difficulty: string; changed: boolean; reason: string }> {
    return this.api.post('/api/learning/adjust-difficulty', {
      subject_id: subjectId,
      current_difficulty: currentDifficulty,
    })
  }

  /**
   * Get active risk indicators
   */
  async getRisks(userId: number): Promise<RiskIndicator[]> {
    const res: any = await this.api.get('/api/learning/risks', { min_level: 'low' })
    return asArray<RiskIndicator>(res?.risks ?? res?.data ?? res)
  }

  /**
   * Detect new risks for a user
   */
  async detectRisks(userId: number): Promise<{ detected_risks: RiskIndicator[] }> {
    const res: any = await this.api.post('/api/learning/detect-risks')
    return { detected_risks: asArray<RiskIndicator>(res?.risks ?? res?.detected_risks) }
  }

  /**
   * Get intervention details for a specific risk
   */
  async getIntervention(forUserId: number): Promise<any> {
    // Path param is a USER id (students: own id only; admins: any)
    const res: any = await this.api.get(`/api/learning/intervention/${forUserId}`)
    return res?.dashboard ?? res
  }
}

// Export singleton instance
export const learningIntelligenceService = new LearningIntelligenceService()
