import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTextModel } from "@/lib/ai/gemini";

export const runtime = "edge";

const Input = z.object({
  subjectId: z.string(),
  answers: z.array(z.object({
    id: z.string(),
    type: z.enum(["MCQ","TF","SHORT","FIB"]),
    topic: z.string(),
    difficulty: z.enum(["easy","medium","hard"]).optional(),
    userAnswer: z.any(),
    correctAnswer: z.any(),
    correct: z.boolean(),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const { subjectId, answers } = Input.parse(await req.json());
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;

    const topicBreakdown: Record<string, { correct: number; total: number }> = {};
    for (const a of answers) {
      topicBreakdown[a.topic] ??= { correct: 0, total: 0 };
      topicBreakdown[a.topic].total++;
      if (a.correct) topicBreakdown[a.topic].correct++;
    }

    const prompt = `Return JSON ONLY:
{"review":{"strengths":"string","weaknesses":"string","nextSteps":"string"}}
Context: subject=${subjectId}, score=${correct}/${total}, topicBreakdown=${JSON.stringify(topicBreakdown)}.`;

    const res = await getTextModel().generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const text = res.response.text();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

    return NextResponse.json({ correct, total, topicBreakdown, review: json.review });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to grade quiz" }, { status: 400 });
  }
}
