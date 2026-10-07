"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/admin/api"
import type { AdminApiError, Page } from "@/lib/admin/api"
import { fieldError, mutate } from "@/lib/admin/mutate"
import type { Reel, Subject, Topic } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { ConfirmDialog, EmptyState, ErrorNote, FormDialog, FormField, PageHeader, Pager, TableSkeleton } from "@/components/admin/common"

const ALL = "all"
const NONE = "none"
const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

export default function ReelsPage() {
  const [subjectId, setSubjectId] = useState(ALL)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Reel | "new" | null>(null)
  const [deleting, setDeleting] = useState<Reel | null>(null)
  useEffect(() => setPage(1), [subjectId])

  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const { data, loading, error } = useApi<Page<Reel>>("/api/admin/reels", { page, per_page: 20, subjectId: subjectId === ALL ? undefined : subjectId })
  const subjectName = (id: number) => subjects.data?.subjects.find((s) => s.id === id)?.name ?? `#${id}`

  return (
    <>
      <PageHeader title="Reels" description="Video content library." actions={<Button onClick={() => setEditing("new")}><Plus className="size-4" /> Add reel</Button>} />
      <div className="mb-4">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ErrorNote message={error} />
      <Card className="mt-4 overflow-hidden p-0">
        {loading && !data ? <TableSkeleton /> : data?.items.length === 0 ? <EmptyState title="No reels" hint="Add a reel to populate the library." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Reel</TableHead><TableHead>Subject / topic</TableHead><TableHead>Duration</TableHead><TableHead>Views</TableHead><TableHead>Likes</TableHead><TableHead>Saves</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {data?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {r.thumbnailUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-muted" />}
                      <a href={r.videoUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">{r.title}</a>
                    </div>
                  </TableCell>
                  <TableCell>{subjectName(r.subjectId)}{r.topicName && <Badge variant="outline" className="ml-2">{r.topicName}</Badge>}</TableCell>
                  <TableCell className="tabular-nums">{fmtDuration(r.duration)}</TableCell>
                  <TableCell className="tabular-nums">{r.viewCount}</TableCell>
                  <TableCell className="tabular-nums">{r.likeCount}</TableCell>
                  <TableCell className="tabular-nums">{r.saveCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(r)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager pagination={data?.pagination} onPage={setPage} />
      </Card>
      {editing && <ReelDialog reel={editing === "new" ? undefined : editing} subjects={subjects.data?.subjects ?? []} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete "${deleting?.title}"?`}
        onConfirm={async () => (await mutate(() => api.del(`/api/admin/reels/${deleting!.id}`), "Reel deleted")).ok} />
    </>
  )
}

function ReelDialog({ reel, subjects, onOpenChange }: { reel?: Reel; subjects: Subject[]; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({
    subjectId: reel ? String(reel.subjectId) : "",
    topicId: reel?.topicId ? String(reel.topicId) : NONE,
    title: reel?.title ?? "",
    description: reel?.description ?? "",
    videoUrl: reel?.videoUrl ?? "",
    thumbnailUrl: reel?.thumbnailUrl ?? "",
    duration: reel ? String(reel.duration) : "",
  })
  const [points, setPoints] = useState<string[]>(reel?.keyPoints ?? [])
  const [draft, setDraft] = useState("")
  const [err, setErr] = useState<AdminApiError>()
  const topics = useApi<{ topics: Topic[] }>(f.subjectId ? "/api/admin/topics" : null, { subjectId: f.subjectId })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const addPoint = () => {
    const p = draft.trim()
    if (p && !points.includes(p)) setPoints([...points, p])
    setDraft("")
  }

  return (
    <FormDialog open onOpenChange={onOpenChange} wide title={reel ? "Edit reel" : "Add reel"} submitLabel={reel ? "Save" : "Create"}
      onSubmit={async () => {
        if (!f.subjectId) return false
        const body = {
          subjectId: Number(f.subjectId),
          topicId: f.topicId === NONE ? null : Number(f.topicId),
          title: f.title,
          description: f.description,
          videoUrl: f.videoUrl,
          thumbnailUrl: f.thumbnailUrl || null,
          duration: Number(f.duration),
          keyPoints: Array.from(new Set([...points, ...(draft.trim() ? [draft.trim()] : [])])),
        }
        const r = reel
          ? await mutate(() => api.patch(`/api/admin/reels/${reel.id}`, body), "Reel updated")
          : await mutate(() => api.post("/api/admin/reels", body), "Reel created")
        if (!r.ok) setErr(r.error)
        return r.ok
      }}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Subject" error={fieldError(err, "subjectId")}>
          <Select value={f.subjectId} onValueChange={(v) => setF({ ...f, subjectId: v, topicId: NONE })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Topic (optional)" error={fieldError(err, "topicId")}>
          <Select value={f.topicId} onValueChange={(v) => setF({ ...f, topicId: v })} disabled={!f.subjectId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No topic</SelectItem>
              {topics.data?.topics.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField label="Title" error={fieldError(err, "title")}><Input required value={f.title} onChange={set("title")} /></FormField>
      <FormField label="Description" error={fieldError(err, "description")}><Textarea value={f.description} onChange={set("description")} /></FormField>
      <FormField label="Video URL" error={fieldError(err, "videoUrl")}><Input required type="url" value={f.videoUrl} onChange={set("videoUrl")} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Thumbnail URL (optional)" error={fieldError(err, "thumbnailUrl")}><Input type="url" value={f.thumbnailUrl} onChange={set("thumbnailUrl")} /></FormField>
        <FormField label="Duration (seconds)" error={fieldError(err, "duration")}><Input required type="number" min={1} value={f.duration} onChange={set("duration")} /></FormField>
      </div>
      <FormField label="Key points" error={fieldError(err, "keyPoints")}>
        <div className="flex flex-wrap gap-1.5">
          {points.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1">{p}<button type="button" aria-label={`Remove ${p}`} onClick={() => setPoints(points.filter((x) => x !== p))}><X className="size-3" /></button></Badge>
          ))}
        </div>
        <Input placeholder="Type a key point and press Enter" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint() } }} onBlur={addPoint} />
      </FormField>
    </FormDialog>
  )
}
