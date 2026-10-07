"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, type Page } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, Pager, RiskBadge, TableSkeleton, fmtDate, useDebounce } from "@/components/admin/common"
import type { RiskLevel } from "@/lib/admin/types"
import { DetailSheet, StudentName } from "./primitives"

export interface FeedbackItem {
  id: number
  userId: number | null
  userName: string | null
  type: string
  feature: string | null
  title: string
  message: string | null
  priority: RiskLevel
  status: string
  assignedTo: number | null
  assigneeName: string | null
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

const ALL = "all"
const TYPES = ["bug", "feature_request", "ai_issue", "content_issue", "ui_ux", "general"]
const STATUSES = ["open", "new", "triaged", "in_progress", "resolved", "wont_fix"]
const PRIORITIES: RiskLevel[] = ["critical", "high", "medium", "low"]
const FEATURES = ["ai_tutor", "quizzes", "flashcards", "notebook", "assignments", "learning_paths", "videos", "other"]
const label = (s: string) => s.replace(/_/g, " ")

function Filter({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36 capitalize"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{label(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function FeedbackRow({ item, team }: { item: FeedbackItem; team: { id: number; name: string }[] }) {
  const [note, setNote] = useState(item.resolutionNote ?? "")
  const [expanded, setExpanded] = useState(false)
  const patch = (body: Record<string, unknown>, msg: string) => mutate(() => api.patch(`/api/admin/feedback/${item.id}`, body), msg)
  const resolved = item.status === "resolved" || item.status === "wont_fix"

  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={item.priority} />
        <Badge variant="outline" className="capitalize">{label(item.type)}</Badge>
        {item.feature && <Badge variant="secondary" className="capitalize">{label(item.feature)}</Badge>}
        <Badge className="capitalize">{label(item.status)}</Badge>
        <time className="ml-auto text-xs text-muted-foreground">{fmtDate(item.createdAt)}</time>
      </div>
      <button type="button" className="text-left font-medium hover:underline" onClick={() => setExpanded((e) => !e)}>{item.title}</button>
      <p className="text-xs text-muted-foreground">
        by {item.userId ? <StudentName id={item.userId} name={item.userName} className="text-xs" /> : "anonymous"}
        {item.assigneeName && <> · assigned to {item.assigneeName}</>}
      </p>
      {expanded && (
        <div className="space-y-3 border-t pt-3">
          {item.message && <p className="whitespace-pre-wrap text-sm">{item.message}</p>}
          <div className="flex flex-wrap gap-2">
            <Select value={item.priority} onValueChange={(v) => patch({ priority: v }, "Priority updated")}>
              <SelectTrigger className="w-32 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={item.status} onValueChange={(v) => patch({ status: v }, "Status updated")}>
              <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.filter((s) => s !== "open").map((s) => <SelectItem key={s} value={s} className="capitalize">{label(s)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={item.assignedTo ? String(item.assignedTo) : "none"} onValueChange={(v) => patch({ assignedTo: v === "none" ? null : Number(v) }, "Assignee updated")}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Assign team member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {team.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Resolution note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button size="sm" disabled={resolved} onClick={() => patch({ status: "resolved", ...(note.trim() && { resolutionNote: note.trim() }) }, "Issue resolved")}>Resolve issue</Button>
            {note !== (item.resolutionNote ?? "") && <Button size="sm" variant="outline" onClick={() => patch({ resolutionNote: note.trim() }, "Note saved")}>Save note</Button>}
          </div>
        </div>
      )}
    </li>
  )
}

export function FeedbackDrawer({ open, onOpenChange, initialFeature }: { open: boolean; onOpenChange: (o: boolean) => void; initialFeature?: string }) {
  const [f, setF] = useState({ type: ALL, feature: initialFeature ?? ALL, status: "open", priority: ALL })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const q = useDebounce(search)
  useEffect(() => { if (open) setF((s) => ({ ...s, feature: initialFeature ?? ALL })) }, [open, initialFeature])
  const set = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setPage(1) }
  const clean = (v: string) => (v === ALL ? undefined : v)

  const list = useApi<Page<FeedbackItem>>(open ? "/api/admin/feedback" : null, {
    page, per_page: 15, search: q, type: clean(f.type), feature: clean(f.feature), status: clean(f.status), priority: clean(f.priority),
  })
  const team = useApi<{ team: { id: number; name: string }[] }>(open ? "/api/admin/team" : null)

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Feedback & Bugs" description="Triage student reports, assign owners and resolve issues." wide>
      <div className="flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Filter value={f.type} onChange={set("type")} options={TYPES} placeholder="types" />
        <Filter value={f.feature} onChange={set("feature")} options={FEATURES} placeholder="features" />
        <Filter value={f.status} onChange={set("status")} options={STATUSES} placeholder="statuses" />
        <Filter value={f.priority} onChange={set("priority")} options={PRIORITIES} placeholder="priorities" />
      </div>
      <ErrorNote message={list.error} />
      {list.loading && !list.data ? <TableSkeleton rows={4} /> : !list.data?.items.length ? <EmptyState title="No feedback matches these filters" /> : (
        <>
          <ul className="space-y-2">{list.data.items.map((it) => <FeedbackRow key={it.id} item={it} team={team.data?.team ?? []} />)}</ul>
          <Pager pagination={list.data.pagination} onPage={setPage} />
        </>
      )}
    </DetailSheet>
  )
}
