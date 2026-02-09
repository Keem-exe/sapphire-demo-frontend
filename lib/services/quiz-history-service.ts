// Quiz history service for fetching interaction history
import { apiClient } from '../api-client'

export interface QuizHistoryItem {
  id: number
  subjectId: number
  topic: string
  score: number
  totalQuestions: number
  correctAnswers: number
  difficulty: string
  durationSeconds: number
  completedAt: string
  interactionType: string
}

export const quizHistoryService = {
  /**
   * Get quiz history for a user
   */
  async getQuizHistory(userId: number, limit: number = 10): Promise<QuizHistoryItem[]> {
    try {
      const response = await apiClient.get('/api/learning/interactions', {
        type: 'quiz',
        limit: limit
      }) as any
      
      // Backend returns { success: true, interactions: [...] }
      const interactions = response.interactions || response.data || []
      
      // Transform backend StudentInteraction data to QuizHistoryItem format
      return interactions.map((interaction: any) => ({
        id: interaction.id,
        subjectId: interaction.subjectId,
        topic: interaction.metadata?.topic || 'General',
        score: Math.round((interaction.accuracy || 0) * 100),
        totalQuestions: interaction.metadata?.totalQuestions || 0,
        correctAnswers: interaction.metadata?.correctAnswers || 0,
        difficulty: interaction.difficulty || 'medium',
        durationSeconds: interaction.durationSeconds || 0,
        completedAt: interaction.createdAt,
        interactionType: interaction.interactionType
      }))
    } catch (error) {
      console.error('Failed to fetch quiz history:', error)
      return []
    }
  },

  /**
   * Get flashcard history for a user
   */
  async getFlashcardHistory(userId: number, limit: number = 10) {
    try {
      const response = await apiClient.get('/api/learning/interactions', {
        type: 'flashcard',
        limit: limit
      }) as any
      
      const interactions = response.interactions || response.data || []
      
      return interactions.map((interaction: any) => ({
        id: interaction.id,
        subjectId: interaction.subjectId,
        topic: interaction.metadata?.topic || 'General',
        cardsStudied: interaction.metadata?.cardsStudied || 0,
        cardsMastered: interaction.metadata?.cardsMastered || 0,
        masteryRate: interaction.accuracy || 0,
        durationSeconds: interaction.durationSeconds || 0,
        completedAt: interaction.createdAt
      }))
    } catch (error) {
      console.error('Failed to fetch flashcard history:', error)
      return []
    }
  },

  /**
   * Get note-taking history for a user
   */
  async getNoteHistory(userId: number, limit: number = 10) {
    try {
      const response = await apiClient.get('/api/learning/interactions', {
        type: 'notebook',
        limit: limit
      }) as any
      
      const interactions = response.interactions || response.data || []
      
      return interactions.map((interaction: any) => ({
        id: interaction.id,
        subjectId: interaction.subjectId,
        noteTitle: interaction.metadata?.noteTitle || 'Untitled',
        wordCount: interaction.metadata?.wordCount || 0,
        action: interaction.metadata?.action || 'created',
        tags: interaction.metadata?.tags || [],
        durationSeconds: interaction.durationSeconds || 0,
        completedAt: interaction.createdAt
      }))
    } catch (error) {
      console.error('Failed to fetch note history:', error)
      return []
    }
  }
}
