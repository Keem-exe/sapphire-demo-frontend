/**
 * Gemini Model Configuration
 * Distributes API requests across available models based on usage limits and capabilities
 * 
 * Based on your available quota:
 * - Gemini 2.5 Flash: 4/5 RPM, 607/250K TPM, 21/20 RPD (OVER LIMIT!)
 * - Gemini 3 Flash: 0/5 RPM, 0/250K TPM, 0/20 RPD
 * - Gemini 2.5 Flash Lite: 0/10 RPM, 0/250K TPM, 0/20 RPD
 * - Gemini 3 models: Various sizes available (4B, 2B, 27B, 1B, 12B)
 */

export type ModelPurpose = 
  | 'quiz'          // Generate quiz questions (needs accuracy)
  | 'flashcards'    // Generate flashcards (needs accuracy)
  | 'chat'          // AI chat tutor (needs speed and intelligence)
  | 'summary'       // Summarize notes/content
  | 'embedding'     // Text embeddings for RAG
  | 'short-text'    // Short responses (can use smaller/faster models)

/**
 * Model Selection Strategy:
 * - Quiz Generation: Gemini 3 Flash (accurate, avoid 2.5 rate limit)
 * - Flashcards: Gemini 2.5 Flash Lite (lighter load, good quality)
 * - Chat: Gemini 3 Flash (conversational, fast responses)
 * - Summaries: Gemini 2.5 Flash Lite (simple task, lighter)
 * - Embeddings: text-embedding-004 (specialized)
 * - Short text: Gemini 3 Flash (fast, lightweight)
 */
export const MODEL_CONFIG: Record<ModelPurpose, string> = {
  quiz: 'gemini-3-flash',           // Distribute quiz load away from 2.5
  flashcards: 'gemini-2.5-flash-lite', // Use lite version for flashcards
  chat: 'gemini-3-flash',           // Fast conversational model
  summary: 'gemini-2.5-flash-lite', // Lightweight summarization
  embedding: 'text-embedding-004',  // Specialized embedding model
  'short-text': 'gemini-3-flash',   // Quick responses
}

/**
 * Fallback models if primary model fails or hits rate limit
 */
export const MODEL_FALLBACKS: Record<string, string[]> = {
  'gemini-2.5-flash': ['gemini-3-flash', 'gemini-2.5-flash-lite'],
  'gemini-3-flash': ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  'gemini-2.5-flash-lite': ['gemini-3-flash', 'gemini-2.5-flash'],
}

/**
 * Get the recommended model for a specific purpose
 */
export function getModelForPurpose(purpose: ModelPurpose): string {
  return MODEL_CONFIG[purpose] || 'gemini-3-flash'
}

/**
 * Get fallback models for a given model
 */
export function getFallbackModels(model: string): string[] {
  return MODEL_FALLBACKS[model] || ['gemini-3-flash', 'gemini-2.5-flash-lite']
}

/**
 * Model capabilities and limits reference
 */
export const MODEL_INFO = {
  'gemini-2.5-flash': {
    rpm: 5,
    tpm: 250000,
    rpd: 20,
    description: 'Multi-modal, high quality - CURRENTLY OVER LIMIT',
    status: 'overused'
  },
  'gemini-3-flash': {
    rpm: 5,
    tpm: 250000,
    rpd: 20,
    description: 'Text-out model, fast and efficient',
    status: 'available'
  },
  'gemini-2.5-flash-lite': {
    rpm: 10,
    tpm: 250000,
    rpd: 20,
    description: 'Lighter version, faster responses',
    status: 'available'
  },
  'gemini-3-4b': {
    rpm: 30,
    tpm: 15000,
    rpd: 14400,
    description: 'Small model, very fast',
    status: 'available'
  },
  'gemini-3-2b': {
    rpm: 30,
    tpm: 15000,
    rpd: 14400,
    description: 'Smallest model, fastest responses',
    status: 'available'
  },
}
