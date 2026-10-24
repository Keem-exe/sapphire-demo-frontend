"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, FileUp, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, AdminApiError, type Page } from "@/lib/admin/api"
import { invalidate, useApi } from "@/lib/admin/use-api"
import type { IngestSubject, MaterialRecord, MaterialSource, SkippedFile, UploadResult } from "@/lib/admin/types"
import { EmptyState, ErrorNote, FormField, PageHeader, Pager, TableSkeleton, fmtDate } from "@/components/admin/common"
import { cn } from "@/lib/utils"

const MAX_FILES = 10
const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT = [".docx", ".pdf", ".png", ".jpg", ".jpeg", ".webp"]
const FAST_MS = 3000
const SLOW_MS = 8000
const SLOW_AFTER_MS = 60_000

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`
const extOf = (name: string) => name.slice(name.lastIndexOf(".")).toLowerCase()
const isActive = (m: MaterialRecord) => m.ingestStatus === "queued" || m.ingestStatus === "processing"
const rowsOf = (d: unknown): MaterialRecord[] => {
  const x = d as { items?: MaterialRecord[]; materials?: MaterialRecord[] } | MaterialRecord[] | undefined
  return Array.isArray(x) ? x : x?.items ?? x?.materials ?? []
}

function checkFile(f: File): string | null {
  const ext = extOf(f.name)
  if (ext === ".doc") return "Old .doc files are not supported. Re-save as .docx."
  if (!ACCEPT.includes(ext)) return `Unsupported type ${ext || "(none)"}. Use ${ACCEPT.join(", ")}.`
  if (f.size > MAX_BYTES) return `Too large (${mb(f.size)}). Limit is 20 MB per file.`
  if (f.size === 0) return "File is empty."
  return null
}

export default function UploadPage() {
  const subjects = useApi<{ subjects: IngestSubject[] }>("/api/admin/materials/subjects")
  const [subjectId, setSubjectId] = useState<string>()
  const [source, setSource] = useState<MaterialSource>("teacher")
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [skipped, setSkipped] = useState<SkippedFile[]>([])
  const [tracked, setTracked] = useState<number[]>([])
  const input = useRef<HTMLInputElement>(null)

  const addFiles = (incoming: FileList | File[]) => {
    const bad: { name: string; reason: string }[] = []
    const next = [...files]
    for (const f of Array.from(incoming)) {
      const reason = checkFile(f)
      if (reason) bad.push({ name: f.name, reason })
      else if (next.some((x) => x.name === f.name && x.size === f.size)) continue
      else if (next.length >= MAX_FILES) bad.push({ name: f.name, reason: `Only ${MAX_FILES} files per upload.` })
      else next.push(f)
    }
    setFiles(next)
    setRejected(bad)
  }

  const submit = async () => {
    if (!subjectId || files.length === 0) return
    setBusy(true)
    setError(undefined)
    setSkipped([])
    const form = new FormData()
    form.append("subjectId", subjectId)
    form.append("source", source)
    files.forEach((f) => form.append("files", f))
    try {
      const res = await api.post<UploadResult>("/api/admin/materials", form)
      setSkipped(res.data.skipped ?? [])
      setTracked(res.data.materials.map((m) => m.id))
      setFiles([])
      setRejected([])
      invalidate()
    } catch (e) {
      const err = e as AdminApiError
      setError(err.message)
      // 422 with nothing accepted still tells us why each file was skipped
      const detail = (err.errors as unknown as { skipped?: SkippedFile[] } | undefined)?.skipped
      if (Array.isArray(detail)) setSkipped(detail)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHeader
        title="Upload Material"
        description="Add teacher papers (Word, PDF or photos). Questions are extracted as drafts; nothing is approved until you review it."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader><CardTitle className="text-base">New upload</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Subject">
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full"><SelectValue placeholder={subjects.loading ? "Loading…" : "Choose a subject"} /></SelectTrigger>
                <SelectContent>
                  {subjects.data?.subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} disabled={!s.canIngest}>
                      {s.name}{!s.canIngest && " — Syllabus not loaded yet"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subjects.error && <p className="text-xs text-destructive">{subjects.error}</p>}
            </FormField>

            <FormField label="Material type">
              <Select value={source} onValueChange={(v) => setSource(v as MaterialSource)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher material</SelectItem>
                  <SelectItem value="cxc_specimen">CXC specimen paper</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div
              role="button"
              tabIndex={0}
              aria-label="Choose files to upload"
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
              )}
            >
              <FileUp className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">.docx, .pdf, .png, .jpg, .webp · up to {MAX_FILES} files, 20 MB each</p>
              <input
                ref={input}
                type="file"
                multiple
                hidden
                accept={ACCEPT.join(",")}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }}
              />
            </div>

            {rejected.length > 0 && (
              <ul className="space-y-1 text-sm text-destructive">
                {rejected.map((r, i) => (
                  <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><b>{r.name}</b>: {r.reason}</span></li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <ul className="divide-y rounded-md border text-sm">
                {files.map((f) => (
                  <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{mb(f.size)}</span>
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Remove ${f.name}`} disabled={busy}
                      onClick={() => setFiles(files.filter((x) => x !== f))}>
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <ErrorNote message={error} />
            <Button className="w-full" disabled={busy || !subjectId || files.length === 0} onClick={submit}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {skipped.length > 0 && <SkippedList items={skipped} />}
          {tracked.length > 0 && <Progress ids={tracked} />}
          <History subjects={subjects.data?.subjects} />
        </div>
      </div>
    </>
  )
}

