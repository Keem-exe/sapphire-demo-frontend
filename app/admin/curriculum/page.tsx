"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/admin/api"
import { fieldError, mutate } from "@/lib/admin/mutate"
import type { AdminApiError } from "@/lib/admin/api"
import type { Subject, Topic } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { ConfirmDialog, EmptyState, ErrorNote, FormDialog, FormField, PageHeader, TableSkeleton } from "@/components/admin/common"

export default function CurriculumPage() {
  return (
    <>
      <PageHeader title="Curriculum" description="Subjects and their topics." />
      <Tabs defaultValue="subjects">
        <TabsList><TabsTrigger value="subjects">Subjects</TabsTrigger><TabsTrigger value="topics">Topics</TabsTrigger></TabsList>
        <TabsContent value="subjects"><SubjectsTab /></TabsContent>
        <TabsContent value="topics"><TopicsTab /></TabsContent>
      </Tabs>
    </>
  )
}

function SubjectsTab() {
  const { data, loading, error } = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const [editing, setEditing] = useState<Subject | "new" | null>(null)
  const [deleting, setDeleting] = useState<Subject | null>(null)

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="size-4" /> Add subject</Button></div>
      <ErrorNote message={error} />
      <Card className="overflow-hidden p-0">
        {loading && !data ? <TableSkeleton rows={4} /> : data?.subjects.length === 0 ? <EmptyState title="No subjects yet" hint="Add the first subject to get started." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Code</TableHead><TableHead>Color</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {data?.subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.icon} {s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-2 text-xs"><span className="size-4 rounded border" style={{ background: s.color }} />{s.color}</span></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(s)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {editing && <SubjectDialog subject={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.name}?`}
        description="This also deletes the subject's topics, enrollments and reels. This action cannot be undone."
        onConfirm={async () => (await mutate(() => api.del(`/api/admin/subjects/${deleting!.id}`), "Subject deleted")).ok} />
    </div>
  )
}

function SubjectDialog({ subject, onOpenChange }: { subject?: Subject; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ name: subject?.name ?? "", icon: subject?.icon ?? "", color: subject?.color ?? "#3b82f6" })
  const [err, setErr] = useState<AdminApiError>()
  return (
    <FormDialog open onOpenChange={onOpenChange} title={subject ? "Edit subject" : "Add subject"} submitLabel={subject ? "Save" : "Create"}
      onSubmit={async () => {
        const r = subject
          ? await mutate(() => api.patch(`/api/admin/subjects/${subject.id}`, f), "Subject updated")
          : await mutate(() => api.post("/api/admin/subjects", f), "Subject created")
        if (!r.ok) setErr(r.error)
        return r.ok
      }}>
      <FormField label="Name" error={fieldError(err, "name")}><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
      <FormField label="Icon (emoji or short text)" error={fieldError(err, "icon")}><Input required maxLength={8} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} /></FormField>
      <FormField label="Color" error={fieldError(err, "color")}>
        <div className="flex gap-2">
          <input type="color" aria-label="Color picker" className="h-9 w-12 cursor-pointer rounded border bg-transparent" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
          <Input value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="font-mono" />
        </div>
      </FormField>
    </FormDialog>
  )
}

const ALL = "all"

function TopicsTab() {
  const [subjectId, setSubjectId] = useState(ALL)
  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const { data, loading, error } = useApi<{ topics: Topic[] }>("/api/admin/topics", { subjectId: subjectId === ALL ? undefined : subjectId })
  const [editing, setEditing] = useState<Topic | "new" | null>(null)
  const [deleting, setDeleting] = useState<Topic | null>(null)
  const subjectName = (id: number) => subjects.data?.subjects.find((s) => s.id === id)?.name ?? `#${id}`

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing("new")}><Plus className="size-4" /> Add topic</Button>
      </div>
      <ErrorNote message={error} />
      <Card className="overflow-hidden p-0">
        {loading && !data ? <TableSkeleton rows={4} /> : data?.topics.length === 0 ? <EmptyState title="No topics" hint="Add a topic to a subject." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Subject</TableHead><TableHead>Description</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {data?.topics.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{subjectName(t.subjectId)}</TableCell>
                  <TableCell className="max-w-sm truncate text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(t)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {editing && <TopicDialog topic={editing === "new" ? undefined : editing} subjects={subjects.data?.subjects ?? []} defaultSubjectId={subjectId === ALL ? undefined : subjectId} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete ${deleting?.name}?`}
        onConfirm={async () => (await mutate(() => api.del(`/api/admin/topics/${deleting!.id}`), "Topic deleted")).ok} />
    </div>
  )
}

function TopicDialog({ topic, subjects, defaultSubjectId, onOpenChange }: { topic?: Topic; subjects: Subject[]; defaultSubjectId?: string; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ subjectId: topic ? String(topic.subjectId) : defaultSubjectId ?? "", name: topic?.name ?? "", description: topic?.description ?? "" })
  const [err, setErr] = useState<AdminApiError>()
  return (
    <FormDialog open onOpenChange={onOpenChange} title={topic ? "Edit topic" : "Add topic"} submitLabel={topic ? "Save" : "Create"}
      onSubmit={async () => {
        if (!f.subjectId) return false
        const body = { ...f, subjectId: Number(f.subjectId) }
        const r = topic
          ? await mutate(() => api.patch(`/api/admin/topics/${topic.id}`, body), "Topic updated")
          : await mutate(() => api.post("/api/admin/topics", body), "Topic created")
        if (!r.ok) setErr(r.error)
        return r.ok
      }}>
      <FormField label="Subject" error={fieldError(err, "subjectId")}>
        <Select value={f.subjectId} onValueChange={(v) => setF({ ...f, subjectId: v })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a subject" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label="Name" error={fieldError(err, "name")}><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
      <FormField label="Description" error={fieldError(err, "description")}><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></FormField>
    </FormDialog>
  )
}
