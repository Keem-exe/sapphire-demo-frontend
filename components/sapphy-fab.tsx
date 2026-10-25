"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, CircleAlert, Send, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { Sapphy } from "@/components/sapphy"
import { useAuth } from "@/contexts/auth-context"
import { FAB_CONTENT, LIVE_FAB_CONTENT, type FabActivity, type FabContent } from "@/lib/sapphy-fab-data"
import { hasAuthToken } from "@/lib/services/backend-subject-map"
import { cn } from "@/lib/utils"

interface SapphyFabProps {
  activity: FabActivity
  /** Subject used for the "next step" links, defaults to Mathematics */
  subjectId?: string
  /** Open the panel on first show. Defaults to true only for "ended" activities (results and summaries) */
  startOpen?: boolean
  /** Real content for this moment (score, summary, next steps), merged over the default copy */
  content?: Partial<FabContent>
}

const VERDICT_TONE = {
  ok: "border-transparent bg-status-success text-white",
  warn: "border-status-warning/40 bg-status-warning-subtle text-status-warning",
  neutral: "border-transparent bg-secondary text-secondary-foreground",
}

/**
 * Sapphy's floating button and panel: feedback for what the student just did, next steps,
 * and an "Ask Sapphy" tab. Signed-in students see their real results (passed in as `content`)
 * over copy that quotes no numbers; the demo account sees the design's sample copy.
 * Pass a new `activity` (or a `key`) to reset it when the screen changes state.
 */
export function SapphyFab({ activity, subjectId = "csec-math", startOpen, content }: SapphyFabProps) {
  const { user } = useAuth()
  const [live, setLive] = useState(true) // start real: demo copy must never flash for a signed-in student
  useEffect(() => setLive(hasAuthToken()), [])
  const d: FabContent = { ...(live ? LIVE_FAB_CONTENT : FAB_CONTENT)[activity], ...(content ?? {}) }
  const [open, setOpen] = useState(startOpen ?? d.ended)
  const [view, setView] = useState<"feedback" | "ask">("feedback")
  const [thread, setThread] = useState<{ q: string; a: string }[]>([])
  const [draft, setDraft] = useState("")
  const [rating, setRating] = useState<"up" | "down" | null>(null)

  const name = user?.first_name || "there"
  const summary = d.summary.replace(/\{name\}/g, name)
  const mood = d.happy ? "happy" : thread.length && view === "ask" ? "thinking" : "idle"

  const ask = (q: string, a: string) => {
    setView("ask")
    setThread((t) => [...t, { q, a }])
  }
  const send = () => {
    const q = draft.trim()
    if (!q) return
    setDraft("")
    ask(q, "Good question. Open Sapphy in your subject workspace and I can walk through it step by step with you.")
  }

  const routeFor = (to: string) => (to ? `/workspace/${subjectId}/${to}` : "")

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 text-sm">
      {open && (
        <section
          role="dialog"
          aria-label="Sapphy"
          className="pointer-events-auto flex max-h-[min(560px,calc(100vh-120px))] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary/10 to-card py-3 pl-4 pr-3">
            <Sapphy mood={mood} className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Sapphy</p>
              <p className="text-xs text-muted-foreground">{d.kicker}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Sapphy"
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="border-y px-3 py-2">
            <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="tablist" aria-label="Sapphy">
              {(
                [
                  ["feedback", d.feedbackLabel],
                  ["ask", "Ask Sapphy"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    "min-h-9 flex-1 rounded-lg text-sm font-medium text-muted-foreground",
                    view === id && "bg-card text-foreground shadow-xs",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {view === "feedback" ? (
            <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
              {d.score && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[28px] font-bold leading-8 tabular-nums">{d.score}</span>
                  {d.verdict && (
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", VERDICT_TONE[d.verdictTone ?? "neutral"])}>
                      {d.verdict}
                    </span>
                  )}
                </div>
              )}
              <p>{summary}</p>
              {d.good.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What went well</p>
                  {d.good.map((g) => (
                    <p key={g} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
                      {g}
                    </p>
                  ))}
                </div>
              )}
              {d.work.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To work on</p>
                  {d.work.map((w) => (
                    <p key={w} className="flex items-start gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next steps</p>
                {d.steps.length === 0 && <p className="text-muted-foreground">Nothing queued right now.</p>}
                {d.steps.map((s, i) => {
                  const href = s.href ?? routeFor(s.to)
                  const inner = (
                    <>
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary-strong">
                        {i + 1}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px] font-semibold leading-[18px]">{s.t}</span>
                        <span className="text-xs text-muted-foreground">{s.why}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </>
                  )
                  const cls = "flex min-h-11 items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 transition-colors"
                  return href ? (
                    <Link key={s.t} href={href} className={cn(cls, "hover:border-primary/50")}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.t} className={cls}>
                      {inner}
                    </div>
                  )
                })}
              </div>
              {rating === null ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Was this helpful?
                  <button aria-label="Helpful" onClick={() => setRating("up")} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted">
                    <ThumbsUp className="size-4" />
                  </button>
                  <button aria-label="Not helpful" onClick={() => setRating("down")} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted">
                    <ThumbsDown className="size-4" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {rating === "up" ? "Thanks! I'll keep my feedback like this." : "Thanks. Tell me what would help more in Ask Sapphy."}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                <div className="max-w-full rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2.5 shadow-sm">{d.askIntro}</div>
                {thread.map((m, i) => (
                  <div key={i} className="flex flex-col gap-2.5">
                    <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm">{m.q}</div>
                    <div className="max-w-full rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2.5 shadow-sm">{m.a}</div>
                  </div>
                ))}
                {d.asks.map((a) => (
                  <button
                    key={a.q}
                    onClick={() => ask(a.q, a.a)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-[13px]"
                  >
                    <ChevronRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {a.q}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2 border-t px-3 py-2.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                <label htmlFor="sapphy-fab-ask" className="sr-only">
                  Ask Sapphy
                </label>
                <input
                  id="sapphy-fab-ask"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask Sapphy…"
                  className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <button type="submit" aria-label="Send" className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Send className="size-4" />
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {!open && d.teaser && (
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto max-w-[260px] cursor-pointer rounded-2xl rounded-br-sm border bg-card px-3.5 py-2.5 text-left text-[13px] font-medium leading-[18px] shadow-lg"
        >
          {d.teaser}
        </button>
      )}

      <button
        data-tour="sapphy-fab"
        aria-label={open ? "Close Sapphy" : d.ended ? "Open your feedback from Sapphy" : "Ask Sapphy for help"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto relative inline-flex size-16 items-center justify-center rounded-full border bg-card shadow-lg"
      >
        <Sapphy mood={d.happy ? "happy" : "idle"} className="size-[46px]" />
        {!open && d.ended && (
          <span className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
            1
          </span>
        )}
      </button>
    </div>
  )
}
