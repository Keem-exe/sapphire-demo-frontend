import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

// If the SDK or your deps ever misbehave on Edge, remove this line to run on Node.
// export const runtime = "edge";

const Input = z.object({
  subjectId: z.string().min(1),
  topics: z.array(z.string()).min(1),
  count: z.union([z.number(), z.string()]).default(20),
  learningStyle: z.enum(["visual","auditory","readwrite","kinesthetic","mixed"]).optional(),
  priorWeaknesses: z.array(z.string()).optional(),
});

const MODEL = "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Input.parse(body);
    const count =
      typeof parsed.count === "string" ? Math.max(1, Math.min(200, Number(parsed.count))) : parsed.count;

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not set" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      // 🔒 Force JSON out of the model
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        // Strong schema = fewer parsing headaches
        responseSchema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    front: { type: "string" },
                    back: { type: "string" },
                    topic: { type: "string" },
                    subjectId: { type: "string" },
                    difficulty: { type: "string", enum: ["easy","medium","hard"] }
                  },
                  required: ["front","back","topic","subjectId","difficulty"]
                }
              }
            },
            required: ["flashcards"]
        } as any
      },
    });

    const prompt = `
Create ${count} unique, exam-appropriate flashcards for subject "${parsed.subjectId}".
Only use these topics: ${parsed.topics.join(", ")}.
Target learning style: ${parsed.learningStyle ?? "mixed"}.
Consider prior weaknesses: ${(parsed.priorWeaknesses || []).join(", ") || "none"}.
Keep answers concise (<= 80 words). No duplicates, no placeholders.`;

    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    // With responseMimeType="application/json" this is already JSON text.
    const text = resp.response.text(); // ← JSON string
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Gemini returned non-JSON:", text);
      return NextResponse.json({ error: "Model returned non-JSON" }, { status: 502 });
    }

    // Normalize + sanitize
    const rawCards: any[] = Array.isArray(data.flashcards) ? data.flashcards : [];
    const seen = new Set<string>();
    const flashcards = rawCards
      .map((c) => ({
        id: String(c.id || crypto.randomUUID()),
        front: String(c.front || "").trim(),
        back: String(c.back || "").trim(),
        topic: String(c.topic || "").trim(),
        subjectId: String(c.subjectId || parsed.subjectId),
        difficulty: ["easy","medium","hard"].includes(String(c.difficulty)) ? c.difficulty : "medium",
      }))
      .filter((c) => c.front && c.back && c.topic)
      .filter((c) => {
        const key = c.front.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, count);

    return NextResponse.json({ flashcards });
  } catch (e: any) {
    console.error("Flashcards API error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to generate flashcards" }, { status: 400 });
  }
}

// Optional: quick GET for sanity check
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/flashcards" });
}
