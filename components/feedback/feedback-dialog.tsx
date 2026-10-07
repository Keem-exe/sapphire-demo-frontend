"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api-client"

const TYPES = [
  { value: "bug", label: "Report a bug" },
  { value: "feature_request", label: "Request a feature" },
  { value: "general", label: "Send feedback" },
  { value: "ai_issue", label: "AI response problem" },
  { value: "content_issue", label: "Content problem" },
  { value: "ui_ux", label: "Design / usability" },
]
const FEATURES = [
  { value: "ai_tutor", label: "AI Tutor" },
  { value: "quizzes", label: "Quizzes" },
  { value: "flashcards", label: "Flashcards" },
  { value: "notebook", label: "Notebook" },
  { value: "assignments", label: "Assignments" },
  { value: "learning_paths", label: "Learning paths" },
  { value: "videos", label: "Videos" },
  { value: "other", label: "Other" },
]

export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState("general")
  const [feature, setFeature] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await apiClient.post("/api/feedback", {
        type,
        title: title.trim(),
        ...(feature && { feature }),
        ...(message.trim() && { message: message.trim() }),
      })
      toast.success("Thanks for the feedback!")
      setTitle("")
      setMessage("")
      setFeature("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send feedback. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Help us improve Sapphire</DialogTitle>
            <DialogDescription>Report a bug, request a feature, or tell us what you think.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={feature} onValueChange={setFeature}>
              <SelectTrigger aria-label="Feature"><SelectValue placeholder="Which feature? (optional)" /></SelectTrigger>
              <SelectContent>{FEATURES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Short summary" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          <Textarea placeholder="Details (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !title.trim()}>{busy && <Loader2 className="size-4 animate-spin" />} Send</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
