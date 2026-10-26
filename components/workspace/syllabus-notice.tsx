"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SubjectId } from "@/lib/data/subjects"

// Subjects whose topics were replaced by the official CXC syllabus (progress restarted against it)
const SYLLABUS_SUBJECTS: SubjectId[] = ["csec-math", "csec-eng"]
const storageKey = (subjectId: string) => `sapphire_syllabus_notice_v1_${subjectId}`

/** One-time, dismissible heads-up that the subject now follows the official CXC syllabus. */
export function SyllabusNotice({ subjectId }: { subjectId: SubjectId }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!SYLLABUS_SUBJECTS.includes(subjectId)) return setVisible(false)
    // Demo users never had backend progress to reset
    if (!localStorage.getItem("authToken")) return setVisible(false)
    try {
      setVisible(!localStorage.getItem(storageKey(subjectId)))
    } catch {
      setVisible(false)
    }
  }, [subjectId])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(subjectId), "1")
    } catch {}
    setVisible(false)
  }

  return (
    <div role="status" className="flex items-start justify-between gap-3 border-b bg-primary/10 px-4 py-2 text-sm">
      <p>
        <span className="font-semibold">Your subject now follows the official CXC syllabus.</span> Topics are grouped by
        module, and your progress for this subject starts fresh against the new sections.
      </p>
      <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Dismiss" onClick={dismiss}>
        <X className="size-4" />
      </Button>
    </div>
  )
}
