import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai/gemini"
import { getUserFromRequest, getSubjectResources } from "@/lib/store"
import { retrieveTopK, mkContextBlock, styleDirective } from "@/lib/ai/rag"

export const runtime = "edge"

async function safeJson<T = any>(req: NextRequest): Promise<T | null> {
  try {
    const ct = req.headers.get("content-type") || ""
    if (!ct.includes("application/json")) return null
    const text = await req.text()
    if (!text || !text.trim()) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function getSubjectFormatGuide(subjectId: string): string {
  const id = subjectId.toLowerCase()

  if (id.includes("math") || id.includes("puremath")) {
    return `
SUBJECT: Mathematics
- Show every step of working — never skip steps for a student who may be confused.
- Write exponents using Unicode superscripts: x², x³, x⁴, or write x^2 when Unicode isn't clear.
- Write subscripts for sequences/series: a₁, a₂, aₙ.
- For fractions inline: write as "numerator/denominator" e.g. 3/4 or (x+1)/(x-2).
- For display fractions use the pattern:
      3
    ─────
    x + 1
- For quadratic formulas, inequalities, or long expressions use a code block.
- For matrices, format as a grid:
  | a  b |
  | c  d |
- For vectors use angle brackets: **v** = ⟨3, −2⟩ or column form.
- Always verify your answer at the end of a worked example.
- Mention which Paper (1 or 2) and typical mark allocation where relevant.`
  }

  if (id.includes("chem")) {
    return `
SUBJECT: Chemistry
- Write chemical formulas using Unicode subscripts: H₂O, CO₂, H₂SO₄, NaCl, C₆H₁₂O₆.
- Write ionic charges as superscripts: Ca²⁺, Cl⁻, SO₄²⁻, Fe³⁺.
- Write balanced equations with → arrows and state symbols: (s), (l), (g), (aq).
  Example: 2H₂(g) + O₂(g) → 2H₂O(l)  ΔH = −572 kJ mol⁻¹
- For reversible reactions use ⇌.
- For half-equations: Fe²⁺ → Fe³⁺ + e⁻
- Show mole calculations step by step with units at every line.
- For electron configuration: 1s² 2s² 2p⁶ etc.
- Exam tip: always show units in any calculation — CSEC marks units separately.`
  }

  if (id.includes("phys")) {
    return `
SUBJECT: Physics
- Write units in every calculation line: F = ma = (2 kg)(5 m s⁻²) = 10 N.
- Use standard SI notation: m s⁻¹ not m/s, J mol⁻¹, N m⁻².
- Write exponents in scientific notation: 3.0 × 10⁸ m s⁻¹.
- Show formulas first, then substitute values, then calculate.
- For vector quantities, specify direction explicitly (e.g., "30 N to the right" or use →).
- For circuit diagrams or force diagrams, describe them clearly in text with labels.
- Subscript notation: v₀ for initial velocity, vf for final, Δt for time interval.
- CAPE Physics: distinguish between Unit 1 (mechanics, waves) and Unit 2 (electricity, modern physics).`
  }

  if (id.includes("bio")) {
    return `
SUBJECT: Biology
- Use precise scientific names in *italics* (e.g., *Homo sapiens*).
- Label diagrams described in text clearly: "→ mitochondria (site of ATP production)".
- For processes, always use a numbered sequential flow:
  1. Glucose enters glycolysis
  2. 2 ATP produced per glucose
  3. Pyruvate formed → enters Krebs cycle
- Subscript for chemical formulas: CO₂, O₂, H₂O, ATP, ADP + Pᵢ.
- Use comparison tables for related structures/processes (e.g., mitosis vs meiosis).
- For CAPE Biology, link structure to function — examiners award marks for this explicitly.
- Genetics: use standard notation (e.g., AaBb × Aabb) and show Punnett squares in table format.`
  }

  if (id.includes("eng")) {
    return `
SUBJECT: English
- When quoting text, always use > blockquote formatting.
- Identify literary devices with **bold** labels: **metaphor**, **personification**, **juxtaposition**.
- Structure essay-style answers with clear topic → evidence → analysis → link.
- For poetry analysis, quote the line first, then analyse:
  > "I have a dream" — Martin Luther King
  *Repetition* creates a rhythmic, sermon-like cadence that emphasises urgency.
- For comprehension, number answers to match question numbers.
- For summary questions: identify what to keep (main points) vs. what to omit (examples, repetitions).
- CSEC English A/B: remind students about register (formal/informal) and audience in writing tasks.`
  }

  return `
- Use numbered steps for processes.
- Use bullet points for lists of features or facts.
- Use tables for comparisons.
- Show any formulas or notation clearly.`
}

export async function POST(req: NextRequest) {
  try {
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
    const subjectGuide = getSubjectFormatGuide(subjectId)

    const prompt = `You are Sapphire, an enthusiastic and brilliant AI study companion for Caribbean students preparing for CSEC and CAPE exams. You are like that brilliant older sibling who makes studying feel genuinely exciting — warm, encouraging, specific, and never condescending.

STUDENT LEARNING STYLE: ${user.learningStyle} → ${style}

SUBJECT FORMATTING GUIDE:
${subjectGuide}

GENERAL FORMATTING (always follow these):
- Use **bold** for key terms, formulas, and important facts.
- Use ## or ### headings when explaining multi-part topics.
- Use numbered lists (1. 2. 3.) for sequential steps or methods.
- Use bullet points (- ) for lists of features, causes, or characteristics.
- Use | table | format | for comparisons or structured data.
- Use \`code\` or a code block for formulas, equations, or structured calculations.
- Use > blockquote for direct quotes or important exam tips.
- End responses with a 💡 **Quick tip** or memory trick when relevant.

ENGAGEMENT RULES:
- Open with a confident, direct sentence that names the core concept — no preamble.
- Be specific to CSEC/CAPE: mention Paper numbers, typical mark allocations, and exam technique where useful.
- Use encouraging language: "Great question — here's the key idea:", "This is one of those topics that looks hard but has a simple trick:"
- Keep responses appropriately sized: a simple factual question gets 3–5 lines; a complex problem gets a fully structured response with headers.
- Never give a wall of unbroken text. Always break up information visually.

SAVED CONTEXT (student's notes/resources):
---
${context}
---

CONVERSATION HISTORY:
${history.map(h => `${h.role === "user" ? "STUDENT" : "SAPPHIRE"}: ${h.content}`).join("\n")}

STUDENT: ${message}

SAPPHIRE:`

    const model = getTextModel("chat")

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
