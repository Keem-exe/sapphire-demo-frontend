"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, type AdminApiError, type Page } from "@/lib/admin/api"
import { invalidate, useApi } from "@/lib/admin/use-api"
import type { DialogueSource, DialogueUploadResult, Subject } from "@/lib/admin/types"
import { EmptyState, ErrorNote, FormField, Pager, TableSkeleton, fmtDate } from "@/components/admin/common"
import { FileDropzone } from "@/components/admin/file-dropzone"

const ACCEPT = [".txt", ".md", ".docx", ".vtt", ".srt", ".json"]
const FAST_MS = 3000
const SLOW_MS = 8000
const SLOW_AFTER_MS = 60_000
const CONSENT_TEXT =
  "Everyone in these recordings (and a parent or guardian for students under 18) agreed to the session being recorded and used to train the AI tutor."

type Role = "auto" | "tutor" | "student"
type Speaker = { label: string; role: Role }
type Skipped = { filename: string; reason: string; existingSourceId?: number }

const isActive = (s: DialogueSource) => s.ingestStatus === "queued" || s.ingestStatus === "processing"
const rowsOf = (d: unknown): DialogueSource[] => {
  const x = d as { items?: DialogueSource[]; sources?: DialogueSource[] } | DialogueSource[] | undefined
  return Array.isArray(x) ? x : x?.items ?? x?.sources ?? []
}

