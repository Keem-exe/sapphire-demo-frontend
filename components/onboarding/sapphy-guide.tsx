"use client"

import type React from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sapphy, type SapphyMood } from "@/components/sapphy"

type GuideStep = {
  /** data-tour value of the element to point at; omitted = a centred message */
  target?: string
  title: string
  body: string
  mood: SapphyMood
}

function stepsFor(name: string | undefined): GuideStep[] {
  return [
    {
      title: `Hi${name ? ` ${name}` : ""}, I'm Sapphy!`,
      body: "I'm your study buddy. Let me show you around. It takes about a minute, and you can skip at any time.",
      mood: "happy",
    },
    {
      target: "tasks",
      title: "Your three daily tasks",
      body: "Every day I set you three short tasks, picked from your own results: a quiz, a flashcard round and something light. They tick off by themselves when you do them.",
      mood: "idle",
    },
    {
      target: "streak",
      title: "Keep your streak alive",
      body: "Log on and finish at least one task each day and your streak grows. Finish all three for a perfect day. Miss a day and it starts again.",
      mood: "happy",
    },
    {
      target: "week",
      title: "Your week at a glance",
      body: "Each dot is a day you studied. Green means you kept your streak that day.",
      mood: "idle",
    },
    {
      target: "subjects",
      title: "Your subjects",
      body: "Open a subject for your notebook, quizzes, flashcards, study reels, assignments and past papers. The ring shows how many topics you've mastered.",
      mood: "thinking",
    },
    {
      target: "sapphy-fab",
      title: "Ask me anything",
      body: "Tap me whenever you're stuck. After a quiz or flashcard session I'll also tell you how it went and what to do next.",
      mood: "happy",
    },
    {
      title: "You're all set!",
      body: "Start with the first task on your list. You can replay this guide any time from the account menu.",
      mood: "happy",
    },
  ]
}

type Box = { top: number; left: number; width: number; height: number }
const PAD = 8
const BUBBLE_W = 340

interface SapphyGuideProps {
  open: boolean
  firstName?: string
  /** Called when the student finishes or skips the guide */
  onClose: () => void
}

/** First-login walkthrough: Sapphy points at each part of the dashboard in turn. */
export function SapphyGuide({ open, firstName, onClose }: SapphyGuideProps) {
  const steps = stepsFor(firstName)
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const primaryRef = useRef<HTMLButtonElement>(null)
  const step = steps[i]
  const last = i === steps.length - 1

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight })
    const el = step?.target ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null) : null
    if (!el) return setBox(null)
    const r = el.getBoundingClientRect()
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
  }, [step?.target])

  // Bring the target into view, then measure it.
  useLayoutEffect(() => {
    if (!open) return
    const el = step?.target ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null) : null
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
    measure()
    const t = window.setTimeout(measure, reduce ? 0 : 350)
    return () => window.clearTimeout(t)
  }, [open, i, measure, step?.target])

  useEffect(() => {
    if (!open) return
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open, measure])

  useEffect(() => {
    if (open) primaryRef.current?.focus()
  }, [open, i])

  useEffect(() => {
    if (open) setI(0)
  }, [open])

  if (!open || typeof document === "undefined" || !step) return null

  const next = () => (last ? onClose() : setI((n) => n + 1))
  const back = () => setI((n) => Math.max(0, n - 1))

  // Bubble below the target if there's room, otherwise above; centred when there's no target.
  const bubbleW = Math.min(BUBBLE_W, viewport.w - 32)
  let bubbleStyle: React.CSSProperties
  if (box) {
    const below = box.top + box.height + 16
    const fitsBelow = below + 230 < viewport.h
    const left = Math.min(Math.max(16, box.left + box.width / 2 - bubbleW / 2), viewport.w - bubbleW - 16)
    bubbleStyle = fitsBelow
      ? { top: below, left, width: bubbleW }
      : { top: Math.max(16, box.top - 16 - 230), left, width: bubbleW }
  } else {
    bubbleStyle = { top: "50%", left: "50%", width: bubbleW, transform: "translate(-50%, -50%)" }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sapphy-guide-title"
      aria-describedby="sapphy-guide-body"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
        if (e.key === "ArrowRight") next()
        if (e.key === "ArrowLeft") back()
        if (e.key === "Tab") {
          // Keep focus inside the bubble.
          const focusables = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")
          const first = focusables[0]
          const lastEl = focusables[focusables.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            lastEl.focus()
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault()
            first.focus()
          }
        }
      }}
    >
      {/* Dimmed page with a cut-out around the highlighted element */}
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-4 ring-primary motion-safe:transition-all motion-safe:duration-300"
          style={{ ...box, boxShadow: "0 0 0 9999px rgb(8 20 45 / 0.55)" }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgb(8_20_45/0.55)]" />
      )}

      <section
        className="fixed flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow-2xl motion-safe:transition-all motion-safe:duration-300"
        style={bubbleStyle}
      >
        <div className="flex items-start gap-3">
          <Sapphy mood={step.mood} blush={step.mood === "happy"} className="size-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step {i + 1} of {steps.length}
            </p>
            <h2 id="sapphy-guide-title" className="text-lg font-semibold leading-6">
              {step.title}
            </h2>
          </div>
        </div>
        <p id="sapphy-guide-body" className="text-[15px] leading-6">
          {step.body}
        </p>
        <div className="flex items-center gap-1" aria-hidden="true">
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!last && (
            <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={onClose}>
              Skip guide
            </Button>
          )}
          <span className="flex-1" />
          {i > 0 && (
            <Button variant="outline" size="sm" className="min-h-11 rounded-xl shadow-none" onClick={back}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
          )}
          <Button ref={primaryRef} size="sm" className="min-h-11 rounded-xl" onClick={next}>
            {i === 0 ? "Show me around" : last ? "Let's go" : "Next"}
            {!last && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
