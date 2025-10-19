// components/quiz/QuizRunner.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import type { QuizQuestion, GradeReport } from "@/lib/ai/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type StoredQuiz = {
  subjectId: string
  meta: {
    topics: string[]
    difficulty: string
    types: string[]
    numQuestions: number
  }
  quiz: QuizQuestion[]
}

export default function QuizRunner() {
  const [data, setData] = useState<StoredQuiz | null>(null)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [grading, setGrading] = useState(false)
  const [report, setReport] = useState<GradeReport | null>(null)
  const q = useMemo(() => (data ? data.quiz[idx] : null), [data, idx])

  useEffect(() => {
    const raw = sessionStorage.getItem("active_quiz")
    if (raw) {
      try { setData(JSON.parse(raw)) } catch {}
    }
  }, [])

  function setAnswerForCurrent(value: string) {
    if (!q) return
    setAnswers(a => ({ ...a, [q.index]: value }))
  }

  async function submitQuiz() {
    if (!data) return
    setGrading(true)
    try {
      const payload = {
        subjectId: data.subjectId,
        questions: data.quiz.map(({ index, type, prompt, options, answerKey }) => ({
          index, type, prompt, options, answerKey
        })),
        userAnswers: Object.entries(answers).map(([index, value]) => ({
          index: Number(index), value
        })),
      }

      const res = await fetch("/api/quiz/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `HTTP ${res.status}`)
      }

      const dataReport = (await res.json()) as GradeReport
      setReport(dataReport)
    } catch (e: any) {
      setReport({
        total: data.quiz.length,
        correct: 0,
        scorePercent: 0,
        perQuestion: [],
        summaryFeedback: `Could not grade: ${e.message}`,
        nextRecommendations: [],
      })
    } finally {
      setGrading(false)
    }
  }

  if (!data) {
    return <p className="p-6 text-muted-foreground">No quiz found. Go back to the generator page.</p>
  }

  if (report) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-sm text-muted-foreground">
          Score: <b>{report.scorePercent?.toFixed?.(0) ?? Math.round((report.correct / report.total) * 100)}%</b> — {report.correct}/{report.total}
        </p>

        <div className="space-y-4">
          {report.perQuestion.map((r) => (
            <div key={r.index} className={cn("rounded-lg border p-4", r.correct ? "bg-green-50" : "bg-red-50")}>
              <div className="font-medium">Q{r.index + 1}</div>
              <div className="text-sm mt-1">{r.explanation}</div>
              {r.reinforcement && (
                <div className="text-xs mt-2 text-muted-foreground">Tip: {r.reinforcement}</div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border p-4 bg-muted">
          <div className="font-medium mb-1">Summary</div>
          <p className="text-sm">{report.summaryFeedback}</p>
          {!!report.nextRecommendations?.length && (
            <ul className="list-disc pl-5 mt-2 text-sm">
              {report.nextRecommendations.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Quiz</h1>
        <span className="text-sm text-muted-foreground">Question {idx + 1} of {data.quiz.length}</span>
      </div>

      {/* Question */}
      {q && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="font-medium">{q.prompt}</div>

          {q.type === "mcq" && (
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const id = `mcq-${q.index}-${i}`
                return (
                  <label key={id} htmlFor={id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      id={id}
                      type="radio"
                      name={`q-${q.index}`}
                      checked={answers[q.index] === opt}
                      onChange={() => setAnswerForCurrent(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                )
              })}
            </div>
          )}

          {q.type === "tf" && (
            <div className="flex gap-3">
              {["True", "False"].map(v => (
                <Button
                  key={v}
                  type="button"
                  variant={answers[q.index] === v ? "default" : "outline"}
                  onClick={() => setAnswerForCurrent(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          )}

          {q.type === "short" && (
            <div className="space-y-2">
              <Label>Your answer</Label>
              <Input
                value={answers[q.index] ?? ""}
                onChange={(e) => setAnswerForCurrent(e.target.value)}
                placeholder="Type a brief answer"
              />
            </div>
          )}

          {q.type === "fill" && (
            <div className="space-y-2">
              <Label>Fill the blank</Label>
              <Input
                value={answers[q.index] ?? ""}
                onChange={(e) => setAnswerForCurrent(e.target.value)}
                placeholder="Complete the statement"
              />
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          Previous
        </Button>
        {idx < (data.quiz.length - 1) ? (
          <Button onClick={() => setIdx(i => Math.min(data.quiz.length - 1, i + 1))}>
            Next
          </Button>
        ) : (
          <Button onClick={submitQuiz} disabled={grading}>
            {grading ? "Grading…" : "Submit Quiz"}
          </Button>
        )}
      </div>
    </div>
  )
}
