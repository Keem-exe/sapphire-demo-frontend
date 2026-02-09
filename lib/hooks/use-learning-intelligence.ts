/**
 * React Hooks for Learning Intelligence
 * Custom hooks for easy integration of learning intelligence features
 */

import { useState, useEffect, useCallback } from 'react'
import { learningIntelligenceService } from '../services/learning-intelligence-service'
import type {
  LearningDashboard,
  NextContentRecommendation,
  MasteryLevel,
  KnowledgeGap,
  LearningInsights,
  RiskIndicator,
} from '../services/learning-intelligence-service'

/**
 * Hook for learning dashboard data
 */
export function useLearningDashboard(userId: number | null) {
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await learningIntelligenceService.getDashboard(userId)
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { dashboard, loading, error, refresh: fetchDashboard }
}

/**
 * Hook for next content recommendation
 */
export function useNextContent(userId: number | null, subjectId?: number) {
  const [recommendation, setRecommendation] = useState<NextContentRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendation = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await learningIntelligenceService.getNextContent(userId, subjectId)
      setRecommendation(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendation')
    } finally {
      setLoading(false)
    }
  }, [userId, subjectId])

  useEffect(() => {
    fetchRecommendation()
  }, [fetchRecommendation])

  return { recommendation, loading, error, refresh: fetchRecommendation }
}

/**
 * Hook for mastery levels
 */
export function useMasteryLevel(
  userId: number | null,
  subjectId: number | null,
  topicId: number | null
) {
  const [mastery, setMastery] = useState<MasteryLevel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !subjectId || !topicId) return

    const fetchMastery = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await learningIntelligenceService.getMasteryLevel(userId, subjectId, topicId)
        setMastery(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch mastery level')
      } finally {
        setLoading(false)
      }
    }

    fetchMastery()
  }, [userId, subjectId, topicId])

  return { mastery, loading, error }
}

/**
 * Hook for knowledge gaps
 */
export function useKnowledgeGaps(userId: number | null, subjectId?: number) {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGaps = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await learningIntelligenceService.getKnowledgeGaps(userId, subjectId)
      setGaps(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge gaps')
    } finally {
      setLoading(false)
    }
  }, [userId, subjectId])

  useEffect(() => {
    fetchGaps()
  }, [fetchGaps])

  return { gaps, loading, error, refresh: fetchGaps }
}

/**
 * Hook for learning insights
 */
export function useLearningInsights(userId: number | null, timeframe: string = '30d') {
  const [insights, setInsights] = useState<LearningInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchInsights = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await learningIntelligenceService.getInsights(userId, timeframe)
        setInsights(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch insights')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [userId, timeframe])

  return { insights, loading, error }
}

/**
 * Hook for risk detection
 */
export function useRiskDetection(userId: number | null) {
  const [risks, setRisks] = useState<RiskIndicator[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectRisks = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await learningIntelligenceService.detectRisks(userId)
      setRisks(data.detected_risks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect risks')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchActiveRisks = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await learningIntelligenceService.getRisks(userId)
      setRisks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risks')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchActiveRisks()
  }, [fetchActiveRisks])

  return { risks, loading, error, detectRisks, refresh: fetchActiveRisks }
}

/**
 * Hook for recording quiz completion with automatic mastery update
 */
export function useQuizCompletion() {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recordCompletion = useCallback(async (data: {
    userId: number
    subjectId: number
    topicId: number
    quizId: number
    score: number
    durationSeconds: number
  }) => {
    setRecording(true)
    setError(null)
    try {
      const result = await learningIntelligenceService.recordQuizCompletion(data)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record quiz completion'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setRecording(false)
    }
  }, [])

  return { recordCompletion, recording, error }
}

/**
 * Hook for recording flashcard practice
 */
export function useFlashcardPractice() {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recordPractice = useCallback(async (data: {
    userId: number
    flashcardId: number
    wasCorrect: boolean
    responseTimeMs: number
    userGuessed?: boolean
  }) => {
    setRecording(true)
    setError(null)
    try {
      const result = await learningIntelligenceService.recordFlashcardPractice(data)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record practice'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setRecording(false)
    }
  }, [])

  return { recordPractice, recording, error }
}
