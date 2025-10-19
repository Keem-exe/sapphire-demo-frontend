import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getTextModel } from "@/lib/ai/gemini"
import { GradeReport, QuizOutput } from "@/lib/ai/schema"
import { getUserFromRequest, getSubjectResources } from "@/lib/store"
import { retrieveTopK, mkContextBlock, styleDirective } from "@/lib/ai/rag"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = GradeRexport.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }
    const { questions, userAnswers, subjectId } = parsed.data
    const user = await getUserFromRequest(req)

    let context = "No saved resources."
    if (subjectId) {
      const res = await getSubjectResources(subjectId)
      const qtext = questions.map(q => q.prompt).join("\n")
      const top = await retrieveTopK(qtext, res, 6)
      context = mkContextBlock(top)
    }
    const style = styleDirective(user.learningStyle)

    const prompt = `
Return STRICT JSON:
type GradeReport = {
  total: number
  correct: number
  scorePercent: number
  perQuestion: {
    index: number
    correct: boolean
    explanation: string
    reinforcement: string  // 1–2 line personalized tip
  }[]
  summaryFeedback: string  // personalized by learning style
  nextRecommendations: string[] // what to study next, based on mistakes
}

User learning style: ${user.learningStyle} → ${style}

Context (saved resources):
---
${context}
---

Questions (JSON):
${JSON.stringify({ questions }).slice(0, 50000)}

UserAnswers (JSON):
${JSON.stringify({ userAnswers }).slice(0, 50000)}

Rules:
- Grade fairly; compare user answers to the question keys.
- Include brief, constructive explanations.
- Personalize feedback and tips using the learning style directive.
- Only output strict JSON for GradeReport.
`
    const model = getTextModel("gemini-2.5-flash")
    const res = await model.generateContent([{ text: prompt }])
    const text = res.response.text() || "{}"

    let report: unknown
    try { report = JSON.parse(text) } catch { report = {} }

    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
  }
}
