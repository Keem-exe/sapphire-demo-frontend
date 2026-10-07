"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserDetail } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, RiskBadge, RoleBadge, StatusBadge, fmtDate, fullName } from "@/components/admin/common"
import { UserActions } from "@/components/admin/user-actions"

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, loading, error } = useApi<{ user: UserDetail }>(`/api/admin/users/${id}`)
  const u = data?.user

  const stats: [string, number | undefined][] = [
    ["Enrolled subjects", u?.stats.enrolledSubjects],
    ["Notes", u?.stats.notes],
    ["Quizzes taken", u?.stats.quizzesTaken],
    ["Flashcard sets", u?.stats.flashcardSets],
    ["Interactions (30d)", u?.stats.interactionsLast30Days],
  ]

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link href="/admin/users"><ArrowLeft className="size-4" /> All users</Link></Button>
      <ErrorNote message={error} />
      {loading && !u ? <Skeleton className="h-32 w-full" /> : u && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{fullName(u)}</h1>
                  <RoleBadge role={u.accountType} />
                  <StatusBadge suspended={u.isSuspended} />
                </div>
                <p className="text-muted-foreground">{u.email}</p>
                <p className="text-sm text-muted-foreground">
                  Joined {fmtDate(u.createdAt)} · Last login {fmtDate(u.lastLoginAt)}
                  {u.age ? ` · Age ${u.age}` : ""}{u.gender ? ` · ${u.gender}` : ""}
                </p>
              </div>
              <UserActions user={u} variant="buttons" onDeleted={() => router.push("/admin/users")} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map(([label, v]) => (
              <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v ?? 0}</p></CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Active risks</CardTitle>
              <div className="flex gap-2 text-sm">
                <Link className="text-primary hover:underline" href={`/admin/moderation?tab=notes&userId=${u.id}`}>Notes</Link>
                <Link className="text-primary hover:underline" href={`/admin/moderation?tab=quizzes&userId=${u.id}`}>Quizzes</Link>
                <Link className="text-primary hover:underline" href={`/admin/moderation?tab=flashcards&userId=${u.id}`}>Flashcards</Link>
              </div>
            </CardHeader>
            <CardContent>
              {u.activeRisks.length === 0 ? <EmptyState title="No active risk indicators" hint="Nothing needs attention for this user." /> : (
                <ul className="space-y-3">
                  {u.activeRisks.map((r) => (
                    <li key={r.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2"><RiskBadge level={r.riskLevel} /><span className="font-medium">{r.riskType.replaceAll("_", " ")}</span><span className="ml-auto text-xs text-muted-foreground">score {r.riskScore.toFixed(2)}</span></div>
                      <p className="mt-1.5">{r.description}</p>
                      {r.recommendedAction && <p className="mt-1 text-muted-foreground">Recommended: {r.recommendedAction}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
