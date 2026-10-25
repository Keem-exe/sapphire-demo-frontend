"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { subjectStripe } from "@/lib/brand"
import type { Level, SubjectId } from "@/lib/data/subjects"

export interface SubjectCardData {
  id: SubjectId
  name: string
  icon: string
  level: Level
  /** Topics mastered out of all topics, 0-100 */
  masteryPercent: number
  topicCount: number
  topicsMastered: number
  lastStudiedAt: string | null
  /** Sapphy's next step for this subject, or null when there's nothing queued */
  nextUp: string | null
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Not started yet"
  const then = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).getTime()
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 2) return "Studied just now"
  if (mins < 60) return `Studied ${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `Studied ${hours} ${hours === 1 ? "hour" : "hours"} ago`
  const days = Math.round(hours / 24)
  return `Studied ${days} ${days === 1 ? "day" : "days"} ago`
}

export function SubjectCard({ subject }: { subject: SubjectCardData }) {
  const router = useRouter()
  const stripe = subjectStripe(subject.id)
  const pct = Math.max(0, Math.min(100, Math.round(subject.masteryPercent)))

  const open = () => router.push(`/workspace/${subject.id}`)

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          open()
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
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-6">{subject.name}</h3>
            <p className="text-xs text-muted-foreground">{timeAgo(subject.lastStudiedAt)}</p>
          </div>
          <Badge variant="outline">{subject.level.toUpperCase()}</Badge>
          <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-[18px]">
          <div
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${Math.round(pct * 3.6)}deg, color-mix(in oklab, var(--primary) 18%, transparent) 0)`,
            }}
            role="img"
            aria-label={`${pct} percent of topics mastered`}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-card">
              <span className="text-[17px] font-bold tabular-nums">{pct}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">
              {subject.topicsMastered} of {subject.topicCount} topics mastered
            </p>
            <p className="text-xs text-muted-foreground">Next up</p>
            <p className="font-medium leading-[22px]">{subject.nextUp ?? "Pick any topic to begin"}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
