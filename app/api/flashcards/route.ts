/* // app/api/flashcards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// IMPORTANT: keep this on Node runtime
export const dynamic = "force-dynamic";

type LearningStyle = "visual" | "auditory" | "readwrite" | "kinesthetic" | "mixed";

const MODEL = "gemini-2.5-flash";

// --- small helpers ---
function clampCount(v: unknown, def = 20) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? Math.min(200, Math.max(1, n)) : def;
}

function extractFirstJsonObject(s: string): string | null {
  // Balanced-brace scanner: returns the first top-level {...} block
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function callGeminiJson(apiKey: string, prompt: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    // We’ll still *ask* for JSON; the retry below tightens it if needed
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json", // supported by newer SDKs; ok if ignored by older
    },
  });

  const resp = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return resp.response.text() || "";
}

function sanitizeCards(subjectId: string, count: number, data: any) {
  const arr: any[] = Array.isArray(data?.flashcards) ? data.flashcards : [];
  const seen = new Set<string>();
  const cards = arr
    .map((c) => ({
      id: String(c?.id || crypto.randomUUID()),
      front: String(c?.front || c?.question || "").trim(),
      back: String(c?.back || c?.answer || "").trim(),
      topic: String(c?.topic || "").trim(),
      subjectId: String(c?.subjectId || subjectId),
      difficulty: ["easy", "medium", "hard"].includes(String(c?.difficulty)) ? c.difficulty : "medium",
    }))
    .filter((c) => c.front && c.back && c.topic)
    .filter((c) => {
      const k = c.front.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, count);
  return cards;
}

// --- ROUTE ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subjectId = String(body.subjectId || "").trim();
    const topics = Array.isArray(body.topics) ? body.topics.map(String) : [];
    const count = clampCount(body.count);
    const learningStyle: LearningStyle = (body.learningStyle || "mixed") as LearningStyle;
    const priorWeaknesses: string[] = Array.isArray(body.priorWeaknesses) ? body.priorWeaknesses : [];

    if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });
    if (!topics.length) return NextResponse.json({ error: "topics required" }, { status: 400 });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not set" }, { status: 500 });

    // -------- attempt #1 --------
    const basePrompt = `
Return ONLY JSON, no markdown, no commentary.

Schema:
{
  "flashcards": [
    {
      "id": "string",
      "front": "string",
      "back": "string",
      "topic": "string",
      "subjectId": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Task:
- Create ${count} unique flashcards for subject "${subjectId}".
- Topics to use (only): ${topics.join(", ")}.
- Set "subjectId" to "${subjectId}" for every item.
- Target learning style: ${learningStyle}.
- Consider prior weaknesses: ${priorWeaknesses.length ? priorWeaknesses.join(", ") : "none"}.
- Keep answers concise (<= 80 words). No duplicates, no placeholders.
`;
    let text = await callGeminiJson(apiKey, basePrompt);

    // Parse path A: direct JSON
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Parse path B: extract first {...} block from mixed output
      const block = extractFirstJsonObject(text);
      if (block) {
        try {
          json = JSON.parse(block);
        } catch {
          // fallthrough to retry
        }
      }
    }

    // -------- attempt #2 (retry with harder constraint) --------
    if (!json || !Array.isArray(json.flashcards)) {
      const retryPrompt = `
STRICT MODE: Output JSON ONLY matching this EXACT schema. If you cannot, output {"flashcards": []}.

Schema:
{
  "flashcards": [
    {
      "id": "string",
      "front": "string",
      "back": "string",
      "topic": "string",
      "subjectId": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Generate ${count} unique flashcards for subject "${subjectId}".
Topics: ${topics.join(", ")} (use only these).
Every item must include "subjectId":"${subjectId}".
Learning style: ${learningStyle}. Prior weaknesses: ${priorWeaknesses.length ? priorWeaknesses.join(", ") : "none"}.
Concise answers (<=80 words). No duplicates. JSON only.`;
      const retryText = await callGeminiJson(apiKey, retryPrompt);

      try {
        json = JSON.parse(retryText);
      } catch {
        const block = extractFirstJsonObject(retryText);
        if (block) {
          try {
            json = JSON.parse(block);
          } catch {
            // still non-JSON; expose preview
            console.error("Gemini non-JSON retry (first 600 chars):\n", retryText.slice(0, 600));
            return NextResponse.json(
              { error: "Model returned non-JSON", preview: retryText.slice(0, 200) },
              { status: 502 }
            );
          }
        } else {
          console.error("Gemini non-JSON retry (first 600 chars):\n", retryText.slice(0, 600));
          return NextResponse.json(
            { error: "Model returned non-JSON", preview: retryText.slice(0, 200) },
            { status: 502 }
          );
        }
      }
    }

    const flashcards = sanitizeCards(subjectId, count, json);
    return NextResponse.json({ flashcards });
  } catch (e: any) {
    console.error("Flashcards API error:", e?.stack || e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/flashcards" });
}


*/

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic"; // Node runtime only!

function extractFirstJsonObject(text: string): string | null {
  // Balanced braces extractor for sloppy Gemini responses
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { subjectId, topics, count = 10, learningStyle = "mixed" } = await req.json();
    if (!subjectId || !Array.isArray(topics) || !topics.length)
      return NextResponse.json({ error: "Missing subject or topics" }, { status: 400 });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Return ONLY valid JSON. Do NOT include markdown fences or commentary.
Schema:
{
 "flashcards":[{"id":"string","front":"string","back":"string","topic":"string","subjectId":"string","difficulty":"easy|medium|hard"}]
}

Generate ${count} flashcards for "${subjectId}" on these topics: ${topics.join(", ")}.
Keep answers short. All output must strictly follow the schema above.
`;

    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = resp.response.text().trim();
    if (!raw) throw new Error("Empty model response");

    // Try normal parse
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      // Maybe wrapped in markdown or mixed content
      const block = extractFirstJsonObject(raw);
      if (!block) throw new Error("Model returned non-JSON");
      json = JSON.parse(block);
    }

    const cards = (json.flashcards || []).map((c: any) => ({
      id: c.id || crypto.randomUUID(),
      front: c.front?.trim(),
      back: c.back?.trim(),
      topic: c.topic || "General",
      subjectId: c.subjectId || subjectId,
      difficulty: ["easy", "medium", "hard"].includes(c.difficulty) ? c.difficulty : "medium",
    }));

    return NextResponse.json({ flashcards: cards });
  } catch (err: any) {
    console.error("Flashcards API error:", err.message);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
