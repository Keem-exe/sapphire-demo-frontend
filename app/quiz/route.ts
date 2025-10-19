import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai/gemini"
import { getUserFromRequest, getSubjectResources } from "@/lib/store"
import { mkContextBlock, retrieveTopK } from "@/lib/ai/rag"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    console.log("🎯 Quiz generation request received")

    const { subjectId = "general", difficulty = "medium", numQuestions = 5 } =
      await req.json()

    const [user, resources] = await Promise.all([
      getUserFromRequest(req),
      getSubjectResources(subjectId),
    ])

    const ragQuery = `${subjectId} quiz content`
    const top = await retrieveTopK(ragQuery, resources, 8)
    const context = mkContextBlock(top)

    const prompt = `
You are an expert tutor generating a quiz for students.

Subject: ${subjectId}
Difficulty: ${difficulty}
User learning style: ${user.learningStyle}

Context (reference materials):
---
${context}
---

🎯 Task:
Create ${numQuestions} multiple-choice questions **based on the subject content above**.
Each question should include:
- "question": A concise, clear question.
- "options": 4 options (A–D).
- "answer": The correct option letter.
- "explanation": A short, clear reason why that answer is correct.

Return your response strictly as **valid JSON** in the following format:
{
  "quiz": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A",
      "explanation": "..."
    }
  ]
}
`

    const model = getTextModel("models/gemini-1.5-flash")
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    const raw = result.response.text().trim()

    // Parse safely
    let quizData = null
    try {
      quizData = JSON.parse(raw)
    } catch (err) {
      console.warn("⚠️ Could not parse quiz JSON:", err)
    }

    return NextResponse.json({ raw, quizData })
  } catch (err: any) {
    console.error("❌ Quiz generation error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
