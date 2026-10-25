"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Clock, Target, XCircle } from "lucide-react"
import { SUBJECTS, normalizeSubjectId } from "@/lib/data/subjects"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sapphy } from "@/components/sapphy"
import { cn } from "@/lib/utils"
import { hasAuthToken, resolveBackendSubject } from "@/lib/services/backend-subject-map"
import {
  meService,
  type DiagnosticAttempt,
  type DiagnosticResults,
  type DiagnosticStatus,
  type DiagnosticTopicResult,
  type TopicBand,
} from "@/lib/services/me-service"

const BAND: Record<TopicBand, { label: string; tone: string; bar: string }> = {
  strong: { label: "Strong", tone: "text-status-success", bar: "bg-status-success" },
  developing: { label: "Getting there", tone: "text-primary-strong", bar: "bg-primary" },
  work_on: { label: "Work on next", tone: "text-status-warning", bar: "bg-status-warning" },
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""

/**
 * A 10-question multiple-choice check per subject. The first one is the student's baseline; a
 * follow-up opens four weeks after the last. One question at a time, each answer saved as it's
 * picked (so it can be resumed), graded on the server when the student finishes.
 */
export default function DiagnosticPage() {
  const params = useParams()
  const subjectId = normalizeSubjectId(String(params.subjectId || ""))
  const subject = SUBJECTS[subjectId]

  const [live, setLive] = useState(true)
  const [backendSubjectId, setBackendSubjectId] = useState<number | null>(null)
  const [status, setStatus] = useState<DiagnosticStatus | null>(null)
  const [attempt, setAttempt] = useState<DiagnosticAttempt | null>(null)
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState<DiagnosticResults | null>(null)
  const [busy, setBusy] = useState<"start" | "finish" | "results" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!subject) return
    if (!hasAuthToken()) {
      setLive(false)
      return
    }
    try {
      const bs = await resolveBackendSubject(subjectId)
      setBackendSubjectId(bs.subjectId)
      setStatus(await meService.diagnosticStatus(bs.subjectId))
    } catch (e: any) {
      setError(e?.message || "Couldn't load your diagnostic.")
    }
  }, [subject, subjectId])

  useEffect(() => {
    load()
  }, [load])

  if (!subject) return <div className="p-6">Unknown subject.</div>

  const begin = async () => {
    if (!backendSubjectId) return
    setError(null)
    setBusy("start")
    try {
      const a = await meService.startDiagnostic(backendSubjectId)
      setAttempt(a)
      const firstOpen = a.questions.findIndex((q) => !(String(q.index) in a.answers))
      setCurrent(firstOpen === -1 ? a.questions.length - 1 : firstOpen)
    } catch (e: any) {
      setError(e?.message || "Couldn't start your diagnostic.")
    } finally {
      setBusy(null)
    }
  }

  const showResults = async (id: number) => {
    setError(null)
    setBusy("results")
    try {
      setResults(await meService.diagnosticResults(id))
    } catch (e: any) {
      setError(e?.message || "Couldn't load your results.")
    } finally {
      setBusy(null)
    }
  }

  const pick = (label: string) => {
    if (!attempt) return
    const index = attempt.questions[current].index
    const previous = attempt.answers[String(index)]
    setAttempt({ ...attempt, answers: { ...attempt.answers, [String(index)]: label } })
    meService.answerDiagnostic(attempt.id, index, label).catch((e: any) => {
      // Put the old answer back so what's on screen is what's saved.
      setAttempt((a) => {
        if (!a) return a
        const answers = { ...a.answers }
        if (previous) answers[String(index)] = previous
        else delete answers[String(index)]
        return { ...a, answers }
      })
      setError(e?.message || "That answer didn't save. Please pick it again.")
    })
  }

  const finish = async () => {
    if (!attempt) return
    setError(null)
    setBusy("finish")
    try {
      setResults(await meService.finishDiagnostic(attempt.id))
      setAttempt(null)
      if (backendSubjectId) meService.diagnosticStatus(backendSubjectId).then(setStatus).catch(() => {})
    } catch (e: any) {
      setError(e?.message || "Couldn't finish your diagnostic. Your answers are saved; please try again.")
    } finally {
      setBusy(null)
    }
  }

  const header = (right?: React.ReactNode) => (
    <header className="hdr">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="min-h-11 shadow-none">
            <Link href={`/workspace/${subjectId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {subject.name}
            </Link>
          </Button>
          <span className="h-6 w-px bg-border" />
          <span className="g-res inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white" aria-hidden="true">
            <ClipboardCheck className="size-4" />
          </span>
          <h1 className="truncate text-lg font-semibold">Diagnostic</h1>
        </div>
        {right}
      </div>
    </header>
  )

  const errorBox = error && (
    <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </div>
  )

  // ------------------------------------------------------------------ results
  if (results) {
    return (
      <div className="min-h-screen bg-background">
        {header()}
        <Results results={results} subjectId={subjectId} subjectName={subject.name} status={status} onBack={() => setResults(null)} />
      </div>
    )
  }

  // ------------------------------------------------------------------ taking it
  if (attempt) {
    const q = attempt.questions[current]
    const total = attempt.questions.length
    const answered = Object.keys(attempt.answers).length
    const chosen = attempt.answers[String(q.index)]
    const last = current === total - 1
    const skipped = total - answered
    return (
      <div className="min-h-screen bg-background">
        {header(
          <div className="flex min-w-0 flex-[0_1_280px] items-center gap-3">
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {answered} of {total} answered
            </span>
            <Progress value={(answered / total) * 100} className="h-2 flex-1" aria-label="Answered so far" />
          </div>,
        )}
        <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 pb-16 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Question {current + 1} of {total}
            </p>
            <Badge variant="outline">{q.topicName}</Badge>
          </div>

          <Card className="gap-5 rounded-2xl p-6">
            <h2 id="diagnostic-question" className="text-lg font-semibold leading-7">
              {q.text}
            </h2>
            <RadioGroup aria-labelledby="diagnostic-question" value={chosen ?? ""} onValueChange={pick} className="gap-2">
              {q.options.map((o) => (
                <label
                  key={o.label}
                  htmlFor={`opt-${q.index}-${o.label}`}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 text-[15px] transition-colors hover:border-primary/50",
                    chosen === o.label && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem value={o.label} id={`opt-${q.index}-${o.label}`} />
                  <span className="w-5 shrink-0 font-semibold text-muted-foreground">{o.label}</span>
                  <span>{o.text}</span>
                </label>
              ))}
            </RadioGroup>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl shadow-none"
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
            <span className="flex-1" />
            {!chosen && !last && (
              <Button variant="ghost" className="h-11 rounded-xl shadow-none" onClick={() => setCurrent((c) => c + 1)}>
                Not sure, skip
              </Button>
            )}
            {last ? (
              <Button className="h-11 rounded-xl px-6 font-semibold" onClick={finish} disabled={busy === "finish"}>
                {busy === "finish" ? "Marking…" : skipped ? `Finish (${skipped} skipped)` : "Finish"}
              </Button>
            ) : (
              <Button className="h-11 rounded-xl px-6 font-semibold" onClick={() => setCurrent((c) => c + 1)} disabled={!chosen}>
                Next
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* Jump to any question; skipped ones stay open until the end. */}
          <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
            {attempt.questions.map((item, i) => (
              <button
                key={item.index}
                onClick={() => setCurrent(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Question ${i + 1}${String(item.index) in attempt.answers ? ", answered" : ""}`}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-lg border text-sm font-medium tabular-nums",
                  String(item.index) in attempt.answers ? "border-primary/40 bg-primary/10 text-primary-strong" : "bg-card text-muted-foreground",
                  i === current && "ring-[3px] ring-ring/50",
                )}
              >
                {i + 1}
              </button>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            Skipped questions count as "not yet", which is fine: it tells Sapphy where to start. Your answers are saved as you go.
          </p>
          {errorBox}
        </main>
      </div>
    )
  }

  // ------------------------------------------------------------------ intro
  const inProgress = status?.inProgress
  const latest = status?.latest
  const isFollowUp = !!status?.baseline
  return (
    <div className="min-h-screen bg-background">
      {header()}
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 pb-16 pt-10 sm:px-6">
        <section className="flex flex-wrap items-center gap-5">
          <Sapphy mood={latest ? "happy" : "idle"} className="size-20 shrink-0" />
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <h2 className="text-3xl font-bold leading-9">
              {isFollowUp ? `Check your progress in ${subject.name}` : `Where are you in ${subject.name}?`}
            </h2>
            <p className="text-base text-muted-foreground">
              {isFollowUp
                ? "Take the diagnostic again and see how far you've come since your first one."
                : "A short check across the whole syllabus, so Sapphy knows which topics to start you on."}
            </p>
          </div>
        </section>

        {!live ? (
          <Card className="gap-2 rounded-2xl p-6">
            <p className="font-semibold">Diagnostics need a signed-in account</p>
            <p className="text-muted-foreground">Your results are saved to your account and set where Sapphy starts you in each topic.</p>
          </Card>
        ) : !status && !error ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : status ? (
          <Card className="gap-5 rounded-2xl p-6">
            <ul className="grid gap-3 text-[15px] sm:grid-cols-3">
              <li className="flex items-center gap-2.5">
                <Target className="size-5 shrink-0 text-primary" aria-hidden="true" />
                {status.questionCount} multiple-choice questions
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
                About {status.minutes} minutes
              </li>
              <li className="flex items-center gap-2.5">
                <ClipboardCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Every part of the syllabus
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              It isn't graded and nobody else sees your answers. If you don't know one, skip it: an honest "not yet" helps more than a guess.
            </p>
            <div className="flex flex-wrap items-center gap-3 border-t pt-5">
              {inProgress ? (
                <Button className="h-11 rounded-xl px-6 font-semibold" onClick={begin} disabled={busy === "start"}>
                  {busy === "start" ? "Opening…" : `Resume (${Object.keys(inProgress.answers).length} of ${inProgress.questions.length} answered)`}
                </Button>
              ) : status.canStart ? (
                <Button className="h-11 rounded-xl px-6 font-semibold" onClick={begin} disabled={busy === "start"}>
                  {busy === "start" ? "Sapphy is writing your questions…" : isFollowUp ? "Start follow-up" : "Start diagnostic"}
                </Button>
              ) : (
                <p className="font-medium">Your next check opens on {fmtDate(status.nextAvailableAt)}.</p>
              )}
              {latest && (
                <Button variant="outline" className="h-11 rounded-xl shadow-none" onClick={() => showResults(latest.id)} disabled={busy === "results"}>
                  {busy === "results" ? "Loading…" : `See your last results (${Math.round(latest.score)}%)`}
                </Button>
              )}
            </div>
          </Card>
        ) : null}
        {errorBox}
      </main>
    </div>
  )
}

