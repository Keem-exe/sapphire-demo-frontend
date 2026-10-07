"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Page } from "@/lib/admin/api"
import type { RiskIndicator, RiskLevel, Subject } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, PageHeader, Pager, RiskBadge, TableSkeleton, UserLink, fmtDay } from "@/components/admin/common"

const ALL = "all"
const RISK_TYPES = ["low_engagement", "declining_performance", "knowledge_gap", "struggling"]
const pretty = (s: string) => s.replaceAll("_", " ")

export default function IntelligencePage() {
  return (
    <Suspense>
      <Intelligence />
    </Suspense>
  )
}

function Intelligence() {
  const sp = useSearchParams()
  const [level, setLevel] = useState(sp.get("riskLevel") ?? ALL)
  const [type, setType] = useState(ALL)
  const [active, setActive] = useState("active")
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [level, type, active])

  const risks = useApi<Page<RiskIndicator>>("/api/admin/analytics/risks", {
    page,
    per_page: 20,
    riskLevel: level === ALL ? undefined : level,
    riskType: type === ALL ? undefined : type,
    isActive: active === "active",
  })

  return (
    <>
      <PageHeader title="Intelligence" description="Signals from the adaptive learning engine, platform-wide." />
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <MasteryCard />
          <StrugglingCard />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Risk indicators</CardTitle></CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="flex flex-wrap gap-3 px-6">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All levels</SelectItem>
                  {(["critical", "high", "medium", "low"] as RiskLevel[]).map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {RISK_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{pretty(t)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={active} onValueChange={setActive}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
              </Select>
            </div>
            <ErrorNote message={risks.error} />
            {risks.loading && !risks.data ? <TableSkeleton /> : risks.data?.items.length === 0 ? (
              <EmptyState title="No active risk indicators" hint="Nothing needs attention right now." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Recommended action</TableHead><TableHead>Detected</TableHead></TableRow></TableHeader>
                <TableBody>
                  {risks.data?.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><RiskBadge level={r.riskLevel} /></TableCell>
                      <TableCell><UserLink id={r.userId} name={r.userName} /></TableCell>
                      <TableCell className="capitalize">{pretty(r.riskType)}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal">{r.description}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal text-muted-foreground">{r.recommendedAction ?? "—"}</TableCell>
                      <TableCell>{fmtDay(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pager pagination={risks.data?.pagination} onPage={setPage} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

const MASTERY: [keyof Mastery, string, string][] = [
  ["notStarted", "Not started", "var(--muted-foreground)"],
  ["learning", "Learning", "#3b82f6"],
  ["reviewing", "Reviewing", "#eab308"],
  ["mastered", "Mastered", "#10b981"],
  ["needsReview", "Needs review", "#f97316"],
]
type Mastery = { notStarted: number; learning: number; reviewing: number; mastered: number; needsReview: number }

function MasteryCard() {
  const [subjectId, setSubjectId] = useState(ALL)
  const subjects = useApi<{ subjects: Subject[] }>("/api/admin/subjects")
  const { data, error } = useApi<Mastery>("/api/admin/analytics/mastery-distribution", { subjectId: subjectId === ALL ? undefined : subjectId })
  const rows = MASTERY.map(([k, name, color]) => ({ name, color, value: data?.[k] ?? 0 }))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Mastery distribution</CardTitle>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.data?.subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-64">
        {error ? <ErrorNote message={error} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 16, right: 16 }}>
              <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={90} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>{rows.map((r) => <Cell key={r.name} fill={r.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function StrugglingCard() {
  const { data, loading, error } = useApi<{ topics: { topicId: number; topicName: string; subjectId: number; averageMastery: number; studentCount: number }[] }>("/api/admin/analytics/struggling-topics", { limit: 10 })
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Struggling topics</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ErrorNote message={error} />
        {loading && !data ? <TableSkeleton rows={4} /> : data?.topics.length === 0 ? <EmptyState title="No struggling topics" /> : (
          <Table>
            <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Topic</TableHead><TableHead>Avg mastery</TableHead><TableHead>Students</TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.topics.map((t, i) => (
                <TableRow key={t.topicId}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{t.topicName}</TableCell>
                  <TableCell className="tabular-nums">{t.averageMastery.toFixed(2)}</TableCell>
                  <TableCell className="tabular-nums">{t.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