function SkippedList({ items }: { items: SkippedFile[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Skipped files</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                <b>{s.filename}</b>: {s.reason}
                {s.existingMaterialId && (
                  <> · <Link className="text-primary hover:underline" href={`/admin/questions?materialId=${s.existingMaterialId}`}>view existing</Link></>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Polls the just-uploaded files every 3 s (8 s after a minute) until each is completed or failed. */
function Progress({ ids }: { ids: number[] }) {
  const [rows, setRows] = useState<MaterialRecord[]>([])
  const [error, setError] = useState<string>()
  const key = ids.join(",")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const started = Date.now()
    setRows([])
    const tick = async () => {
      let again = true
      try {
        const data = await api.get<unknown>("/api/admin/materials", { ids: key })
        if (cancelled) return
        const next = rowsOf(data)
        setRows(next)
        setError(undefined)
        again = next.length < ids.length || next.some(isActive)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message) // keep polling: a blip should not strand the page
      }
      if (again) timer = setTimeout(tick, Date.now() - started > SLOW_AFTER_MS ? SLOW_MS : FAST_MS)
      else invalidate() // refresh the history list once everything has settled
    }
    tick()
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const done = rows.length > 0 && rows.every((m) => !isActive(m))
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Processing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ErrorNote message={error} />
        {rows.length === 0 && !error && <TableSkeleton rows={2} />}
        <ul className="divide-y">{rows.map((m) => <MaterialRow key={m.id} m={m} />)}</ul>
        {done && (
          <p className="text-sm text-muted-foreground">
            Nothing is approved automatically. Every question stays a draft until you approve it and tick &ldquo;usable for training&rdquo; in the{" "}
            <Link className="text-primary hover:underline" href="/admin/questions">review queue</Link>.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function MaterialRow({ m }: { m: MaterialRecord }) {
  return (
    <li className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
        {m.extractionStatus === "needs_vision" && (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400">Check carefully</Badge>
        )}
        {m.ingestStatus === "queued" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="size-4" /> Waiting</span>}
        {m.ingestStatus === "processing" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Processing</span>}
        {m.ingestStatus === "completed" && (
          (m.questionsCreated ?? 0) > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-4" /> {m.questionsCreated} questions ready</span>
              <Button asChild size="sm" variant="outline"><Link href={`/admin/questions?materialId=${m.id}&status=draft`}>Review</Link></Button>
            </>
          ) : (
            <span className="text-muted-foreground">No questions were found in this file</span>
          )
        )}
        {m.ingestStatus === "failed" && <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-4" /> Failed</span>}
      </div>
      {m.ingestStatus === "failed" && (
        <p className="text-destructive">
          {m.error || "Processing failed."} <span className="text-muted-foreground">Uploading the same file again retries it.</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">{fmtDate(m.createdAt)}</p>
    </li>
  )
}

function History({ subjects }: { subjects?: IngestSubject[] }) {
  const [subject, setSubject] = useState("all")
  const [failedOnly, setFailedOnly] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [subject, failedOnly])

  const list = useApi<Page<MaterialRecord>>(
    "/api/admin/materials",
    { subjectId: subject === "all" ? undefined : subject, status: failedOnly ? "failed" : undefined, page, per_page: 10 },
  )
  const items = rowsOf(list.data)

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Upload history</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={failedOnly ? "secondary" : "ghost"} className="h-8" onClick={() => setFailedOnly(!failedOnly)}>Failed only</Button>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects?.filter((s) => s.canIngest).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6"><ErrorNote message={list.error} /></div>
        {list.loading && !list.data ? <TableSkeleton rows={3} /> : items.length === 0 ? (
          <EmptyState title={failedOnly ? "No failed uploads" : "No uploads yet"} />
        ) : (
          <div className="divide-y px-6">
            {items.map((m) => <ul key={m.id}><MaterialRow m={m} /></ul>)}
          </div>
        )}
        <Pager pagination={list.data?.pagination} onPage={setPage} />
      </CardContent>
    </Card>
  )
}
