"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Page } from "@/lib/admin/api"
import type { AdminUser } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, PageHeader, Pager, TableSkeleton, fmtDate, fullName } from "@/components/admin/common"

interface AuditLog {
  id: number
  adminId: number
  adminName: string
  adminEmail: string
  action: string
  targetType?: string | null
  targetId?: number | null
  details?: Record<string, unknown> | null
  ipAddress?: string | null
  createdAt: string
}

const ACTIONS: Record<string, string> = {
  "user.update": "Updated user",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Unsuspended user",
  "user.change_role": "Changed user role",
  "user.reset_password": "Reset user password",
  "user.delete": "Deleted user",
  "subject.create": "Created subject",
  "subject.update": "Updated subject",
  "subject.delete": "Deleted subject",
  "topic.create": "Created topic",
  "topic.update": "Updated topic",
  "topic.delete": "Deleted topic",
  "reel.create": "Created reel",
  "reel.update": "Updated reel",
  "reel.delete": "Deleted reel",
  "note.delete": "Deleted note",
  "quiz.delete": "Deleted quiz",
  "flashcard_set.delete": "Deleted flashcard set",
  "setting.update": "Updated setting",
}
const TARGET_TYPES = ["user", "subject", "topic", "reel", "note", "quiz", "flashcard_set", "setting"]
const ALL = "all"

/** Deleted targets have no page to link to. */
function targetHref(type?: string | null, id?: number | null, action?: string) {
  if (!type || action?.endsWith(".delete")) return null
  if (type === "user" && id) return `/admin/users/${id}`
  if (type === "subject" || type === "topic") return "/admin/curriculum"
  if (type === "reel") return "/admin/reels"
  if (type === "setting") return "/admin/settings"
  return null
}

export default function AuditLogPage() {
  const [adminId, setAdminId] = useState(ALL)
  const [action, setAction] = useState(ALL)
  const [targetType, setTargetType] = useState(ALL)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => setPage(1), [adminId, action, targetType])

  const admins = useApi<Page<AdminUser>>("/api/admin/users", { accountType: "admin", per_page: 100 })
  const { data, loading, error } = useApi<Page<AuditLog>>("/api/admin/audit-logs", {
    page,
    per_page: 25,
    adminId: adminId === ALL ? undefined : adminId,
    action: action === ALL ? undefined : action,
    targetType: targetType === ALL ? undefined : targetType,
  })

  return (
    <>
      <PageHeader title="Audit Log" description="Every admin action, who did it, and when. Entries are written automatically by the server." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={adminId} onValueChange={setAdminId}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All admins</SelectItem>
            {admins.data?.items.map((a) => <SelectItem key={a.id} value={String(a.id)}>{fullName(a)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {Object.entries(ACTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All targets</SelectItem>
            {TARGET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ErrorNote message={error} />
      <Card className="mt-4 overflow-hidden p-0">
        {loading && !data ? <TableSkeleton /> : data?.items.length === 0 ? <EmptyState title="No audit entries" hint="Admin actions will appear here." /> : (
          <Table>
            <TableHeader><TableRow><TableHead className="w-8" /><TableHead>When</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.items.map((l) => {
                const href = targetHref(l.targetType, l.targetId, l.action)
                const hasDetails = l.details && Object.keys(l.details).length > 0
                const isOpen = open === l.id
                return (
                  <Fragment key={l.id}>
                    <TableRow className={hasDetails ? "cursor-pointer" : undefined} onClick={() => hasDetails && setOpen(isOpen ? null : l.id)}>
                      <TableCell>{hasDetails && (isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(l.createdAt)}</TableCell>
                      <TableCell><p className="font-medium">{l.adminName}</p><p className="text-xs text-muted-foreground">{l.adminEmail}</p></TableCell>
                      <TableCell>{ACTIONS[l.action] ?? l.action}</TableCell>
                      <TableCell>
                        {l.targetType ? (
                          href ? <Link href={href} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">{l.targetType} #{l.targetId}</Link>
                            : <span>{l.targetType}{l.targetId != null && ` #${l.targetId}`}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.ipAddress ?? "—"}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell />
                        <TableCell colSpan={5}><pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(l.details, null, 2)}</pre></TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
        <Pager pagination={data?.pagination} onPage={setPage} />
      </Card>
    </>
  )
}
