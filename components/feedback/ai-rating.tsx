"use client"

import { useState } from "react"
import { Flag, Meh, ThumbsDown, ThumbsUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type Rating = "helpful" | "partially_helpful" | "unhelpful"

const OPTIONS: { value: Rating; label: string; icon: typeof ThumbsUp }[] = [
  { value: "helpful", label: "Helpful", icon: ThumbsUp },
  { value: "partially_helpful", label: "Partly helpful", icon: Meh },
  { value: "unhelpful", label: "Not helpful", icon: ThumbsDown },
]

/** 👍 / 😐 / 👎 + "Report" under an AI answer. Posts to the event the backend returned as `eventId`. */
export function AiRating({ eventId }: { eventId: number | string }) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async (body: { rating?: Rating; flagReason?: string }) => {
    setBusy(true)
    try {
      await apiClient.post(`/api/feedback/ai-events/${eventId}/rating`, body)
      return true
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send your feedback")
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-0.5 pl-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={label}
          aria-pressed={rating === value}
          disabled={busy}
          onClick={async () => (await send({ rating: value })) && setRating(value)}
        >
          <Icon className={cn("size-3", rating === value ? "text-primary" : "text-muted-foreground")} />
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
        disabled={busy || reported}
        onClick={async () => {
          const reason = window.prompt("What's wrong with this response?")?.trim()
          if (!reason) return
          if (await send({ flagReason: reason })) {
            setReported(true)
            toast.success("Thanks — we'll take a look")
          }
        }}
      >
        <Flag className="size-3" /> {reported ? "Reported" : "Report"}
      </Button>
    </div>
  )
}
