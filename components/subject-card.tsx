"use client"

import { Card } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { subjectStripe } from "@/lib/brand"

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  progress: number
  lastStudied: string
  topics: number
}

// lib/utils.ts
export function normalizeSubjectId(id: string): string {
  const map: Record<string, string> = {
    // CSEC aliases
    "csec-1": "csec-math",
    "csec-2": "csec-eng",
    "csec-3": "csec-chem",
    // CAPE aliases
    "cape-1": "cape-puremath",
    "cape-2": "cape-phys",
    "cape-3": "cape-bio",
  };
  return map[id] || id;
}

// SAMPLE: the backend does not return a "next up" suggestion per subject yet.
const SAMPLE_NEXT_UP: Record<string, string> = {
  "csec-math": "Quadratics flashcards",
  "csec-chem": "Organic chemistry quiz",
  "csec-eng": "Persuasive essay",
}

interface SubjectCardProps {
  subject: Subject
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const router = useRouter()
  const stripe = subjectStripe(subject.id)
  const nextUp = SAMPLE_NEXT_UP[normalizeSubjectId(subject.id)] ?? "Pick up where you left off"

  const handleOpenSubject = () => {
    router.push(`/workspace/${normalizeSubjectId(subject.id)}`)
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={handleOpenSubject}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleOpenSubject()
        }
      }}
      className="group cursor-pointer gap-0 overflow-hidden rounded-2xl border-2 py-0 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className={`h-1.5 ${stripe}`} />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3.5">
          <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-white ${stripe}`} aria-hidden="true">
            {subject.icon}
          </span>
          <h3 className="flex-1 text-lg font-semibold">{subject.name}</h3>
          <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-[18px]">
          <div
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${Math.round(subject.progress * 3.6)}deg, color-mix(in oklab, var(--primary) 18%, transparent) 0)`,
            }}
            role="img"
            aria-label={`${subject.progress} percent mastery`}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-card">
              <span className="text-[17px] font-bold tabular-nums">{subject.progress}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Next up</p>
            <p className="font-medium leading-[22px]">{nextUp}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
