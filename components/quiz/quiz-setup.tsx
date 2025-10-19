// components/quiz/QuizSetupForm.tsx
"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SUBJECTS, DEFAULT_SUBJECT, SubjectId } from "../../lib/data/subjects"
import type { QuizPayload, QuizOutput, QuestionType } from "@/lib/ai/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const TYPE_OPTIONS: { label: string; value: QuestionType }[] = [
  { label: "Multiple Choice", value: "mcq" },
  { label: "True / False", value: "tf" },
  { label: "Short Answer", value: "short" },
  { label: "Fill in the Blank", value: "fill" },
]

export default function QuizSetupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const initialSubject = (params.get("subject") as SubjectId) || DEFAULT_SUBJECT

  const [subjectId, setSubjectId] = useState<SubjectId>(initialSubject)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [types, setTypes] = useState<QuestionType[]>(["mcq"])
  const [numQuestions, setNumQuestions] = useState<number>(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topics = useMemo(() => SUBJECTS[subjectId].topics, [subjectId])

  function toggleTopic(t: string) {
    setSelectedTopics(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }
  function toggleType(t: QuestionType) {
    setTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  async function handleGenerate() {
    setError(null)
    if (!types.length) {
      setError("Select at least one question type.")
      return
    }
    if (!selectedTopics.length) {
      setError("Pick at least one topic.")
      return
    }

    const payload: QuizPayload = {
      subjectId,
      topics: selectedTopics,
      difficulty,
      questionTypes: types,
      numQuestions,
    }

    setLoading(true)
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as QuizOutput
      if (!data?.quiz?.length) throw new Error("Empty quiz generated.")

      // store quiz in sessionStorage for the take page
      sessionStorage.setItem("active_quiz", JSON.stringify({
        subjectId,
        meta: { topics: selectedTopics, difficulty, types, numQuestions },
        quiz: data.quiz,
      }))

      router.push("/quiz/take")
    } catch (e: any) {
      setError(e.message || "Failed to generate quiz.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Design your quiz</h1>
      <p className="text-sm text-muted-foreground">
        Tailored to your subject, saved resources, and learning style.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Subject */}
        <div className="space-y-2">
          <Label>Subject</Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value as SubjectId)}
          >
            {Object.entries(SUBJECTS).map(([id, { name }]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Number of questions */}
        <div className="space-y-2">
          <Label>Number of questions</Label>
          <Input
            type="number"
            min={3}
            max={30}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Math.max(3, Math.min(30, Number(e.target.value))))}
          />
        </div>

        {/* Types */}
        <div className="space-y-2">
          <Label>Question types</Label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleType(opt.value)}
                className={cn(
                  "px-3 py-1 rounded-full border text-sm",
                  types.includes(opt.value) ? "bg-primary text-primary-foreground" : "bg-background"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Topics */}
      <div className="space-y-2">
        <Label>Topics under {SUBJECTS[subjectId].name}</Label>
        <div className="flex flex-wrap gap-2">
          {topics.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTopic(t)}
              className={cn(
                "px-3 py-1 rounded-full border text-sm",
                selectedTopics.includes(t) ? "bg-secondary text-secondary-foreground" : "bg-background"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate Quiz"}
        </Button>
      </div>
    </div>
  )
}
