import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

// Helper to extract first JSON block in case Gemini returns markdown
function extractFirstJsonObject(text: string): string | null {
  let depth = 0, start = -1;
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
    const { subjectId, topics, count = 5, difficulty = "medium", types = ["MCQ"] } = await req.json();

    if (!subjectId) {
      return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Return ONLY valid JSON (no markdown, no prose).

Schema:
{
 "questions": [
   {
     "id": "string",
     "question": "string",
     "options": ["string", "string", "string", "string"],
     "answer": "string",
     "difficulty": "easy|medium|hard",
     "topic": "string",
     "type": "MCQ|True/False|Short Answer|Fill in the Blank"
   }
 ]
}

Generate ${count} ${difficulty}-level quiz questions for subject "${subjectId}".
Include topics: ${topics?.join(", ") || "general topics"}.
Use only the types: ${types?.join(", ") || "MCQ"}.
`;

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = response.response.text().trim();
    if (!raw) throw new Error("Empty model response");

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      const block = extractFirstJsonObject(raw);
      if (!block) throw new Error("Model returned non-JSON");
      json = JSON.parse(block);
    }

    const questions = (json.questions || []).map((q: any) => ({
      id: q.id || crypto.randomUUID(),
      question: q.question || "",
      options: q.options || ["A", "B", "C", "D"],
      answer: q.answer || "",
      topic: q.topic || "General",
      difficulty: q.difficulty || "medium",
      type: q.type || "MCQ",
    }));

    return NextResponse.json({ questions });
  } catch (e: any) {
    console.error("QUIZ API ERROR:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 502 });
  }
}

// Optional GET for quick sanity check
export async function GET() {
  return NextResponse.json({ ok: true, message: "Quiz API route reachable" });
}
