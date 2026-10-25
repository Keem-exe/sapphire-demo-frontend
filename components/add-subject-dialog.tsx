"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SUBJECTS, subjectsForLevel, type Level, type SubjectId } from "@/lib/data/subjects"
import { hasAuthToken, resolveBackendSubject } from "@/lib/services/backend-subject-map"
import { meService } from "@/lib/services/me-service"

interface AddSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  level: Level
  /** Subjects the student already has on the dashboard */
  enrolled: SubjectId[]
  /** Called after a subject is added */
  onAdded: (id: SubjectId) => void
}

type Option = { id: SubjectId; name: string; icon: string; topicCount: number | null }

/**
 * Pick from the subjects Sapphire offers for this level. Students can't type their own subject:
 * an unknown subject would have no topics, quizzes or reels.
 */
export function AddSubjectDialog({ open, onOpenChange, level, enrolled, onAdded }: AddSubjectDialogProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<SubjectId | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    const offline: Option[] = subjectsForLevel(level).map((id) => ({
      id,
      name: SUBJECTS[id].name,
      icon: SUBJECTS[id].icon,
      topicCount: hasAuthToken() ? null : SUBJECTS[id].topics.length,
    }))
    if (!hasAuthToken()) {
      setOptions(offline)
      return
    }
    setLoading(true)
    meService
      .catalog(level)
      .then((catalog) => {
        const byName = new Map(catalog.map((s: any) => [String(s.name).toLowerCase(), s]))
        // Only subjects the backend actually offers, with their real topic counts.
        setOptions(
          offline
            .filter((o) => byName.has(o.name.toLowerCase()))
            .map((o) => ({ ...o, topicCount: byName.get(o.name.toLowerCase())?.topicCount ?? 0 })),
        )
      })
      .catch(() => setOptions(offline))
      .finally(() => setLoading(false))
  }, [open, level])

  const add = async (id: SubjectId) => {
    setAdding(id)
    setError(null)
    try {
      if (hasAuthToken()) await resolveBackendSubject(id) // enrolls if needed
      onAdded(id)
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || "Couldn't add that subject. Please try again.")
    } finally {
      setAdding(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a subject</DialogTitle>
          <DialogDescription>
            The {level === "csec" ? "CSEC" : "CAPE"} subjects Sapphire covers right now. More are on the way.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading subjects…
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {options.map((o) => {
              const has = enrolled.includes(o.id)
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={has || !!adding}
                    onClick={() => add(o.id)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-colors",
                      has ? "cursor-default border-border opacity-70" : "hover:border-primary/50",
                    )}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {o.icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{o.name}</span>
                      {o.topicCount !== null && (
                        <span className="text-xs text-muted-foreground">{o.topicCount} topics</span>
                      )}
                    </span>
                    {has ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-status-success">
                        <Check className="size-4" aria-hidden="true" /> Added
                      </span>
                    ) : adding === o.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-medium text-primary">Add</span>
                    )}
                  </button>
                </li>
              )
            })}
            {options.length === 0 && <p className="text-sm text-muted-foreground">No subjects are available for this level yet.</p>}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="outline" className="min-h-11 rounded-xl shadow-none" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
