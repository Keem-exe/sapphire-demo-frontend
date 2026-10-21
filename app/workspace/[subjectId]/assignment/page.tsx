"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { SapphyFab } from "@/components/sapphy-fab"
import { AiRating } from "@/components/feedback/ai-rating"
import { apiClient } from "@/lib/api-client"
import { hasAuthToken, resolveBackendSubjectContext } from "@/lib/services/backend-subject-map"

interface Assignment {
  title: string
  instructions: string
  estimatedMinutes: number
  questions: { number: number; prompt: string; marks: number; markScheme?: string }[]
  topics: string[]
  eventId?: number | string
}

export default function AssignmentPage() {
  const params = useParams()
  const subjectId = params.subjectId as SubjectId
  const subject = SUBJECTS[subjectId]

  const [topics, setTopics] = useState<string[]>([])
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [showSchemes, setShowSchemes] = useState(false)

  if (!subject) return <div className="p-6">Unknown subject.</div>

  const toggle = (t: string) => setTopics((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))

  const generate = async () => {
    setErr(null)
    setAssignment(null)
    setShowSchemes(false)
    if (!hasAuthToken()) {
      setErr("Assignments need a Sapphire account. Please sign in with a registered account.")
      return
    }
    setLoading(true)
    try {
      const picked = topics.length ? topics : subject.topics.slice(0, 1)
      const { subjectId: backendSubjectId, topicIds } = await resolveBackendSubjectContext(subjectId, picked)
      if (!topicIds.length) {
        throw new Error("No topics are available for this subject yet. Please try again later or contact support.")
      }
      // Not persisted by the backend: the result only lives in this page's state.
      const res: any = await apiClient.post("/api/ai/assignment", {
        subjectId: backendSubjectId,
        topics: topicIds,
        questionCount: count,
      })
      setAssignment(res?.data || res)
    } catch (e: any) {
      setErr(
        e?.status === 403
          ? "You're not enrolled in this subject yet."
          : e?.message || "Couldn't generate the assignment. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SapphyFab key={showSchemes ? "marked" : "working"} activity="assignment" subjectId={subjectId} startOpen={showSchemes} />
      <header className="hdr">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-6">
          <Button asChild variant="ghost" size="sm" className="min-h-11 shadow-none">
            <Link href={`/workspace/${subjectId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {subject.name}
            </Link>
          </Button>
          <span className="h-6 w-px bg-border" />
          <span className="g-assign inline-flex size-8 items-center justify-center rounded-lg text-accent-foreground" aria-hidden="true">
            <ClipboardList className="size-4" />
          </span>
          <h1 className="text-lg font-semibold">Assignment</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-[800px] flex-col gap-5 px-6 pb-16 pt-8">
        <Card className="gap-[18px] rounded-2xl p-6">
          <div>
            <h2 className="text-lg font-semibold">Generate a practice assignment</h2>
            <p className="text-muted-foreground">
              Exam-style questions with marks and a mark scheme you can reveal when you're done.
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">Topics</legend>
            <div className="flex flex-wrap gap-2">
              {subject.topics.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-sm",
                    topics.includes(t) && "border-primary bg-primary/5",
                  )}
                >
                  <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(t)} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="count">
              Questions <span className="font-normal text-muted-foreground">(1–15)</span>
            </Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
              className="h-11 w-20 rounded-xl text-center"
            />
            <Button onClick={generate} disabled={loading} className="h-11 rounded-xl px-6 font-semibold">
              {loading ? "Generating…" : "Generate assignment"}
            </Button>
          </div>
          {err && (
            <div
              className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <span>{err}</span>
              {!loading && (
                <Button size="sm" variant="outline" onClick={generate} className="ml-auto min-h-11 shadow-none">
                  Retry
                </Button>
              )}
            </div>
          )}
        </Card>

        {assignment && (
          <section className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold leading-8">{assignment.title}</h2>
                <Badge variant="secondary">~{assignment.estimatedMinutes} min</Badge>
                <Badge variant="outline">{assignment.questions.reduce((sum, q) => sum + (q.marks || 0), 0)} marks</Badge>
              </div>
              <Button
                variant="outline"
                aria-pressed={showSchemes}
                onClick={() => setShowSchemes((s) => !s)}
                className="min-h-11 rounded-xl shadow-none"
              >
                {showSchemes ? "Hide mark scheme" : "Show mark scheme"}
              </Button>
            </div>
            <p className="whitespace-pre-line text-muted-foreground">{assignment.instructions}</p>

            {assignment.questions.map((q) => (
              <Card key={q.number} className="gap-2.5 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[15px] font-semibold leading-[22px]">
                    <span className="tabular-nums">{q.number}.</span> {q.prompt}
                  </p>
                  <Badge variant="outline" className="shrink-0">
                    {q.marks} marks
                  </Badge>
                </div>
                {showSchemes && q.markScheme && (
                  <div className="rounded-xl border border-status-success/25 bg-status-success-subtle px-3.5 py-2.5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-status-success">Mark scheme</p>
                    <p className="whitespace-pre-line text-[13px] leading-5">{q.markScheme}</p>
                  </div>
                )}
              </Card>
            ))}

            {assignment.eventId != null && (
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <AiRating key={assignment.eventId} eventId={assignment.eventId} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
