"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, BookText, Ear, Eye, Hand, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sapphy } from "@/components/sapphy"
import { useAuth, type LearningStyleKey } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const QUESTIONS: { id: number; question: string; options: { value: LearningStyleKey; label: string }[] }[] = [
  {
    id: 1,
    question: "When I learn something new, I prefer to:",
    options: [
      { value: "visual", label: "See diagrams, charts or videos" },
      { value: "auditory", label: "Listen to explanations or discussions" },
      { value: "kinesthetic", label: "Try it out with hands-on practice" },
      { value: "reading", label: "Read detailed notes or articles" },
    ],
  },
  {
    id: 2,
    question: "When I study for an exam, it helps most to:",
    options: [
      { value: "visual", label: "Make mind maps or colour-coded notes" },
      { value: "auditory", label: "Talk it through with others or record myself" },
      { value: "kinesthetic", label: "Do practice problems" },
      { value: "reading", label: "Write and rewrite my notes" },
    ],
  },
  {
    id: 3,
    question: "I remember things best when:",
    options: [
      { value: "visual", label: "I can picture them" },
      { value: "auditory", label: "I hear them explained" },
      { value: "kinesthetic", label: "I work with the material myself" },
      { value: "reading", label: "I read and take notes" },
    ],
  },
  {
    id: 4,
    question: "When following instructions, I prefer:",
    options: [
      { value: "visual", label: "Pictures or a demonstration" },
      { value: "auditory", label: "Someone telling me the steps" },
      { value: "kinesthetic", label: "Working it out as I go" },
      { value: "reading", label: "Written step-by-step instructions" },
    ],
  },
  {
    id: 5,
    question: "In class, I learn best when the teacher:",
    options: [
      { value: "visual", label: "Uses slides, videos and visual aids" },
      { value: "auditory", label: "Explains and encourages discussion" },
      { value: "kinesthetic", label: "Includes activities and experiments" },
      { value: "reading", label: "Gives handouts and readings" },
    ],
  },
]

const ICONS: Record<LearningStyleKey, typeof Eye> = { visual: Eye, auditory: Ear, kinesthetic: Hand, reading: BookText }

const STYLES: Record<LearningStyleKey, { name: string; line: string; tips: string[] }> = {
  visual: {
    name: "Visual learner",
    line: "You learn best from images, diagrams and videos.",
    tips: ["Watch a study reel before a new topic", "Turn notes into mind maps", "Colour-code your formulas and key terms"],
  },
  auditory: {
    name: "Auditory learner",
    line: "You learn best by hearing and talking things through.",
    tips: ["Explain topics out loud to Sapphy", "Read your notes aloud", "Use rhymes and mnemonics"],
  },
  kinesthetic: {
    name: "Hands-on learner",
    line: "You learn best by doing.",
    tips: ["Start topics with a quick quiz", "Do lots of practice questions", "Take short movement breaks"],
  },
  reading: {
    name: "Reading and writing learner",
    line: "You learn best from words on the page.",
    tips: ["Write notes in your own words", "Summarise each topic in a few lines", "Make flashcards from your notes"],
  },
}

interface LearningStyleDialogProps {
  open: boolean
  /** Called after the result is saved (or the quiz is skipped) */
  onDone: () => void
}

/** The onboarding learning-style quiz, asked by Sapphy right after the student picks a level. */
export function LearningStyleDialog({ open, onDone }: LearningStyleDialogProps) {
  const { saveLearningStyleAnswers, updateLearningStyle } = useAuth()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, LearningStyleKey>>({})
  const [result, setResult] = useState<LearningStyleKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = QUESTIONS[step]
  const picked = answers[q?.id]
  const last = step === QUESTIONS.length - 1

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      const style = await saveLearningStyleAnswers(QUESTIONS.map((x) => ({ questionId: x.id, value: answers[x.id] })))
      setResult(style)
    } catch (e: any) {
      setError(e?.message || "Couldn't save your answers. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const skip = async () => {
    setSaving(true)
    try {
      await updateLearningStyle("visual")
    } catch {
      // Skipping must never trap the student in onboarding.
    } finally {
      setSaving(false)
      onDone()
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-[560px] gap-5 rounded-3xl p-7 sm:max-w-[560px]"
      >
        {result ? (
          <>
            <DialogHeader className="items-center text-center">
              <Sapphy mood="happy" blush className="size-24" />
              <DialogTitle className="text-2xl">You're a {STYLES[result].name.toLowerCase()}</DialogTitle>
              <DialogDescription className="text-base">{STYLES[result].line}</DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sapphy's tips for you</p>
              <ul className="flex flex-col gap-2">
                {STYLES[result].tips.map((tip, i) => (
                  <li key={tip} className="flex items-start gap-2.5">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-strong">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="h-12 rounded-2xl text-base font-semibold" onClick={onDone}>
              Go to my dashboard
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
              <Sapphy mood="thinking" className="size-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl">How do you like to learn?</DialogTitle>
                <DialogDescription>
                  Five quick questions so I can tailor your study plan. Question {step + 1} of {QUESTIONS.length}.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${((step + (picked ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-3 text-lg font-semibold">{q.question}</legend>
              {q.options.map((o) => {
                const Icon = ICONS[o.value]
                const on = picked === o.value
                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 transition-colors",
                      on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={o.value}
                      checked={on}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                      className="size-4 accent-primary"
                    />
                    <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{o.label}</span>
                  </label>
                )
              })}
            </fieldset>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" className="min-h-11 shadow-none" onClick={skip} disabled={saving}>
                Skip for now
              </Button>
              <span className="flex-1" />
              <Button variant="outline" className="min-h-11 rounded-xl shadow-none" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || saving}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
              <Button
                className="min-h-11 rounded-xl"
                disabled={!picked || saving}
                onClick={() => (last ? finish() : setStep((s) => s + 1))}
              >
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {last ? "See my result" : "Next"}
                {!saving && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
