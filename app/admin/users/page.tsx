"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Page } from "@/lib/admin/api"
import type { AdminUser } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, PageHeader, Pager, RoleBadge, StatusBadge, TableSkeleton, fmtDate, fmtDay, fullName, useDebounce } from "@/components/admin/common"
import { UserActions } from "@/components/admin/user-actions"

const ALL = "all"

export default function UsersPage() {
  const [search, setSearch] = useState("")
  const [role, setRole] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  useEffect(() => setPage(1), [q, role, status])

  const { data, loading, error } = useApi<Page<AdminUser>>("/api/admin/users", {
    page,
    per_page: 20,
    search: q || undefined,
    accountType: role === ALL ? undefined : role,
    isSuspended: status === ALL ? undefined : status === "suspended",
  })

  return (
    <>
      <PageHeader title="Users" description="Search, filter and manage every account." />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ErrorNote message={error} />
      <Card className="mt-4 overflow-hidden p-0">
        {loading && !data ? <TableSkeleton /> : data && data.items.length === 0 ? (
          <EmptyState title="No users match" hint="Try adjusting the search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                <TableHead>Age</TableHead><TableHead>Signed up</TableHead><TableHead>Last login</TableHead><TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{fullName(u)}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><RoleBadge role={u.accountType} /></TableCell>
                  <TableCell><StatusBadge suspended={u.isSuspended} /></TableCell>
                  <TableCell>{u.age ?? "—"}</TableCell>
                  <TableCell>{fmtDay(u.createdAt)}</TableCell>
                  <TableCell>{fmtDate(u.lastLoginAt)}</TableCell>
                  <TableCell><UserActions user={u} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager pagination={data?.pagination} onPage={setPage} />
      </Card>
    </>
  )
}
