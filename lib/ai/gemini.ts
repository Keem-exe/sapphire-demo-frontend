import { GoogleGenerativeAI } from "@google/generative-ai";
import { getModelForPurpose, type ModelPurpose } from "./models";

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
if (!API_KEY) console.warn("⚠️ GOOGLE_GEMINI_API_KEY is not set");

const genAI = new GoogleGenerativeAI(API_KEY);

// Default to Gemini 3 Flash to avoid 2.5 rate limits
export const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export function getTextModel(modelOrPurpose: string | ModelPurpose = DEFAULT_MODEL) {
  // If it's a purpose, get the recommended model
  const model = modelOrPurpose.includes('-') ? modelOrPurpose : getModelForPurpose(modelOrPurpose as ModelPurpose);
  
  return genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });
}

/**
 * Generate an embedding vector for text.
 */
export async function embed(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
  const res = await model.embedContent(text);
  return res?.embedding?.values ?? [];
}

/**
 * Math helpers
 */
export function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function cosine(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let dp = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dp += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dp / (Math.sqrt(na) * Math.sqrt(nb));
}
