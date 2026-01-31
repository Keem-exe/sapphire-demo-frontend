/**
 * Learning Intelligence Engine Service
 * Uses Gemini API to update learner model in real-time based on student signals
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import type { 
  StudentProfile, 
  SignalEvent, 
  LearnerModel,
  PersonalizedQuizRequest,
  PersonalizedFlashcardsRequest,
  FeedbackRequest,
  FeedbackResponse
} from "@/lib/types/learning-engine"

const STORAGE_KEY = "sapphire_learner_model"

export class LearningEngineService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
      systemInstruction: `You are Sapphire OS Learning Intelligence Engine.
Your job: update the learner model from new learning signals.
Output ONLY valid JSON matching the schema.
No prose, no markdown, no code fences.
Be conservative: don't over-infer from one event.
Track mastery, recall strength, misconceptions, pacing recommendation, motivation state, and risk alerts.`
    })
  }

  /**
   * Initialize learner model for a student
   */
  initializeLearnerModel(profile: StudentProfile): LearnerModel {
    const initialModel: LearnerModel = {
      student_id: profile.student_id,
      updated_at: new Date().toISOString(),
      learning_signals_summary: {
        effort_level: "medium",
        hesitation: "low",
        confidence_trend: "stable"
      },
      mastery: [],
      misconceptions: [],
      recall_strength: {},
      next_best_actions: [{
        action: "targeted_practice",
        topic: "Start with a diagnostic quiz",
        why: "Establish baseline understanding"
      }],
      pacing_recommendation: {
        mode: "maintain",
        reason: "Just starting - no data yet"
      },
      motivation_nudge: {
        type: "encouragement",
        message: "Ready to begin your learning journey! Let's see what you know."
      },
      risk_alert: {
        level: "none",
        reason: "No signals yet"
      }
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialModel))
    return initialModel
  }

  /**
   * Update learner model based on new signal event
   */
  async updateLearnerModel(
    profile: StudentProfile,
    currentModel: LearnerModel,
    signal: SignalEvent
  ): Promise<LearnerModel> {
    try {
      const prompt = `STUDENT_PROFILE:
${JSON.stringify(profile, null, 2)}

CURRENT_LEARNER_MODEL:
${JSON.stringify(currentModel, null, 2)}

NEW_SIGNAL_EVENT:
${JSON.stringify(signal, null, 2)}

TASK:
Update the learner model from the new signal event.
Return JSON only.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response")
      }

      const updatedModel: LearnerModel = JSON.parse(jsonMatch[0])
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedModel))
      
      return updatedModel
    } catch (error) {
      console.error("Failed to update learner model:", error)
      throw error
    }
  }

  /**
   * Get current learner model from storage
   */
  getLearnerModel(): LearnerModel | null {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  /**
   * Generate personalized quiz based on learner model
   */
  async generatePersonalizedQuiz(request: PersonalizedQuizRequest): Promise<any> {
    const prompt = `You are Sapphire OS Personalized Quiz Builder.

INPUTS:
Learner Model JSON: ${JSON.stringify(request.learner_model, null, 2)}

TASK:
Generate ${request.count || 5} quiz questions for CSEC-style practice on the learner's weakest skill.
Rules:
- Start easy, step up slightly.
- Include 1 worked example first (teach-then-test).
- Provide answers and brief explanations.
Return JSON with fields: questions[{q, options[], correct, explanation, skill}].
Output ONLY valid JSON, no markdown.`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in quiz response")
    }

    return JSON.parse(jsonMatch[0])
  }

  /**
   * Generate personalized flashcards based on learner model
   */
  async generatePersonalizedFlashcards(request: PersonalizedFlashcardsRequest): Promise<any> {
    const prompt = `You are Sapphire OS Flashcard Builder.

INPUTS:
Learner Model JSON: ${JSON.stringify(request.learner_model, null, 2)}

TASK:
Create ${request.count || 8} flashcards to repair the misconception(s) detected.
Prefer visual phrasing + worked mini-steps.
Return JSON: cards[{front, back, hint, skill_tag}].
Output ONLY valid JSON, no markdown.`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in flashcards response")
    }

    return JSON.parse(jsonMatch[0])
  }

  /**
   * Generate targeted feedback for student answer
   */
  async generateFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    const prompt = `You are Sapphire OS Feedback Coach.

INPUTS:
Learner Model JSON: ${JSON.stringify(request.learner_model, null, 2)}
Assignment prompt: ${request.assignment_prompt}
Student answer: ${request.student_answer}

TASK:
Explain why the answer is wrong in a supportive, confidence-preserving way.
Then show the correct method with 3 short steps.
Return JSON: {diagnosis, corrected_steps[], encouragement, next_micro_task}.
Output ONLY valid JSON, no markdown.`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in feedback response")
    }

    return JSON.parse(jsonMatch[0])
  }

  /**
   * Clear learner model from storage
   */
  clearLearnerModel(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Export singleton instance
let engineInstance: LearningEngineService | null = null

export function getLearningEngine(): LearningEngineService {
  if (!engineInstance) {
    // Use NEXT_PUBLIC_ prefix for client-side access
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY || ""
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY environment variable")
      throw new Error("NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY is required for Learning Engine. Please add it to .env.local")
    }
    engineInstance = new LearningEngineService(apiKey)
  }
  return engineInstance
}
