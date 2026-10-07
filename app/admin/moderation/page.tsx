"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/admin/api"
import type { Page } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import type { Subject } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { ConfirmDialog, EmptyState, ErrorNote, PageHeader, Pager, TableSkeleton, UserLink, fmtDay } from "@/components/admin/common"

const ALL = "all"

interface Note { id: number; userId: number; subjectId: number; title: string; content?: string; createdAt: string }
interface Quiz { id: number; userId: number; subjectId: number; title: string; difficulty?: string; totalQuestions: number; score?: number | null; isCompleted: boolean; createdAt: string }
interface FlashSet { id: number; userId: number; subjectId: number; title: string; totalCards: number; createdAt: string }

export default function ModerationPage() {
  return (
    <Suspense>
      <Moderation />
    </Suspense>
  )
}

function Moderation() {
  const router = useRouter()
  const sp = useSearchParams()
  const tab = sp.get("tab") ?? "notes"
  const userId = sp.get("userId") ?? undefined
  const [subjectId, setSubjectId] = useState(ALL)
  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")

  const setParams = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    router.replace(`/admin/moderation?${p.toString()}`)
  }
  const filters = { userId, subjectId: subjectId === ALL ? undefined : subjectId }
  const subjectName = (id: number) => subjects.data?.subjects.find((s) => s.id === id)?.name ?? `#${id}`

  return (
    <>
      <PageHeader title="Content Moderation" description="User-generated content. Admins can view metadata and delete, not edit." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {userId && <Badge variant="secondary" className="gap-1">User #{userId}<button aria-label="Clear user filter" onClick={() => setParams({ userId: undefined })}><X className="size-3" /></button></Badge>}
      </div>
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcard Sets</TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
          <Listing<Note> path="/api/admin/notes" filters={filters} noun="note" deletePath="/api/admin/notes"
            columns={["Title", "User", "Subject", "Created"]}
            row={(n, expanded, toggle) => (
              <>
                <TableCell>
                  <p className="font-medium">{n.title}</p>
                  {n.content !== undefined && (
                    <button className="mt-0.5 block max-w-md text-left text-xs text-muted-foreground" onClick={toggle}>
                      {expanded ? <span className="whitespace-pre-wrap">{n.content}</span> : <span className="line-clamp-1">{n.content.slice(0, 120) || "(empty)"} <span className="text-primary">view full content</span></span>}
                    </button>
                  )}
                </TableCell>
                <TableCell><UserLink id={n.userId} /></TableCell>
                <TableCell>{subjectName(n.subjectId)}</TableCell>
                <TableCell>{fmtDay(n.createdAt)}</TableCell>
              </>
            )} />
        </TabsContent>
        <TabsContent value="quizzes">
          <Listing<Quiz> path="/api/admin/quizzes" filters={filters} noun="quiz" deletePath="/api/admin/quizzes"
            columns={["Title", "User", "Subject", "Difficulty", "Questions", "Score", "Created"]}
            row={(q) => (
              <>
                <TableCell className="font-medium">{q.title}</TableCell>
                <TableCell><UserLink id={q.userId} /></TableCell>
                <TableCell>{subjectName(q.subjectId)}</TableCell>
                <TableCell className="capitalize">{q.difficulty ?? "—"}</TableCell>
                <TableCell>{q.totalQuestions}</TableCell>
                <TableCell>{q.isCompleted ? q.score ?? "—" : <Badge variant="outline">In progress</Badge>}</TableCell>
                <TableCell>{fmtDay(q.createdAt)}</TableCell>
              </>
            )} />
        </TabsContent>
        <TabsContent value="flashcards">
          <Listing<FlashSet> path="/api/admin/flashcard-sets" filters={filters} noun="flashcard set" deletePath="/api/admin/flashcard-sets"
            columns={["Title", "User", "Subject", "Cards", "Created"]}
            row={(s) => (
              <>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell><UserLink id={s.userId} /></TableCell>
                <TableCell>{subjectName(s.subjectId)}</TableCell>
                <TableCell>{s.totalCards}</TableCell>
                <TableCell>{fmtDay(s.createdAt)}</TableCell>
              </>
            )} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function Listing<T extends { id: number }>({ path, filters, noun, deletePath, columns, row }: {
  path: string
  filters: { userId?: string; subjectId?: string }
  noun: string
  deletePath: string
  columns: string[]
  row: (item: T, expanded: boolean, toggle: () => void) => React.ReactNode
}) {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  useEffect(() => setPage(1), [filters.userId, filters.subjectId])
  const { data, loading, error } = useApi<Page<T>>(path, { page, per_page: 20, ...filters })

  return (
    <div className="mt-4 space-y-4">
      <ErrorNote message={error} />
      <Card className="overflow-hidden p-0">
        {loading && !data ? <TableSkeleton /> : data?.items.length === 0 ? <EmptyState title={`No ${noun}s found`} /> : (
          <Table>
            <TableHeader><TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}<TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {data?.items.map((item) => (
                <TableRow key={item.id}>
                  {row(item, expanded === item.id, () => setExpanded(expanded === item.id ? null : item.id))}
                  <TableCell><Button variant="ghost" size="icon" aria-label={`Delete ${noun}`} onClick={() => setDeleting(item)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager pagination={data?.pagination} onPage={setPage} />
      </Card>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete this ${noun}?`}
        onConfirm={async () => (await mutate(() => api.del(`${deletePath}/${deleting!.id}`), `${noun} deleted`)).ok} />
    </div>
  )
}
