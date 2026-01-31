import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai/gemini"
import { getUserFromRequest, getSubjectResources } from "@/lib/store"
import { retrieveTopK, mkContextBlock, styleDirective } from "@/lib/ai/rag"

export const runtime = "edge"

// tiny helper: robust body parsing
async function safeJson<T = any>(req: NextRequest): Promise<T | null> {
  try {
    const ct = req.headers.get("content-type") || ""
    if (!ct.includes("application/json")) return null
    // Edge runtime throws if body drained or empty — use text() fall back
    const text = await req.text()
    if (!text || !text.trim()) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("⚙️ Chat endpoint called")

    const body = await safeJson(req)
    if (!body) {
      return NextResponse.json(
        { error: "Missing or invalid JSON body. Send { subjectId, message, history? }." },
        { status: 400 }
      )
    }

    const subjectId = String(body.subjectId || "general").toLowerCase()
    const message = String(body.message || "").trim()
    const history: { role: "user" | "assistant"; content: string }[] =
      Array.isArray(body.history) ? body.history.slice(-10) : []

    if (!message) {
      return NextResponse.json({ error: "Missing 'message'." }, { status: 400 })
    }

    const [user, resources] = await Promise.all([
      getUserFromRequest(),
      getSubjectResources(subjectId),
    ])

    const ragQuery = [subjectId, message, ...history.map(h => h.content)].join(" ").slice(0, 4000)
    const top = Array.isArray(resources) ? await retrieveTopK(ragQuery, resources, 6) : []
    const context = mkContextBlock(top)
    const style = styleDirective(user.learningStyle)

    const prompt = `
You are a helpful study tutor.

User learning style: ${user.learningStyle} → ${style}

Context (saved resources):
---
${context}
---

Conversation:
${history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n")}

USER: ${message}

Answer requirements:
- Be concise and exam-focused.
- Use quick examples/steps for clarity.
- If context lacks detail, use general knowledge safely.
- Return plain text only.
- Return plain text only (no Markdown, no asterisks or headings).

`

    const model = getTextModel("chat") // Use gemini-3-flash for chat
    console.log("⚙️ Using model:", model.model)

    // ✅ New SDK format (v1)
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    const reply = (result.response.text() || "").trim()
    if (!reply) {
      return NextResponse.json({ error: "Model returned an empty reply." }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error("❌ Chat error:", err)
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
  }
}