/** "31 names, 1 phone number removed" from { name: 31, phone: 1, email: 0 } */
function describeRedactions(r?: Record<string, number> | null) {
  const label: Record<string, [string, string]> = { name: ["name", "names"], phone: ["phone number", "phone numbers"], email: ["email", "emails"] }
  const parts = Object.entries(r ?? {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${(label[k] ?? [k, k + "s"])[n === 1 ? 0 : 1]}`)
  return parts.length ? `${parts.join(", ")} removed` : "Nothing needed removing"
}

export function UploadTab() {
  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const [subjectId, setSubjectId] = useState<string>()
  const [origin, setOrigin] = useState<"recording" | "written">("recording")
  const [files, setFiles] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [consentNote, setConsentNote] = useState("")
  const [redact, setRedact] = useState("")
  const [speakers, setSpeakers] = useState<[Speaker, Speaker]>([{ label: "Speaker 1", role: "auto" }, { label: "Speaker 2", role: "auto" }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [skipped, setSkipped] = useState<Skipped[]>([])
  const [tracked, setTracked] = useState<number[]>([])
  const [speakerHint, setSpeakerHint] = useState(false)

  const setSpeaker = (i: 0 | 1, patch: Partial<Speaker>) =>
    setSpeakers((s) => (i === 0 ? [{ ...s[0], ...patch }, s[1]] : [s[0], { ...s[1], ...patch }]))

  const submit = async () => {
    if (!subjectId || !consent || files.length === 0) return
    setBusy(true)
    setError(undefined)
    setSkipped([])
    const form = new FormData()
    form.append("subjectId", subjectId)
    form.append("consentConfirmed", "true")
    if (consentNote.trim()) form.append("consentNote", consentNote.trim().slice(0, 255))
    form.append("origin", origin)
    if (redact.trim()) form.append("redactNames", redact.trim())
    const map = Object.fromEntries(speakers.filter((s) => s.role !== "auto" && s.label.trim()).map((s) => [s.label.trim(), s.role]))
    if (Object.keys(map).length) form.append("speakerMap", JSON.stringify(map))
    files.forEach((f) => form.append("files", f))
    try {
      const res = await api.post<DialogueUploadResult>("/api/admin/dialogues", form)
      setSkipped(res.data.skipped ?? [])
      setTracked(res.data.sources.map((s) => s.id))
      setFiles([])
      setSpeakerHint(false)
      invalidate()
    } catch (e) {
      const err = e as AdminApiError
      setError(err.message)
      const detail = (err.errors as unknown as { skipped?: Skipped[] } | undefined)?.skipped
      if (Array.isArray(detail)) setSkipped(detail)
    }
    setBusy(false)
  }

  /** The tool labelled speakers in a way we could not map: reopen the form with the labels from the error. */
  const fixSpeakers = (message: string) => {
    const labels = Array.from(message.matchAll(/["'“‘]([^"'”’]{1,60})["'”’]/g)).map((m) => m[1])
    if (labels.length >= 2) setSpeakers([{ label: labels[0], role: "auto" }, { label: labels[1], role: "auto" }])
    setSpeakerHint(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader><CardTitle className="text-base">New transcripts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload transcripts of tutoring sessions. Personal details are scrubbed automatically, then each session is split into conversations for you to review.
            Tutors can follow <b>TUTOR_RECORDING_GUIDE.md</b> in the backend repo.
          </p>

          <FormField label="Subject">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={subjects.loading ? "Loading…" : "Choose a subject"} /></SelectTrigger>
              <SelectContent>{subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>

          <FormField label="Where did it come from?">
            <Select value={origin} onValueChange={(v) => setOrigin(v as typeof origin)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recording">A recorded session</SelectItem>
                <SelectItem value="written">A script written by a tutor</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FileDropzone files={files} onChange={setFiles} accept={ACCEPT} disabled={busy} />

          <FormField label="Names to remove (strongly recommended)">
            <Textarea
              value={redact}
              onChange={(e) => setRedact(e.target.value)}
              placeholder={"The student's name, the tutor's name, school, town: one per line or separated by commas"}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Each is replaced with [NAME] everywhere, including the file name.</p>
          </FormField>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Who is speaking? <span className="font-normal text-muted-foreground">(only if the transcript just says &ldquo;Speaker 1/2&rdquo;)</span></p>
            {speakerHint && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Pick who is the tutor and who is the student below, then choose the same file again and upload it to retry.
              </p>
            )}
            {([0, 1] as const).map((i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Input className="h-8 w-36" value={speakers[i].label} onChange={(e) => setSpeaker(i, { label: e.target.value })} aria-label={`Label for speaker ${i + 1}`} />
                <span className="text-muted-foreground">is the</span>
                <Select value={speakers[i].role} onValueChange={(v) => setSpeaker(i, { role: v as Role })}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Detect automatically</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(c) => setConsent(c === true)} />
              <span>{CONSENT_TEXT}</span>
            </label>
            <Input value={consentNote} maxLength={255} onChange={(e) => setConsentNote(e.target.value)} placeholder="Consent note (optional), e.g. signed forms in folder X" />
          </div>

          <ErrorNote message={error} />
          <Button className="w-full" disabled={busy || !subjectId || !consent || files.length === 0} onClick={submit}>
            {busy && <Loader2 className="size-4 animate-spin" />} Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {skipped.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Skipped files</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {skipped.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>
                      <b>{s.filename}</b>: {s.reason}
                      {s.existingSourceId && <> · <Link className="text-primary hover:underline" href={`/admin/dialogues?tab=review&sourceId=${s.existingSourceId}`}>view existing</Link></>}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {tracked.length > 0 && <Progress ids={tracked} onFixSpeakers={fixSpeakers} />}
        <History subjects={subjects.data?.subjects} onFixSpeakers={fixSpeakers} />
      </div>
    </div>
  )
}

function Progress({ ids, onFixSpeakers }: { ids: number[]; onFixSpeakers: (m: string) => void }) {
  const [rows, setRows] = useState<DialogueSource[]>([])
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
        const next = rowsOf(await api.get<unknown>("/api/admin/dialogue-sources", { ids: key }))
        if (cancelled) return
        setRows(next)
        setError(undefined)
        again = next.length < ids.length || next.some(isActive)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
      }
      if (again) timer = setTimeout(tick, Date.now() - started > SLOW_AFTER_MS ? SLOW_MS : FAST_MS)
      else invalidate()
    }
    tick()
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Processing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ErrorNote message={error} />
        {rows.length === 0 && !error && <TableSkeleton rows={2} />}
        <div className="divide-y">{rows.map((s) => <ul key={s.id}><SourceRow s={s} onFixSpeakers={onFixSpeakers} /></ul>)}</div>
        {rows.length > 0 && rows.every((s) => !isActive(s)) && (
          <p className="text-sm text-muted-foreground">Nothing is approved automatically. Review each conversation in the Review tab.</p>
        )}
      </CardContent>
    </Card>
  )
}

function SourceRow({ s, onFixSpeakers }: { s: DialogueSource; onFixSpeakers: (m: string) => void }) {
  const speakerError = s.ingestStatus === "failed" && /tell who is the tutor/i.test(s.error ?? "")
  return (
    <li className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{s.filename}</span>
        {s.ingestStatus === "queued" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="size-4" /> Waiting</span>}
        {s.ingestStatus === "processing" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Processing</span>}
        {s.ingestStatus === "completed" && (
          (s.dialoguesCreated ?? 0) > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-4" /> {s.dialoguesCreated} conversations ready</span>
              <Button asChild size="sm" variant="outline"><Link href={`/admin/dialogues?tab=review&sourceId=${s.id}&status=draft`}>Review</Link></Button>
            </>
          ) : (
            <span className="text-muted-foreground">No conversations were found in this file</span>
          )
        )}
        {s.ingestStatus === "failed" && <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-4" /> Failed</span>}
      </div>
      {s.ingestStatus === "completed" && (
        <p className="text-xs text-muted-foreground">{s.turnCount ?? 0} turns · {describeRedactions(s.redactions)}</p>
      )}
      {s.ingestStatus === "failed" && (
        <div className="space-y-1">
          <p className="text-destructive">{s.error || "Processing failed."} <span className="text-muted-foreground">Uploading the same file again retries it.</span></p>
          {speakerError && <Button size="sm" variant="outline" onClick={() => onFixSpeakers(s.error ?? "")}>Set who is speaking</Button>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</p>
    </li>
  )
}

function History({ subjects, onFixSpeakers }: { subjects?: Subject[]; onFixSpeakers: (m: string) => void }) {
  const [subject, setSubject] = useState("all")
  const [failedOnly, setFailedOnly] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [subject, failedOnly])
  const list = useApi<Page<DialogueSource>>("/api/admin/dialogue-sources", {
    subjectId: subject === "all" ? undefined : subject,
    status: failedOnly ? "failed" : undefined,
    page,
    per_page: 10,
  })
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
              {subjects?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6"><ErrorNote message={list.error} /></div>
        {list.loading && !list.data ? <TableSkeleton rows={3} /> : items.length === 0 ? (
          <EmptyState title={failedOnly ? "No failed uploads" : "No transcripts yet"} />
        ) : (
          <div className="divide-y px-6">{items.map((s) => <ul key={s.id}><SourceRow s={s} onFixSpeakers={onFixSpeakers} /></ul>)}</div>
        )}
        <Pager pagination={list.data?.pagination} onPage={setPage} />
      </CardContent>
    </Card>
  )
}
