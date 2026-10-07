"use client"

import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/lib/admin/use-api"
import { EmptyState, ErrorNote, PageHeader, RISK_DOT, fmtDate } from "@/components/admin/common"
import type { RiskLevel } from "@/lib/admin/types"
import { AdminDashboard } from "@/components/admin/dashboard/dashboard"

interface Overview {
  users: { total: number; students: number; teachers: number; admins: number; suspended: number; newLast7Days: number; newLast30Days: number }
  content: Record<string, number>
  engagement: { totalInteractions: number; interactionsLast7Days: number; totalReelViews: number; activeEnrollments: number }
  intelligence: { activeRiskIndicators: number; riskByLevel: Record<RiskLevel, number>; activeRecommendations: number }
  system: { aiFeaturesConfigured: boolean; blacklistedTokens: number }
}
interface Trend { trend: { date: string; count: number }[] }
interface Activity { activity: { type: "signup" | "interaction"; userId: number; userName: string; detail: string; timestamp: string }[] }
interface Health {
  database: { healthy: boolean; error?: string | null }
  environment: string
  rateLimitingEnabled: boolean
  aiFeaturesConfigured: boolean
  corsOrigins?: unknown
  blacklistedTokens: number
}

function Stat({ label, value, sub, loading }: { label: string; value?: number; sub?: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-1 text-3xl font-semibold tabular-nums">{value?.toLocaleString()}</p>}
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function TrendChart({ title, path }: { title: string; path: string }) {
  const { data, loading, error } = useApi<Trend>(path, { days: 30 })
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-56">
        {error ? <ErrorNote message={error} /> : loading && !data ? <Skeleton className="h-full w-full" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.trend ?? []} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function PlatformOverview() {
  const overview = useApi<Overview>("/api/admin/overview")
  const activity = useApi<Activity>("/api/admin/activity", { limit: 20 }, { refreshMs: 30_000 })
  const health = useApi<Health>("/api/admin/system/health")
  const o = overview.data
  const l = overview.loading && !o

  return (
    <>
      <div className="space-y-6">
        <ErrorNote message={overview.error} />

        {health.data && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span className={`size-2.5 rounded-full ${health.data.database.healthy ? "bg-emerald-500" : "bg-red-500"}`} />
              Database {health.data.database.healthy ? "healthy" : `down${health.data.database.error ? `: ${health.data.database.error}` : ""}`}
            </span>
            <Badge variant="outline">{health.data.environment}</Badge>
            <Badge variant="outline">Rate limiting {health.data.rateLimitingEnabled ? "on" : "off"}</Badge>
            <Badge variant="outline">AI {health.data.aiFeaturesConfigured ? "configured" : "no API key"}</Badge>
            <Badge variant="outline">{health.data.blacklistedTokens} blacklisted tokens</Badge>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat loading={l} label="Total users" value={o?.users.total} sub={o && `${o.users.students} students · ${o.users.teachers} teachers · ${o.users.admins} admins`} />
          <Stat loading={l} label="New signups (7d)" value={o?.users.newLast7Days} sub={o && `${o.users.newLast30Days} in the last 30 days`} />
          <Stat loading={l} label="Active enrollments" value={o?.engagement.activeEnrollments} />
          <Stat loading={l} label="Interactions (7d)" value={o?.engagement.interactionsLast7Days} sub={o && `${o.engagement.totalInteractions.toLocaleString()} all-time`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart title="Signups — last 30 days" path="/api/admin/trends/signups" />
          <TrendChart title="Engagement — last 30 days" path="/api/admin/trends/engagement" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Risk summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(["critical", "high", "medium", "low"] as RiskLevel[]).map((lvl) => (
                  <Link key={lvl} href={`/admin/intelligence?riskLevel=${lvl}`} className="rounded-md border p-3 transition-colors hover:bg-muted">
                    <div className="flex items-center gap-2 text-sm capitalize"><span className={`size-2.5 rounded-full ${RISK_DOT[lvl]}`} />{lvl}</div>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{o?.intelligence.riskByLevel[lvl] ?? "—"}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Live activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={activity.refetch}><RefreshCw className="size-4" /> Refresh</Button>
            </CardHeader>
            <CardContent>
              {activity.error ? <ErrorNote message={activity.error} /> : activity.data?.activity.length === 0 ? (
                <EmptyState title="No recent activity" />
              ) : (
                <ul className="max-h-72 space-y-3 overflow-y-auto">
                  {activity.data?.activity.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Badge variant={a.type === "signup" ? "default" : "secondary"} className="mt-0.5 capitalize">{a.type}</Badge>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/users/${a.userId}`} className="font-medium hover:underline">{a.userName}</Link>{" "}
                        <span className="text-muted-foreground">{a.detail}</span>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.timestamp)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Student activity, learning and product health. Expand a card for details." />
      <AdminDashboard />
      <h2 className="mb-4 mt-10 text-lg font-semibold">Platform overview</h2>
      <PlatformOverview />
    </>
  )
}