function Results({
  results,
  subjectId,
  subjectName,
  status,
  onBack,
}: {
  results: DiagnosticResults
  subjectId: string
  subjectName: string
  status: DiagnosticStatus | null
  onBack: () => void
}) {
  const [showAnswers, setShowAnswers] = useState(false)
  const baseline = status?.baseline
  const change = results.kind === "followup" && baseline ? Math.round(results.score - baseline.score) : null
  const groups = useMemo(() => {
    const by: Record<TopicBand, DiagnosticTopicResult[]> = { work_on: [], developing: [], strong: [] }
    results.topics.forEach((t) => by[t.band].push(t))
    return by
  }, [results.topics])
  const focus = groups.work_on[0] ?? groups.developing[0] ?? null

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 pb-16 pt-8 sm:px-6">
      <section className="flex flex-wrap items-center gap-5 rounded-2xl border bg-card p-6">
        <Sapphy mood="happy" blush className="size-16 shrink-0" />
        <div className="min-w-[220px] flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {results.kind === "followup" ? "Follow-up" : "Baseline"} · {fmtDate(results.completedAt)}
          </p>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[40px] font-bold leading-[44px] tabular-nums">{Math.round(results.score)}%</span>
            <span className="tabular-nums text-muted-foreground">
              {results.correct} of {results.total} correct
            </span>
            {change !== null && (
              <Badge className={cn("border-transparent text-white", change >= 0 ? "bg-status-success" : "bg-status-warning")}>
                {change >= 0 ? "+" : ""}
                {change} points since your first
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {focus
              ? `Sapphy will start you on ${focus.topicName} and build from there.`
              : "Strong across the board. Sapphy will keep you sharp with harder practice."}
          </p>
        </div>
      </section>

      <Card className="gap-5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold">By topic</h2>
        {(["work_on", "developing", "strong"] as TopicBand[]).map((band) =>
          groups[band].length ? (
            <div key={band} className="space-y-2.5">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", BAND[band].tone)}>{BAND[band].label}</p>
              {groups[band].map((t) => (
                <div key={t.topicId} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{t.topicName}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(t.score)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${t.topicName}: ${Math.round(t.score)} percent`}>
                    <div className={cn("h-full rounded-full", BAND[band].bar)} style={{ width: `${Math.max(4, t.score)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null,
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="h-11 rounded-xl px-6 font-semibold">
          <Link href={`/workspace/${subjectId}/quiz`}>{focus ? `Practise ${focus.topicName}` : "Take a harder quiz"}</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl px-6 shadow-none">
          <Link href={`/workspace/${subjectId}/flashcards`}>Make flashcards</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-xl shadow-none">
          <Link href={`/workspace/${subjectId}`}>Back to {subjectName}</Link>
        </Button>
      </div>

      <div>
        <Button variant="ghost" className="h-11 rounded-xl px-0 shadow-none" onClick={() => setShowAnswers((s) => !s)} aria-expanded={showAnswers}>
          {showAnswers ? "Hide answers" : "Review your answers"}
        </Button>
      </div>
      {showAnswers &&
        results.questions.map((q, i) => {
          const pickedText = q.options.find((o) => o.label === q.yourAnswer)?.text
          const rightText = q.options.find((o) => o.label === q.answer)?.text
          return (
            <article
              key={q.index}
              className={cn(
                "space-y-2 rounded-2xl border p-4",
                q.isCorrect ? "border-status-success/35 bg-card" : "border-destructive/35 bg-status-danger-subtle",
              )}
            >
              <p className="flex items-start gap-2.5 font-semibold">
                {q.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span>
                  Q{i + 1}. {q.text}
                </span>
              </p>
              <div className="space-y-1 pl-[26px] text-sm">
                <p className="text-xs text-muted-foreground">{q.topicName}</p>
                <p>
                  <span className="text-muted-foreground">Your answer: </span>
                  {q.yourAnswer ? (
                    <span className={cn("font-medium", q.isCorrect ? "text-status-success" : "text-destructive")}>
                      {q.yourAnswer}. {pickedText}
                    </span>
                  ) : (
                    <em>Skipped</em>
                  )}
                </p>
                {!q.isCorrect && (
                  <p>
                    <span className="text-muted-foreground">Correct answer: </span>
                    <span className="font-medium text-status-success">
                      {q.answer}. {rightText}
                    </span>
                  </p>
                )}
                {q.explanation && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{q.explanation}</p>}
              </div>
            </article>
          )
        })}

      <div>
        <Button variant="outline" className="h-11 rounded-xl shadow-none" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Diagnostic overview
        </Button>
      </div>
    </main>
  )
}
