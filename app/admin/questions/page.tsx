"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, ChevronDown, Circle, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api, type AdminApiError, type Page } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import { useApi } from "@/lib/admin/use-api"
import type {
  BankMaterial,
  BankQuestion,
  BulkReviewResult,
  QuestionObjective,
  QuestionStatus,
  QuestionSummary,
  Subject,
} from "@/lib/admin/types"
import { ConfirmDialog, EmptyState, ErrorNote, FormField, PageHeader, Pager, TableSkeleton, useDebounce } from "@/components/admin/common"
import { cn } from "@/lib/utils"

const ALL = "all"
const MONO = "font-mono text-sm"
const TRAINING_WARNING = "Wrong solutions teach the model wrong maths. Only tick this if you have checked the answer and every step."

type Flag = "unmapped" | "needsFigure" | "noAnswer" | "fromVision"
const FLAG_LABELS: Record<Flag, string> = {
  unmapped: "No objective",
  needsFigure: "Needs figure",
  noAnswer: "No answer",
  fromVision: "From image",
}

export default function QuestionBankPage() {
  return (
    <Suspense>
      <QuestionBank />
    </Suspense>
  )
}

function QuestionBank() {
  const router = useRouter()
  const sp = useSearchParams()
  const status = (sp.get("status") as QuestionStatus) || "draft"
  const flag = (sp.get("flag") as Flag | null) ?? undefined
  const materialId = sp.get("materialId") || undefined
  const selectedId = sp.get("id") ? Number(sp.get("id")) : null

  const [subjectId, setSubjectId] = useState(ALL)
  const [source, setSource] = useState(ALL)
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim())
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [bulkOpen, setBulkOpen] = useState<null | "approve" | "reject" | "reopen">(null)
  const [bulkResult, setBulkResult] = useState<BulkReviewResult | null>(null)

  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const summaryParams = { subjectId: subjectId === ALL ? undefined : subjectId }
  const summary = useApi<QuestionSummary>("/api/admin/questions/summary", summaryParams)

  const filters = {
    status,
    subjectId: subjectId === ALL ? undefined : subjectId,
    source: source === ALL ? undefined : source,
    q: q || undefined,
    materialId,
    ...(flag ? { [flag]: 1 } : {}),
  }
  const filterKey = JSON.stringify(filters)
  useEffect(() => {
    setPage(1)
    setChecked(new Set())
  }, [filterKey])

  const list = useApi<Page<BankQuestion>>("/api/admin/questions", { ...filters, page, per_page: 20 })
  const items = list.data?.items ?? []

  const setParams = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    router.replace(`/admin/questions?${p.toString()}`)
  }

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const counts = summary.data?.counts
  const bankIsEmpty = !!counts && counts.draft + counts.approved + counts.rejected === 0

  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Review teacher-supplied questions before they reach students. Approving is separate from clearing a question for model training."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any source</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="cxc_specimen">CXC specimen</SelectItem>
            <SelectItem value="ai_generated">AI generated</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="w-64 pl-8" placeholder="Search question text" maxLength={200} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["draft", "approved", "rejected"] as QuestionStatus[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="capitalize"
            onClick={() => { setParams({ status: s, flag: undefined, id: undefined }) }}>
            {s} {counts ? <span className="ml-1 opacity-70">{counts[s]}</span> : null}
          </Button>
        ))}
        {status === "draft" && summary.data && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            {(Object.keys(FLAG_LABELS) as Flag[]).map((f) => (
              <Button key={f} size="sm" variant={flag === f ? "secondary" : "ghost"} className="h-8"
                onClick={() => setParams({ flag: flag === f ? undefined : f, id: undefined })}>
                {FLAG_LABELS[f]} <span className="ml-1 opacity-70">{summary.data!.drafts[f]}</span>
              </Button>
            ))}
          </>
        )}
        {summary.data && (
          <span className="ml-auto text-xs text-muted-foreground">{summary.data.approvedForTraining} cleared for training</span>
        )}
      </div>

      {materialId && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Badge variant="secondary">Showing one uploaded file</Badge>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setParams({ materialId: undefined, id: undefined })}>Show all</Button>
        </div>
      )}
      <ErrorNote message={list.error || summary.error} />

      {bankIsEmpty ? (
        <Card><EmptyState title="The question bank is empty" hint="Questions appear here as drafts once teacher files have been ingested." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card className="overflow-hidden p-0">
            {checked.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">{checked.size} selected</span>
                {status !== "approved" && <Button size="sm" onClick={() => setBulkOpen("approve")}>Approve</Button>}
                {status === "draft" && <Button size="sm" variant="outline" onClick={() => setBulkOpen("reject")}>Reject</Button>}
                {status !== "draft" && <Button size="sm" variant="outline" onClick={() => setBulkOpen("reopen")}>Reopen</Button>}
                <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>Clear</Button>
              </div>
            )}
            {list.loading && !list.data ? <TableSkeleton /> : items.length === 0 ? (
              <EmptyState
                title={`No ${status} questions`}
                hint={flag || q || source !== ALL || subjectId !== ALL ? "Nothing matches these filters." : status === "draft" ? "Nothing waiting for review." : undefined}
              />
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id} className={cn("flex gap-3 px-3 py-3", selectedId === item.id && "bg-primary/5")}>
                    <Checkbox className="mt-1" checked={checked.has(item.id)} onCheckedChange={() => toggle(item.id)} aria-label={`Select question ${item.id}`} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => setParams({ id: String(item.id) })}>
                      <p className={cn("line-clamp-2", MONO)}>{item.stem}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.questionType.replace("_", " ")}</Badge>
                        {item.topic && <span>{item.topic.name}</span>}
                        {item.sourceRef && <span>· {item.sourceRef}</span>}
                        {item.status === "draft" && item.problems.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" /> {item.problems.length} to fix
                          </span>
                        )}
                        {item.usableForTraining && <Badge variant="secondary">training</Badge>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Pager pagination={list.data?.pagination} onPage={setPage} />
          </Card>

          <div>
            {selectedId ? (
              <QuestionEditor id={selectedId} onGone={() => setParams({ id: undefined })} />
            ) : (
              <Card><EmptyState title="Select a question" hint="Pick one from the queue to review, edit and approve it." /></Card>
            )}
          </div>
        </div>
      )}

      <BulkDialog
        action={bulkOpen}
        ids={[...checked]}
        onClose={() => setBulkOpen(null)}
        onDone={(res) => {
          setBulkOpen(null)
          setBulkResult(res)
          setChecked(new Set(res.failed.map((f) => f.id)))
        }}
      />
      <Dialog open={!!bulkResult} onOpenChange={(o) => !o && setBulkResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkResult?.succeeded.length ?? 0} done, {bulkResult?.failed.length ?? 0} refused</DialogTitle>
            <DialogDescription>
              {bulkResult?.failed.length ? "These questions were left unchanged and stay selected." : "All selected questions were updated."}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {bulkResult?.failed.map((f) => (
              <li key={f.id}>
                <p className="font-medium">Question #{f.id}: {f.reason}</p>
                {f.problems?.length ? <ul className="ml-4 list-disc text-muted-foreground">{f.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
              </li>
            ))}
          </ul>
          <DialogFooter><Button onClick={() => setBulkResult(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BulkDialog({ action, ids, onClose, onDone }: {
  action: null | "approve" | "reject" | "reopen"
  ids: number[]
  onClose: () => void
  onDone: (res: BulkReviewResult) => void
}) {
  const [note, setNote] = useState("")
  const [training, setTraining] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AdminApiError>()
  useEffect(() => {
    if (action) { setNote(""); setTraining(false); setError(undefined) }
  }, [action])

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{action} {ids.length} question{ids.length === 1 ? "" : "s"}?</DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? "Questions that still have problems are refused individually; the rest go through."
              : "Applied to every selected question."}
          </DialogDescription>
        </DialogHeader>
        {ids.length > 200 && <ErrorNote message="At most 200 questions per bulk action. Deselect some first." />}
        {error && <ErrorNote message={error.errors?.problems?.join(" ") || error.message} />}
        <FormField label="Note (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </FormField>
        {action === "approve" && <TrainingCheckbox checked={training} onChange={setTraining} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            disabled={busy || ids.length === 0 || ids.length > 200}
            onClick={async () => {
              setBusy(true)
              setError(undefined)
              const r = await mutate<BulkReviewResult>(
                () => api.post("/api/admin/questions/bulk-review", {
                  ids, action, note: note.trim() || undefined, ...(action === "approve" ? { usableForTraining: training } : {}),
                }),
                "Bulk review finished",
              )
              setBusy(false)
              if (r.ok) onDone(r.res.data)
              else setError(r.error)
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} <span className="capitalize">{action}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TrainingCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>
        <span className="font-medium">Also clear for model training</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{TRAINING_WARNING}</span>
      </span>
    </label>
  )
}

// ---------------------------------------------------------------------------

interface Form {
  stem: string
  questionType: string
  options: { label: string; text: string }[]
  correctAnswer: string
  solutionSteps: string
  markScheme: string
  marks: string
  difficulty: string
  paper: string
  needsFigure: boolean
  objectiveId: string
  reviewNote: string
}

const NONE = "none"

const toForm = (q: BankQuestion): Form => ({
  stem: q.stem ?? "",
  questionType: q.questionType,
  options: (q.options ?? []).map((o) => ({ label: o.label, text: o.text })),
  correctAnswer: q.correctAnswer ?? "",
  solutionSteps: (q.solutionSteps ?? []).join("\n"),
  markScheme: q.markScheme ?? "",
  marks: q.marks == null ? "" : String(q.marks),
  difficulty: q.difficulty == null ? NONE : String(q.difficulty),
  paper: q.paper ?? NONE,
  needsFigure: q.needsFigure,
  objectiveId: q.objective ? String(q.objective.id) : NONE,
  reviewNote: q.reviewNote ?? "",
})

/** Only the fields that changed, shaped for PATCH (unknown fields are rejected server-side). */
function diffPayload(a: Form, b: Form): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (a.stem !== b.stem) out.stem = b.stem
  if (a.questionType !== b.questionType) out.questionType = b.questionType
  if (JSON.stringify(a.options) !== JSON.stringify(b.options)) out.options = b.options
  if (a.correctAnswer !== b.correctAnswer) out.correctAnswer = b.correctAnswer.trim() || null
  if (a.solutionSteps !== b.solutionSteps) out.solutionSteps = b.solutionSteps.split("\n").map((s) => s.trim()).filter(Boolean)
  if (a.markScheme !== b.markScheme) out.markScheme = b.markScheme.trim() || null
  if (a.marks !== b.marks) out.marks = b.marks.trim() ? Number(b.marks) : null
  if (a.difficulty !== b.difficulty) out.difficulty = b.difficulty === NONE ? null : Number(b.difficulty)
  if (a.paper !== b.paper) out.paper = b.paper === NONE ? null : b.paper
  if (a.needsFigure !== b.needsFigure) out.needsFigure = b.needsFigure
  if (a.objectiveId !== b.objectiveId) out.objectiveId = b.objectiveId === NONE ? null : Number(b.objectiveId)
  if (a.reviewNote !== b.reviewNote) out.reviewNote = b.reviewNote.trim() || null
  return out
}

function QuestionEditor({ id, onGone }: { id: number; onGone: () => void }) {
  const { data, loading, error } = useApi<BankQuestion | { question: BankQuestion }>(`/api/admin/questions/${id}`)
  const question = data && "question" in data ? data.question : (data as BankQuestion | undefined)

  if (error && !question) {
    return (
      <Card className="space-y-3 p-4">
        <ErrorNote message={error} />
        <Button variant="outline" size="sm" onClick={onGone}>Close</Button>
      </Card>
    )
  }
  if (!question || question.id !== id) {
    return <Card className="p-4">{loading ? <TableSkeleton rows={5} /> : null}</Card>
  }
  return <EditorBody key={`${question.id}:${question.status}:${question.reviewedAt}:${question.problems.join("|")}`} question={question} />
}

function EditorBody({ question }: { question: BankQuestion }) {
  const initial = useMemo(() => toForm(question), [question])
  const [form, setForm] = useState<Form>(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>()
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [training, setTraining] = useState(false)
  const [reviewError, setReviewError] = useState<AdminApiError>()
  const [rejecting, setRejecting] = useState(false)

  const patch = diffPayload(initial, form)
  const dirty = Object.keys(patch).length > 0
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const isApproved = question.status === "approved"

  const objectives = useApi<{ objectives: QuestionObjective[] } | QuestionObjective[]>(
    "/api/admin/question-objectives",
    { subjectId: question.subjectId },
  )
  const objectiveList = Array.isArray(objectives.data) ? objectives.data : objectives.data?.objectives ?? []
  const objectiveGroups = useMemo(() => {
    const groups = new Map<string, QuestionObjective[]>()
    objectiveList.forEach((o) => groups.set(o.topicName ?? "Other", [...(groups.get(o.topicName ?? "Other") ?? []), o]))
    return [...groups.entries()]
  }, [objectiveList])

  const save = async () => {
    setBusy(true)
    setFieldErrors(undefined)
    const r = await mutate<{ question: BankQuestion; reopened?: boolean }>(
      () => api.patch(`/api/admin/questions/${question.id}`, patch),
      "Question saved",
    )
    setBusy(false)
    if (!r.ok) setFieldErrors(r.error.errors)
  }

  const review = async (action: "approve" | "reject" | "reopen") => {
    setBusy(true)
    setReviewError(undefined)
    const r = await mutate(
      () => api.post(`/api/admin/questions/${question.id}/review`, {
        action,
        note: note.trim() || undefined,
        ...(action === "approve" ? { usableForTraining: training } : {}),
      }),
      action === "approve" ? "Question approved" : action === "reject" ? "Question rejected" : "Question moved back to draft",
    )
    setBusy(false)
    if (!r.ok) setReviewError(r.error)
    return r.ok
  }

  const err = (f: string) => fieldErrors?.[f]?.join(", ")
  const canApprove = question.status !== "approved" && question.problems.length === 0 && !dirty && !busy

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Question #{question.id}</h2>
        <Badge variant={question.status === "approved" ? "default" : question.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{question.status}</Badge>
        <Badge variant="outline">{question.source.replace("_", " ")}</Badge>
        {question.usableForTraining && <Badge variant="secondary">cleared for training</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">
          {question.contributedBy ? `from ${question.contributedBy}` : null}
          {question.sourceRef ? ` · ${question.sourceRef}` : null}
        </span>
      </div>

      {question.material?.extractionStatus === "needs_vision" && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span><span className="font-medium">Transcribed from an image — verify carefully.</span> Compare every number, sign and symbol with the original.</span>
        </div>
      )}

      {question.material && <SourcePanel materialId={question.material.id} filename={question.material.filename} />}

      <FormField label="Question text" error={err("stem")}>
        <Textarea className={MONO} rows={5} value={form.stem} onChange={(e) => set("stem", e.target.value)} />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Type" error={err("questionType")}>
          <Select value={form.questionType} onValueChange={(v) => set("questionType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["mcq", "short_answer", "structured", "essay", "comprehension"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Paper" error={err("paper")}>
          <Select value={form.paper} onValueChange={(v) => set("paper", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              <SelectItem value="paper1">Paper 1</SelectItem>
              <SelectItem value="paper2">Paper 2</SelectItem>
              <SelectItem value="sba">SBA</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Difficulty" error={err("difficulty")}>
          <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              <SelectItem value="1">1 — Easy</SelectItem>
              <SelectItem value="2">2 — Medium</SelectItem>
              <SelectItem value="3">3 — Hard</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {(form.questionType === "mcq" || form.options.length > 0) && (
        <FormField label="Options" error={err("options")}>
          <div className="space-y-2">
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input className="w-14" value={o.label} aria-label={`Option ${i + 1} label`}
                  onChange={(e) => set("options", form.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input className={MONO} value={o.text} aria-label={`Option ${i + 1} text`}
                  onChange={(e) => set("options", form.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" onClick={() => set("options", form.options.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => set("options", [...form.options, { label: String.fromCharCode(65 + form.options.length), text: "" }])}>
              Add option
            </Button>
          </div>
        </FormField>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <FormField label="Correct answer" error={err("correctAnswer")}>
          <Input className={MONO} value={form.correctAnswer} onChange={(e) => set("correctAnswer", e.target.value)} />
        </FormField>
        <FormField label="Marks" error={err("marks")}>
          <Input type="number" min={1} max={100} value={form.marks} onChange={(e) => set("marks", e.target.value)} />
        </FormField>
      </div>

      <FormField label="Solution steps (one per line)" error={err("solutionSteps")}>
        <Textarea className={MONO} rows={4} value={form.solutionSteps} onChange={(e) => set("solutionSteps", e.target.value)} />
      </FormField>
      <FormField label="Mark scheme" error={err("markScheme")}>
        <Textarea className={MONO} rows={3} value={form.markScheme} onChange={(e) => set("markScheme", e.target.value)} />
      </FormField>

      <FormField label="Syllabus objective" error={err("objectiveId")}>
        <Select value={form.objectiveId} onValueChange={(v) => set("objectiveId", v)}>
          <SelectTrigger><SelectValue placeholder="Select an objective" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={NONE}>Not mapped</SelectItem>
            {objectiveGroups.map(([topic, list]) => (
              <div key={topic}>
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{topic}</p>
                {list.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    <span className="font-mono text-xs">{o.code}</span> {o.text.length > 80 ? `${o.text.slice(0, 80)}…` : o.text}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.needsFigure} onCheckedChange={(v) => set("needsFigure", v === true)} />
        This question refers to a diagram or figure
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!dirty || busy || !form.stem.trim()}
          onClick={() => (isApproved ? setConfirmReopen(true) : save())}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Save changes
        </Button>
        {dirty && <Button variant="ghost" onClick={() => setForm(initial)} disabled={busy}>Discard</Button>}
        {dirty && <span className="text-xs text-muted-foreground">Save before reviewing.</span>}
      </div>

      <hr />

      <section className="space-y-3" aria-label="Review">
        <h3 className="text-sm font-semibold">Review</h3>
        {question.status !== "approved" && (
          question.problems.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {question.problems.map((p) => (
                <li key={p} className="flex items-start gap-2 text-amber-700 dark:text-amber-400"><Circle className="mt-1 size-3 shrink-0" /> {p}</li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-4" /> Nothing blocking approval.</p>
          )
        )}
        {question.reviewNote && question.status !== "draft" && (
          <p className="text-sm text-muted-foreground">Last note{question.reviewedBy ? ` (${question.reviewedBy})` : ""}: {question.reviewNote}</p>
        )}
        {reviewError && <ErrorNote message={reviewError.errors?.problems?.join(" · ") || reviewError.message} />}
        <FormField label="Review note (optional)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        {question.status !== "approved" && <TrainingCheckbox checked={training} onChange={setTraining} />}
        <div className="flex flex-wrap gap-2">
          {question.status !== "approved" && (
            <Button disabled={!canApprove} onClick={() => review("approve")}
              title={question.problems.length ? "Fix the listed problems first" : undefined}>
              Approve
            </Button>
          )}
          {question.status === "draft" && <Button variant="outline" disabled={busy || dirty} onClick={() => setRejecting(true)}>Reject</Button>}
          {question.status !== "draft" && <Button variant="outline" disabled={busy || dirty} onClick={() => review("reopen")}>Move back to draft</Button>}
        </div>
      </section>

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title="Save changes to an approved question?"
        description="Editing an approved question sends it back to draft. It will need to be approved again before students see it, and any training clearance is removed."
        confirmLabel="Save and return to draft"
        destructive={false}
        onConfirm={async () => { await save() }}
      />
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Reject this question?"
        description="Rejected questions are kept for the record but never shown to students. You can reopen it later."
        confirmLabel="Reject"
        onConfirm={async () => (await review("reject"))}
      />
    </Card>
  )
}

function SourcePanel({ materialId, filename }: { materialId: number; filename: string }) {
  const [open, setOpen] = useState(false)
  const { data, loading, error } = useApi<{ material: BankMaterial } | BankMaterial>(open ? `/api/admin/materials/${materialId}` : null)
  const material = data && "material" in data ? data.material : (data as BankMaterial | undefined)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm">
        <span>Source text <span className="text-muted-foreground">· {filename}</span></span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-3 py-2">
        {loading && !material ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        <ErrorNote message={error} />
        {material?.extractionStatus === "needs_vision" && (
          <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-400">This file was read from images. The text below is a transcription and may contain mistakes.</p>
        )}
        {material && (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">{material.text?.trim() || "(no extracted text)"}</pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
