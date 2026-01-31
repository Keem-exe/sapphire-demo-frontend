import { NextRequest, NextResponse } from "next/server";
import { getTextModel } from "@/lib/ai/gemini";
import { getUserFromRequest, getSubjectResources } from "@/lib/store";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { subjectId, topics, difficulty, questionTypes, numQuestions } = await req.json();
    const user = await getUserFromRequest(req);
    const resources = await getSubjectResources(subjectId);

    const prompt = `
You are an expert educator AI that creates quizzes.
Tailor all content to:
- Subject: ${subjectId}
- Topics: ${topics.join(", ")}
- Difficulty: ${difficulty}
- Question types: ${questionTypes.join(", ")}
- Number of questions: ${numQuestions}
- User learning style: ${user.learningStyle}
- Study resources: ${resources.map(r => r.title).join(", ")}

Return JSON with this exact shape:
{
  "quiz": [
    {
      "question": "string",
      "type": "mcq" | "tf" | "short" | "fill",
      "options": ["A", "B", "C", "D"]?, 
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

    const model = getTextModel("models/gemini-1.5-flash");
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = res.response.text();
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Quiz generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
