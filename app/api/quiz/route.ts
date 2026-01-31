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
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
      systemInstruction: "You are a JSON-only API. Return only valid JSON objects with no additional text, markdown, or formatting.",
    });

    const prompt = `Generate ${count} ${difficulty} quiz questions for subject: ${subjectId}
Topics: ${topics?.join(", ") || "general topics"}
Question types: ${types?.join(", ") || "MCQ"}

Return ONLY this JSON structure (no markdown, no code blocks, no explanations):
{
  "questions": [
    {
      "id": "q1",
      "question": "What is 2 + 2?",
      "options": ["1", "2", "3", "4"],
      "answer": "4",
      "difficulty": "${difficulty}",
      "topic": "${topics?.[0] || "General"}",
      "type": "${types?.[0] || "MCQ"}"
    }
  ]
}

Make ${count} questions. For MCQ: provide 4 options and specify the correct answer.
Output the JSON object directly.`;

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = response.response.text().trim();
    if (!raw) throw new Error("Empty model response");

    console.log("Raw quiz response:", raw.substring(0, 200));

    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseError) {
      console.error("Quiz JSON parse failed:", parseError);
      const block = extractFirstJsonObject(raw);
      if (!block) {
        console.error("No JSON block found in quiz response:", raw);
        throw new Error("Model returned non-JSON");
      }
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
