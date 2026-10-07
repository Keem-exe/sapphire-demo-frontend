"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Assignment — {subject.name}</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subject.topics.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-w-[10rem]">
            <Label htmlFor="count">Questions (1–15)</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate assignment"}
          </Button>
          {err && (
            <div className="flex items-center gap-3 text-sm text-red-600" role="alert">
              <span>{err}</span>
              {!loading && (
                <Button size="sm" variant="outline" onClick={generate}>
                  Retry
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {assignment && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{assignment.title}</h2>
            <Badge variant="secondary">~{assignment.estimatedMinutes} min</Badge>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{assignment.instructions}</p>

          {assignment.questions.map((q) => (
            <Card key={q.number}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <p className="font-semibold">
                    {q.number}. {q.prompt}
                  </p>
                  <Badge variant="outline">{q.marks} marks</Badge>
                </div>
                {showSchemes && q.markScheme && (
                  <p className="text-sm text-muted-foreground border-l-2 pl-3 whitespace-pre-line">{q.markScheme}</p>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowSchemes((s) => !s)}>
              {showSchemes ? "Hide mark scheme" : "Show mark scheme"}
            </Button>
            {assignment.eventId != null && <AiRating key={assignment.eventId} eventId={assignment.eventId} />}
          </div>
        </div>
      )}
    </div>
  )
}
