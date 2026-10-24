"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeftRight, ChevronDown, ChevronUp, Loader2, Search, Star, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { api, type AdminApiError, type Page } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import { useApi } from "@/lib/admin/use-api"
import type { BulkReviewResult, DialogueDetail, DialogueItem, DialogueStatus, DialogueSummary, DialogueTurn, Subject } from "@/lib/admin/types"
import { EmptyState, ErrorNote, Pager, TableSkeleton, useDebounce } from "@/components/admin/common"
import { cn } from "@/lib/utils"

const ALL = "all"
const BAD_NOTE = "Never exported for training, even if approved."

const tagTone = (tag: string, bad: string[], good: string[]) =>
  bad.includes(tag)
    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
    : good.includes(tag)
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : ""
const nice = (t: string) => t.replaceAll("_", " ")
const problemsOf = (e?: AdminApiError) => ((e?.errors as unknown as { problems?: string[] } | undefined)?.problems ?? []) as string[]

// Transcripts are student conversations: nothing here is written to localStorage, URLs or analytics.
export function ReviewTab() {
  const router = useRouter()
  const sp = useSearchParams()
  const status = (sp.get("status") as DialogueStatus) || "draft"
  const sourceId = sp.get("sourceId") || undefined
  const selectedId = sp.get("id") ? Number(sp.get("id")) : null

  const [subjectId, setSubjectId] = useState(ALL)
  const [tag, setTag] = useState(ALL)
  const [sort, setSort] = useState("oldest")
  const [unrated, setUnrated] = useState(false)
  const [flagged, setFlagged] = useState(false)
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim())
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [bulk, setBulk] = useState<null | "approve" | "reject" | "reopen">(null)
  const [bulkResult, setBulkResult] = useState<BulkReviewResult | null>(null)

  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const summary = useApi<DialogueSummary>("/api/admin/dialogues/summary", { subjectId: subjectId === ALL ? undefined : subjectId })

  const filters = {
    status,
    subjectId: subjectId === ALL ? undefined : subjectId,
    tag: tag === ALL ? undefined : tag,
    unrated: unrated || undefined,
    flagged: flagged || undefined,
    sourceId,
    q: q || undefined,
    sort,
  }
  const filterKey = JSON.stringify(filters)
  useEffect(() => { setPage(1); setChecked(new Set()) }, [filterKey])

  const list = useApi<Page<DialogueItem>>("/api/admin/dialogues", { ...filters, page, per_page: 20 })
  const items = list.data?.items ?? []
  const index = items.findIndex((i) => i.id === selectedId)

  const setParams = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString())
    p.set("tab", "review")
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    router.replace(`/admin/dialogues?${p.toString()}`)
  }
  const go = (offset: number) => {
    const target = items[(index < 0 ? (offset > 0 ? -1 : items.length) : index) + offset]
    if (target) setParams({ id: String(target.id) })
  }
  const toggle = (id: number) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const counts = summary.data?.byStatus
  const tags = summary.data?.tags

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any tag</SelectItem>
            {tags?.all.map((t) => <SelectItem key={t} value={t}>{nice(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="quality">Best (AI guess) first</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="w-56 pl-8" placeholder="Search conversations" maxLength={200} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["draft", "approved", "rejected"] as DialogueStatus[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="capitalize" onClick={() => setParams({ status: s, id: undefined })}>
            {s} {counts ? <span className="ml-1 opacity-70">{counts[s]}</span> : null}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button size="sm" variant={unrated ? "secondary" : "ghost"} className="h-8" onClick={() => setUnrated(!unrated)}>
          Unrated {summary.data && <span className="ml-1 opacity-70">{summary.data.unrated}</span>}
        </Button>
        <Button size="sm" variant={flagged ? "secondary" : "ghost"} className="h-8" onClick={() => setFlagged(!flagged)}>
          Flagged {summary.data && <span className="ml-1 opacity-70">{summary.data.flagged}</span>}
        </Button>
        {sourceId && <Button size="sm" variant="secondary" className="h-8" onClick={() => setParams({ sourceId: undefined, id: undefined })}>One file only ✕</Button>}
        {summary.data && <span className="ml-auto text-xs text-muted-foreground">{summary.data.approvedForTraining} cleared for training</span>}
      </div>

      <ErrorNote message={list.error || summary.error} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="overflow-hidden p-0">
          {checked.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{checked.size} selected</span>
              {status !== "approved" && <Button size="sm" onClick={() => setBulk("approve")}>Approve</Button>}
              {status === "draft" && <Button size="sm" variant="outline" onClick={() => setBulk("reject")}>Reject</Button>}
              {status !== "draft" && <Button size="sm" variant="outline" onClick={() => setBulk("reopen")}>Reopen</Button>}
              <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>Clear</Button>
            </div>
          )}
          {list.loading && !list.data ? <TableSkeleton /> : items.length === 0 ? (
            <EmptyState title={`No ${status} conversations`} hint={status === "draft" ? "Nothing waiting for review." : undefined} />
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className={cn("flex gap-3 px-3 py-3", selectedId === item.id && "bg-primary/5")}>
                  <Checkbox className="mt-1" checked={checked.has(item.id)} onCheckedChange={() => toggle(item.id)} aria-label={`Select conversation ${item.id}`} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setParams({ id: String(item.id) })}>
                    <p className="line-clamp-1 text-sm font-medium">{item.summary || item.preview || `Conversation ${item.id}`}</p>
                    {item.summary && item.preview && <p className="line-clamp-1 text-xs text-muted-foreground">{item.preview}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{item.turnCount} turns</span>
                      <Stars value={item.quality} size={12} />
                      {item.quality == null && item.qualityGuess != null && <span title="AI's guess">AI ~{item.qualityGuess}/5</span>}
                      {item.piiFlags.length > 0 && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="size-3" /> personal details?</span>}
                      {item.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className={cn("h-5 px-1.5 text-[10px]", tagTone(t, tags?.bad ?? [], tags?.good ?? []))}>{nice(t)}</Badge>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager pagination={list.data?.pagination} onPage={setPage} />
        </Card>

        <div className="min-w-0">
          {selectedId ? (
            <Detail
              key={selectedId}
              id={selectedId}
              tags={tags}
              hasPrev={index > 0}
              hasNext={index >= 0 && index < items.length - 1}
              onNav={go}
            />
          ) : (
            <Card><EmptyState title="Select a conversation" hint="Keyboard: J / K move, 1–5 rate, A approve, R reject." /></Card>
          )}
        </div>
      </div>

      {bulk && (
        <BulkDialog
          action={bulk}
          ids={[...checked]}
          onClose={() => setBulk(null)}
          onDone={(r) => { setBulk(null); setBulkResult(r); setChecked(new Set(r.failed.map((f) => f.id))) }}
        />
      )}
      <Dialog open={!!bulkResult && bulkResult.failed.length > 0} onOpenChange={(o) => !o && setBulkResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkResult?.succeeded.length} done, {bulkResult?.failed.length} could not be changed</DialogTitle>
            <DialogDescription>The ones that failed are still selected.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {bulkResult?.failed.map((f) => <li key={f.id}><b>#{f.id}</b>: {f.reason}</li>)}
          </ul>
          <DialogFooter><Button onClick={() => setBulkResult(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Stars({ value, size = 16, onRate, disabled }: { value: number | null; size?: number; onRate?: (n: number) => void; disabled?: boolean }) {
  if (value == null && !onRate) return null
  return (
    <span className="inline-flex" role={onRate ? "radiogroup" : undefined} aria-label="Quality rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n
        const icon = <Star style={{ width: size, height: size }} className={on ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
        return onRate ? (
          <button key={n} type="button" disabled={disabled} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-checked={value === n} role="radio" onClick={() => onRate(n)} className="p-0.5">{icon}</button>
        ) : <span key={n}>{icon}</span>
      })}
    </span>
  )
}

function BulkDialog({ action, ids, onClose, onDone }: { action: "approve" | "reject" | "reopen"; ids: number[]; onClose: () => void; onDone: (r: BulkReviewResult) => void }) {
  const [usable, setUsable] = useState(false)
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    const r = await mutate<BulkReviewResult>(
      () => api.post("/api/admin/dialogues/bulk-review", { ids, action, ...(action === "approve" ? { usableForTraining: usable } : {}) }),
      "Review updated",
    )
    setBusy(false)
    if (r.ok) onDone(r.res.data)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{action} {ids.length} conversation{ids.length > 1 ? "s" : ""}?</DialogTitle>
          {action === "approve" && <DialogDescription>Conversations without a star rating cannot be approved and will be listed as failures.</DialogDescription>}
        </DialogHeader>
        {action === "approve" && (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" checked={usable} onCheckedChange={(c) => setUsable(c === true)} />
            <span>Allow these to train our model</span>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy} variant={action === "reject" ? "destructive" : "default"}>{busy && <Loader2 className="size-4 animate-spin" />} <span className="capitalize">{action}</span></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ id, tags, hasPrev, hasNext, onNav }: { id: number; tags?: DialogueSummary["tags"]; hasPrev: boolean; hasNext: boolean; onNav: (offset: number) => void }) {
  const { data, loading, error } = useApi<DialogueDetail | { dialogue: DialogueDetail }>(`/api/admin/dialogues/${id}`)
  const d = data && ("dialogue" in data ? data.dialogue : data)

  const [turns, setTurns] = useState<DialogueTurn[]>([])
  const [summaryText, setSummaryText] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)

  // Pull server state into the editor, but never over unsaved edits.
  useEffect(() => {
    if (!d || dirty) return
    setTurns(d.turns)
    setSummaryText(d.summary ?? "")
    setPicked(d.tags)
  }, [d, dirty])

  const bad = tags?.bad ?? []
  const good = tags?.good ?? []
  const quality = d?.quality ?? null
  const heavily = picked.includes("heavily_edited")
  const badPicked = picked.filter((t) => bad.includes(t))

  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true) }
  const setTurn = (i: number, patch: Partial<DialogueTurn>) => edit(setTurns)(turns.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  const turnsValid = turns.length >= 2 && turns.some((t) => t.role === "tutor") && turns.some((t) => t.role === "student") && turns.every((t) => t.text.trim())

  const save = async (): Promise<boolean> => {
    if (!d || !dirty) return true
    if (!turnsValid) {
      toast.error("Keep at least two non-empty turns, one from the tutor and one from the student.")
      return false
    }
    setSaving(true)
    const r = await mutate<{ reopened?: boolean }>(
      () => api.patch(`/api/admin/dialogues/${id}`, { turns, summary: summaryText, tags: picked }),
      "Saved",
    )
    setSaving(false)
    if (r.ok) {
      setDirty(false)
      if ((r.res.data as { reopened?: boolean } | undefined)?.reopened) toast.info("Editing an approved conversation returned it to draft")
    }
    return r.ok
  }

  const rate = (n: number) => mutate(() => api.patch(`/api/admin/dialogues/${id}`, { quality: n }), `Rated ${n}/5`)

  const reject = async () => {
    if (!(await save())) return
    const r = await mutate(() => api.post(`/api/admin/dialogues/${id}/review`, { action: "reject" }), "Rejected")
    if (r.ok) onNav(1)
  }

  // Fast reviewing: J/K or arrows to move, 1-5 to rate, A to approve, R to reject.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable], [role=dialog]")) return
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); onNav(1) }
      else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); onNav(-1) }
      else if (/^[1-5]$/.test(e.key)) rate(Number(e.key))
      else if (e.key === "a" && d?.status !== "approved") setApproveOpen(true)
      else if (e.key === "r" && d?.status === "draft") reject()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.status, turns, picked, summaryText, dirty])

  if (error) return <ErrorNote message={error} />
  if (loading && !d) return <Card><TableSkeleton rows={8} /></Card>
  if (!d) return null

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{d.status}</Badge>
        {d.subject && <span className="text-sm text-muted-foreground">{d.subject.name}</span>}
        {d.sourceFilename && <span className="truncate text-xs text-muted-foreground">{d.sourceFilename}</span>}
        <span className="ml-auto flex gap-1">
          <Button size="icon" variant="outline" className="size-8" disabled={!hasPrev} onClick={() => onNav(-1)} aria-label="Previous conversation"><ChevronUp className="size-4" /></Button>
          <Button size="icon" variant="outline" className="size-8" disabled={!hasNext} onClick={() => onNav(1)} aria-label="Next conversation"><ChevronDown className="size-4" /></Button>
        </span>
      </div>

      {d.piiFlags.length > 0 && (
        <Warning>May still contain {d.piiFlags.map(nice).join(", ")}. Edit it out before approving.</Warning>
      )}
      {heavily && <Warning>The AI changed the wording a lot. Compare with what was actually said.</Warning>}
      {d.status === "draft" && d.approvalProblems.length > 0 && (
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <p className="font-medium">Not ready to approve yet:</p>
          <ul className="list-disc pl-5">{d.approvalProblems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Your rating (required to approve)</p>
          <Stars value={quality} size={22} onRate={rate} />
        </div>
        {d.qualityGuess != null && <p className="text-xs text-muted-foreground">AI&apos;s guess: {d.qualityGuess}/5</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="dlg-summary">Summary</label>
        <Input id="dlg-summary" value={summaryText} onChange={(e) => edit(setSummaryText)(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {(tags?.all ?? picked).map((t) => {
            const on = picked.includes(t)
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => edit(setPicked)(on ? picked.filter((x) => x !== t) : [...picked, t])}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", on ? tagTone(t, bad, good) || "bg-primary/10" : "text-muted-foreground opacity-60 hover:opacity-100")}
              >
                {nice(t)}
              </button>
            )
          })}
        </div>
        {badPicked.length > 0 && <p className="text-xs text-red-600 dark:text-red-400">{badPicked.map(nice).join(", ")}: {BAD_NOTE}</p>}
      </div>

      <div className="space-y-2">
        {turns.map((t, i) => {
          const tutor = t.role === "tutor"
          return (
            <div key={i} className={cn("flex", tutor ? "justify-start" : "justify-end")}>
              <div className={cn("w-[85%] space-y-1 rounded-2xl border p-2", tutor ? "rounded-bl-sm bg-card" : "rounded-br-sm bg-primary/5")}>
                <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>{tutor ? "Tutor" : "Student"}</span>
                  <Button type="button" variant="ghost" size="icon" className="ml-auto size-6" aria-label="Swap speaker" onClick={() => setTurn(i, { role: tutor ? "student" : "tutor" })}><ArrowLeftRight className="size-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Delete turn" onClick={() => edit(setTurns)(turns.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></Button>
                </div>
                <Textarea value={t.text} rows={Math.min(8, Math.max(2, Math.ceil(t.text.length / 60)))} className="resize-y border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-1" onChange={(e) => setTurn(i, { text: e.target.value })} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center gap-2 border-t bg-card px-4 py-3">
        <Button variant="outline" disabled={!dirty || saving} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />} Save edits</Button>
        {d.status === "draft" && <Button variant="outline" onClick={reject}>Reject <kbd className="ml-1 text-[10px] opacity-60">R</kbd></Button>}
        {d.status !== "draft" && (
          <Button variant="outline" onClick={() => mutate(() => api.post(`/api/admin/dialogues/${id}/review`, { action: "reopen" }), "Reopened")}>Reopen</Button>
        )}
        {d.status !== "approved" && <Button className="ml-auto" onClick={() => setApproveOpen(true)}>Approve <kbd className="ml-1 text-[10px] opacity-60">A</kbd></Button>}
        {d.status === "approved" && (
          <span className="ml-auto text-sm text-muted-foreground">{d.usableForTraining ? "Cleared for training" : "Approved, not cleared for training"}{d.excludedFromTraining && ` · ${BAD_NOTE}`}</span>
        )}
      </div>

      {approveOpen && (
        <ApproveDialog
          id={id}
          quality={quality}
          badTags={badPicked}
          beforeSubmit={save}
          onClose={() => setApproveOpen(false)}
          onApproved={() => { setApproveOpen(false); onNav(1) }}
        />
      )}
    </Card>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
      <AlertTriangle className="size-4 shrink-0" /> {children}
    </div>
  )
}

function ApproveDialog({ id, quality, badTags, beforeSubmit, onClose, onApproved }: {
  id: number; quality: number | null; badTags: string[]; beforeSubmit: () => Promise<boolean>; onClose: () => void; onApproved: () => void
}) {
  const [usable, setUsable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const excluded = badTags.length > 0

  const submit = async () => {
    setBusy(true)
    setProblems([])
    if (await beforeSubmit()) {
      const r = await mutate(() => api.post(`/api/admin/dialogues/${id}/review`, { action: "approve", usableForTraining: usable && !excluded, ...(quality ? { quality } : {}) }), "Approved")
      if (r.ok) onApproved()
      else setProblems(problemsOf(r.error))
    }
    setBusy(false)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve this conversation</DialogTitle>
          <DialogDescription>Approving makes it available to reviewers downstream. Training is a separate decision.</DialogDescription>
        </DialogHeader>
        {quality == null && <p className="text-sm text-destructive">Give it a 1–5 star rating first (press 1–5).</p>}
        <label className="flex items-start gap-2 text-sm">
          <Checkbox className="mt-0.5" checked={usable && !excluded} disabled={excluded} onCheckedChange={(c) => setUsable(c === true)} />
          <span>Allow this to train our model{excluded && <span className="block text-xs text-red-600 dark:text-red-400">{badTags.map(nice).join(", ")}: {BAD_NOTE}</span>}</span>
        </label>
        {problems.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || quality == null}>{busy && <Loader2 className="size-4 animate-spin" />} Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
