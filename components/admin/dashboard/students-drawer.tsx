"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Page } from "@/lib/admin/api"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, Pager, StatusBadge, TableSkeleton, fmtDate, useDebounce } from "@/components/admin/common"
import { DetailSheet, StudentName, num, pct, secsToHours } from "./primitives"

interface StudentRow {
  id: number
  name: string
  email: string
  accountStatus: "active" | "suspended"
  registeredAt: string
  lastLoginAt: string | null
  lastActive: string | null
  currentStreak: number | null
  longestStreak: number | null
  totalStudySeconds: number | null
  sessionsThisWeek: number | null
  sessionsThisMonth: number | null
  diagnosticStatus: "not_started" | "in_progress" | "completed" | "abandoned"
  mostUsedFeatureLabel: string | null
  progressPercent: number | null
  deviceType: string | null
}

/** User Activity table + searchable Student Management directory (same endpoint). */
export function StudentsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("recent")
  const [page, setPage] = useState(1)
  const q = useDebounce(search)
  const { data, loading, error } = useApi<Page<StudentRow>>(open ? "/api/admin/students" : null, { page, per_page: 15, search: q, sort })

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Students" description="User activity and student directory. Click a name for the full profile." wide>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently active</SelectItem>
            <SelectItem value="newest">Newest signups</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ErrorNote message={error} />
      <div className="rounded-md border">
        {loading && !data ? <TableSkeleton /> : !data?.items.length ? <EmptyState title="No students found" /> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>Status</TableHead><TableHead>Last active</TableHead>
                  <TableHead>Streak</TableHead><TableHead>Study</TableHead><TableHead>Sessions wk/mo</TableHead>
                  <TableHead>Diagnostic</TableHead><TableHead>Top feature</TableHead><TableHead>Progress</TableHead><TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <StudentName id={s.id} name={s.name} />
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell><StatusBadge suspended={s.accountStatus === "suspended"} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(s.lastActive)}</TableCell>
                    <TableCell className="tabular-nums">{num(s.currentStreak)} <span className="text-xs text-muted-foreground">/ {num(s.longestStreak)}</span></TableCell>
                    <TableCell className="tabular-nums">{secsToHours(s.totalStudySeconds)}</TableCell>
                    <TableCell className="tabular-nums">{num(s.sessionsThisWeek)} / {num(s.sessionsThisMonth)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.diagnosticStatus.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{s.mostUsedFeatureLabel ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{pct(s.progressPercent)}</TableCell>
                    <TableCell className="capitalize">{s.deviceType ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager pagination={data.pagination} onPage={setPage} />
          </>
        )}
      </div>
    </DetailSheet>
  )
}
