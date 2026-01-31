import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai/gemini"
import { NotesInput } from "@/lib/ai/schema"
import { getUserFromRequest, getSubjectResources } from "@/lib/store"
import { retrieveTopK, mkContextBlock, styleDirective } from "@/lib/ai/rag"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = NotesInput.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }
    const { subjectId, objective, seedText, outline, hints, desiredLength } = parsed.data

    const [user, resources] = await Promise.all([
      getUserFromRequest(req),
      getSubjectResources(subjectId),
    ])
    const seed = [seedText, ...(outline || []), ...(hints || [])].filter(Boolean).join("\n")
    const top = await retrieveTopK(seed || subjectId, resources, 8)
    const context = mkContextBlock(top)
    const style = styleDirective(user.learningStyle)

    const lengthNote =
      desiredLength === "short" ? "≈ 300–500 words"
      : desiredLength === "long" ? "≈ 900–1200 words"
      : "≈ 600–800 words"

    const prompt = `
Return STRICT JSON:
type SmartNotes = {
  title: string
  sections: { heading: string; bullets: string[] }[]
  examples?: { title: string; content: string }[]
  practice?: string[] // short drills tailored to learning style
  references?: string[] // cite our saved resources titles if used
}

User learning style: ${user.learningStyle} → ${style}
Objective: ${objective}
Desired length: ${lengthNote}

Context (saved resources):
---
${context}
---

User seed / outline:
---
${seed || "(none)"}
---

Requirements:
- Personalize tone/structure to the learning style.
- Be predictive: if outline is partial, infer missing logical sections.
- Keep bullets crisp; add 1–2 tiny examples where helpful.
- If drawing from a resource above, add its title to 'references'.
- Output strict JSON only for SmartNotes.
`

    const model = getTextModel("gemini--flash")
    const res = await model.generateContent([{ text: prompt }])
    const text = res.response.text() || "{}"

    let json: unknown
    try { json = JSON.parse(text) } catch { json = {} }
    return NextResponse.json(json)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
  }
}
