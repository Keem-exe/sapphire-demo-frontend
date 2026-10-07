"use client"

import { useState } from "react"
import { Activity, Bot, Flame, Gauge, GraduationCap, Layers, MessageSquareWarning, Target, Trophy, Users } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/lib/admin/use-api"
import { ErrorNote, RiskBadge, fmtDate } from "@/components/admin/common"
import type { RiskLevel } from "@/lib/admin/types"
import {
  BarList, CardSkeleton, DashCard, DetailSheet, Metric, NoData, NotTracked, Section, StudentName, TOOLTIP_STYLE,
  mins, num, pct, shortDate, useDisclosure, useProfileDrawer,
} from "./primitives"

const D = "/api/admin/dashboard"

/** Fetches `<section>/details` only once the drawer has been opened. */
function useDetails<T>(section: string, open: boolean, params?: Record<string, string | number>) {
  return useApi<T>(open ? `${D}/${section}/details` : null, params)
}

function DetailBody({ state, children }: { state: { loading: boolean; error?: string; data?: unknown }; children: React.ReactNode }) {
  if (state.error) return <ErrorNote message={state.error} />
  if (state.loading && !state.data) return <CardSkeleton />
  return <>{children}</>
}

const MiniArea = ({ data, x, y }: { data: any[]; x: string; y: string }) => (
  <div className="h-52">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={x} tickFormatter={shortDate} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey={y} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

const MiniBar = ({ data, x, y }: { data: any[]; x: string; y: string }) => (
  <div className="h-52">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={x} tickFormatter={(v) => (String(v).length > 9 ? shortDate(v) : v)} fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey={y} fill="var(--primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
)

function NamedTable({ rows, cols }: { rows: any[]; cols: { head: string; render: (r: any) => React.ReactNode }[] }) {
  if (!rows?.length) return <NoData />
  return (
    <Table>
      <TableHeader><TableRow>{cols.map((c) => <TableHead key={c.head}>{c.head}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {rows.map((r, i) => <TableRow key={i}>{cols.map((c) => <TableCell key={c.head}>{c.render(r)}</TableCell>)}</TableRow>)}
      </TableBody>
    </Table>
  )
}
const student = (r: any) => <StudentName id={r.userId} name={r.name ?? r.userName} />

// ---- A. Users -----------------------------------------------------------------------

export function UsersCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/users`)
  return (
    <DashCard title="User Overview" icon={Users} loading={loading && !d} error={error} onExpand={onExpand} expandLabel="View students">
      {d && (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Total students" value={num(d.totalStudents)} />
          <Metric label="~Online now" value={num(d.currentlyOnline)} hint={d.onlineIsApproximate ? "Interaction in last 5 min (approximate)" : undefined} />
          <Metric label="New today / week" value={`${num(d.newToday)} / ${num(d.newThisWeek)}`} />
          <Metric label="Active today" value={num(d.activeToday)} />
          <Metric label="Active this week" value={num(d.activeThisWeek)} />
          <Metric label="Active this month" value={num(d.activeThisMonth)} />
        </div>
      )}
    </DashCard>
  )
}

// ---- B. Engagement ------------------------------------------------------------------

function DaysToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[7, 30].map((n) => <Button key={n} size="sm" variant={value === n ? "default" : "outline"} onClick={() => onChange(n)}>{n}d</Button>)}
    </div>
  )
}

export function EngagementCard({ onExpand }: { onExpand: () => void }) {
  const [days, setDays] = useState(30)
  const { data: d, loading, error } = useApi<any>(`${D}/engagement`, { days })
  return (
    <DashCard title="Engagement & Retention" icon={Activity} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Metric label="DAU" value={num(d.dailyActiveUsers)} />
            <Metric label="WAU" value={num(d.weeklyActiveUsers)} />
            <Metric label="MAU" value={num(d.monthlyActiveUsers)} />
            <Metric label="Avg study" value={mins(d.averageStudyMinutes)} />
            <Metric label="7-day retention" value={pct(d.retention7Day, 1)} />
            <Metric label="30-day retention" value={pct(d.retention30Day, 1)} />
          </div>
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Active users per day</span><DaysToggle value={days} onChange={setDays} /></div>
          <MiniArea data={d.activityGraph ?? []} x="date" y="activeUsers" />
        </div>
      )}
    </DashCard>
  )
}

/** Retention heatmap: rows = cohorts, columns = weeks since cohort start. */
function RetentionHeatmap({ cohorts }: { cohorts: { cohortStart: string; size: number; retention: (number | null)[] }[] }) {
  if (!cohorts?.length) return <NoData text="No cohorts yet" />
  const weeks = Math.max(...cohorts.map((c) => c.retention.length))
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead><tr><th className="p-1 text-left">Cohort</th><th className="p-1">Size</th>{Array.from({ length: weeks }).map((_, i) => <th key={i} className="p-1">W{i}</th>)}</tr></thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohortStart}>
              <td className="whitespace-nowrap p-1">{c.cohortStart}</td>
              <td className="p-1 text-center tabular-nums">{c.size}</td>
              {Array.from({ length: weeks }).map((_, i) => {
                const v = c.retention[i]
                return (
                  <td key={i} className="p-0.5">
                    <div className="flex h-8 w-12 items-center justify-center rounded text-[11px] tabular-nums"
                      style={{ background: v == null ? "var(--muted)" : `color-mix(in oklab, var(--primary) ${Math.min(100, v)}%, transparent)` }}>
                      {v == null ? "—" : `${Math.round(v)}%`}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EngagementDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("engagement", open, { days: 30 })
  const d = s.data
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Engagement & Retention" description="Last 30 days" wide>
      <DetailBody state={s}>
        {d && (
          <>
            <Section title="Daily active users"><MiniArea data={d.daily} x="date" y="activeUsers" /></Section>
            <Section title="Study minutes per day"><MiniBar data={d.daily} x="date" y="studyMinutes" /></Section>
            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Session frequency (students)">
                <MiniBar data={Object.entries(d.sessionFrequency ?? {}).map(([k, v]) => ({ bucket: k, students: v }))} x="bucket" y="students" />
              </Section>
              <Section title="Sessions">
                <div className="grid grid-cols-2 gap-4">
                  <Metric label="Avg session length" value={mins(d.averageSessionMinutes)} />
                  <Metric label="New vs returning" value={`${num(d.returningVsNew?.new)} / ${num(d.returningVsNew?.returning)}`} />
                </div>
              </Section>
            </div>
            <Section title="Retention cohorts"><RetentionHeatmap cohorts={d.retentionCohorts} /></Section>
          </>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- C. Streaks ---------------------------------------------------------------------

export function StreaksCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/streaks`)
  return (
    <DashCard title="Streaks & Gamification" icon={Flame} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="On a streak" value={num(d.studentsOnStreak)} />
            <Metric label="Longest current" value={num(d.longestCurrentStreak)} />
            <Metric label="7+ day streaks" value={num(d.streaks7Plus)} />
            <Metric label="30+ day streaks" value={num(d.streaks30Plus)} />
            <Metric label="Average streak" value={num(d.averageStreak, 1)} />
          </div>
        </div>
      )}
    </DashCard>
  )
}

export function StreaksDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("streaks", open, { limit: 10 })
  const d = s.data
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Streaks & Gamification">
      <DetailBody state={s}>
        {d && (
          <>
            <Section title="Top streaks">
              <NamedTable rows={d.topStreaks} cols={[{ head: "Student", render: student }, { head: "Current", render: (r) => num(r.currentStreak) }, { head: "Longest", render: (r) => num(r.longestStreak) }]} />
            </Section>
            <Section title="Recently broken streaks">
              <NamedTable rows={d.recentlyBroken} cols={[{ head: "Student", render: student }, { head: "Broken streak", render: (r) => num(r.brokenStreak) }, { head: "Last active", render: (r) => r.lastActiveDate ?? "—" }]} />
            </Section>
            <Section title="XP leaders">{d.xpLeaders?.available ? <NamedTable rows={d.xpLeaders.items} cols={[{ head: "Student", render: student }]} /> : <NotTracked what="XP" />}</Section>
            <Section title="Lessons completed">{d.lessonsCompleted?.available ? null : <NotTracked what="Lesson completion" />}</Section>
            <Section title="Quiz performance">
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Completed quizzes" value={num(d.quizPerformance?.completedQuizzes)} />
                <Metric label="Average score" value={pct(d.quizPerformance?.averageScorePercent, 1)} />
              </div>
            </Section>
            <Section title="Student leaderboard">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-4 opacity-60" aria-disabled>
                <Trophy className="size-4" /> <span className="text-sm font-medium">Student Leaderboard</span> <Badge variant="secondary">Coming soon</Badge>
              </div>
            </Section>
          </>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- D. Study -----------------------------------------------------------------------

export function StudyCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/study`, { days: 30 })
  return (
    <DashCard title="Study Activity" icon={GraduationCap} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Avg study / active student" value={mins(d.averageStudyMinutes)} />
          <Metric label="Total sessions" value={num(d.totalSessions)} />
          <Metric label="Avg session" value={mins(d.averageSessionMinutes)} />
          <Metric label="Total study hours" value={num(d.totalStudyHours, 1)} />
          <Metric label="Sessions / student" value={num(d.sessionsPerStudent, 1)} />
        </div>
      )}
    </DashCard>
  )
}

export function StudyDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("study", open, { days: 30, top: 20 })
  const d = s.data
  const minsFmt = (n: number) => mins(n)
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Study Activity" description="Last 30 days" wide>
      <DetailBody state={s}>
        {d && (
          <>
            {d.lowEffortStudents?.length > 0 && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                <p className="mb-2 font-medium">Logging in but not really studying</p>
                <NamedTable rows={d.lowEffortStudents} cols={[{ head: "Student", render: student }, { head: "Interactions", render: (r) => num(r.interactions) }, { head: "Minutes", render: (r) => num(r.minutes, 1) }]} />
              </div>
            )}
            <Tabs defaultValue="day">
              <TabsList>{["day", "week", "subject", "student", "feature"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
              <TabsContent value="day"><MiniBar data={d.byDay} x="date" y="minutes" /></TabsContent>
              <TabsContent value="week"><MiniBar data={d.byWeek} x="weekStart" y="minutes" /></TabsContent>
              <TabsContent value="subject"><BarList rows={d.bySubject.map((r: any) => ({ key: r.subjectId, label: r.subject, value: r.minutes }))} format={minsFmt} /></TabsContent>
              <TabsContent value="student"><BarList rows={d.byStudent.map((r: any) => ({ key: r.userId, label: student(r), value: r.minutes }))} format={minsFmt} /></TabsContent>
              <TabsContent value="feature"><BarList rows={d.byFeature.map((r: any) => ({ key: r.feature, label: r.label, value: r.minutes }))} format={minsFmt} /></TabsContent>
            </Tabs>
          </>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- E. AI --------------------------------------------------------------------------

export function AiCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/ai`)
  return (
    <DashCard title="AI Usage" icon={Bot} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Total interactions" value={num(d.totalInteractions)} />
            <Metric label="AI users" value={num(d.aiUsers)} />
            <Metric label="Avg / student" value={num(d.averageInteractionsPerStudent, 1)} />
            <Metric label="Tutor sessions" value={num(d.tutorSessions)} />
            <Metric label="Quizzes generated" value={num(d.generatedQuizzes)} />
            <Metric label="Flashcards generated" value={num(d.generatedFlashcards)} />
            <Metric label="Assignments generated" value={num(d.generatedAssignments)} />
          </div>
          {d.topFeature && <Badge variant="secondary">{d.topFeature === "tutor" ? "AI Tutor — Top Feature" : `Top feature: ${d.topFeature}`}</Badge>}
        </div>
      )}
    </DashCard>
  )
}

const EventList = ({ rows }: { rows: any[] }) => (
  <NamedTable rows={rows} cols={[
    { head: "Student", render: (r) => <StudentName id={r.userId} name={r.userName} /> },
    { head: "Topic", render: (r) => r.topic ?? "—" },
    { head: "Kind", render: (r) => r.kind },
    { head: "Reason", render: (r) => r.flagReason ?? r.error ?? "—" },
    { head: "When", render: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</span> },
  ]} />
)

export function AiDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("ai", open, { days: 30, top: 10 })
  const d = s.data
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="AI Usage" description="Last 30 days. Chat text is never stored; topics are syllabus topic names only." wide>
      <DetailBody state={s}>
        {d && (
          <>
            <Section title="Interactions over time"><MiniArea data={d.overTime} x="date" y="count" /></Section>
            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Common topics"><BarList rows={d.commonTopics.map((t: any) => ({ key: t.topic, label: t.topic, value: t.count }))} format={(n) => String(n)} /></Section>
              <Section title="By subject"><BarList rows={d.bySubject.map((t: any) => ({ key: t.subjectId, label: t.subject, value: t.count }))} format={(n) => String(n)} /></Section>
            </div>
            <Section title="Response ratings">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Metric label="👍 Helpful" value={num(d.ratings.helpful)} />
                <Metric label="😐 Partial" value={num(d.ratings.partiallyHelpful)} />
                <Metric label="👎 Unhelpful" value={num(d.ratings.unhelpful)} />
                <Metric label="Rated" value={num(d.ratings.ratedCount)} />
                <Metric label="Helpful %" value={pct(d.ratings.helpfulPercent, 1)} />
              </div>
            </Section>
            <Section title="Usage per student"><BarList rows={d.perStudent.map((t: any) => ({ key: t.userId, label: student(t), value: t.count }))} format={(n) => String(n)} /></Section>
            <Section title="Flagged responses"><EventList rows={d.flaggedResponses} /></Section>
            <Section title="Errors"><EventList rows={d.errors} /></Section>
          </>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- F. Diagnostics -----------------------------------------------------------------

export function DiagnosticsCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/diagnostics`)
  return (
    <DashCard title="Diagnostic Performance" icon={Target} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Completion rate" value={pct(d.completionRate, 1)} />
          <Metric label="Average score" value={pct(d.averageScore, 1)} />
          <Metric label="Completed" value={num(d.completed)} />
          <Metric label="Incomplete" value={num(d.incomplete)} />
          <Metric label="Weakest area" value={<span className="text-base">{d.weakestArea?.topic ?? "—"}</span>} hint={d.weakestArea ? pct(d.weakestArea.averageScore, 1) : "No diagnostics recorded yet"} />
        </div>
      )}
    </DashCard>
  )
}

export function DiagnosticsDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("diagnostics", open, { top: 50 })
  const d = s.data
  const empty = d && !d.students?.length && !d.funnel?.some((f: any) => f.count)
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Diagnostic Performance" description="Baseline attempts only." wide>
      <DetailBody state={s}>
        {d && (empty ? <NoData text="No diagnostic attempts recorded yet — the student diagnostic flow doesn't write results yet." /> : (
          <>
            <Section title="Completion funnel"><MiniBar data={d.funnel} x="stage" y="count" /></Section>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Average score" value={pct(d.averageScore, 1)} />
              <Metric label="Avg completion time" value={mins(d.averageCompletionMinutes)} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Score by subject"><BarList rows={d.scoreBySubject.map((r: any) => ({ key: r.subjectId, label: r.subject, value: r.averageScore }))} format={(n) => pct(n, 1)} /></Section>
              <Section title="Weakest topics first"><BarList rows={d.scoreByTopic.map((r: any) => ({ key: r.topicId, label: r.topic, value: r.averageScore }))} format={(n) => pct(n, 1)} /></Section>
            </div>
            <Section title="Drop-off points"><BarList rows={d.dropOffPoints.map((r: any) => ({ key: r.point, label: r.point, value: r.count }))} format={(n) => String(n)} /></Section>
            <Section title="Students">
              <NamedTable rows={d.students} cols={[{ head: "Student", render: student }, { head: "Subject", render: (r) => r.subject }, { head: "Status", render: (r) => r.status }, { head: "Score", render: (r) => pct(r.score, 1) }, { head: "Completed", render: (r) => fmtDate(r.completedAt) }]} />
            </Section>
          </>
        ))}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- G. Progress --------------------------------------------------------------------

export function ProgressCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/progress`)
  return (
    <DashCard title="Learning Progress" icon={Gauge} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="space-y-4">
          <p className="text-sm">
            Average diagnostic: <b>{pct(d.averageDiagnosticScore)}</b> → Current assessment: <b>{pct(d.averageCurrentAssessment)}</b>{" "}
            → <b>{d.averageImprovementPoints == null ? "—" : `${d.averageImprovementPoints > 0 ? "+" : ""}${num(d.averageImprovementPoints, 1)} pts`}</b>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Avg progress" value={pct(d.averageProgressPercent, 1)} />
            <Metric label="Skills mastered" value={num(d.skillsMastered)} />
            <Metric label="Improving" value={num(d.studentsImproving)} />
            <Metric label="Need intervention" value={num(d.studentsNeedingIntervention)} />
          </div>
        </div>
      )}
    </DashCard>
  )
}

export function ProgressDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("progress", open, { limit: 10 })
  const d = s.data
  const mastery = (rows: any[], key: string, name: string) => <BarList rows={rows.map((r) => ({ key: r[key], label: r[name], value: r.averageMasteryPercent }))} format={(n) => pct(n, 1)} />
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Learning Progress" wide>
      <DetailBody state={s}>
        {d && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Mastery by subject">{mastery(d.bySubject, "subjectId", "subject")}</Section>
              <Section title="Mastery by topic">{mastery(d.byTopic, "topicId", "topic")}</Section>
              <Section title="Most difficult topics">{mastery(d.mostDifficultTopics, "topicId", "topic")}</Section>
              <Section title="Most improved topics"><BarList rows={d.mostImprovedTopics.map((r: any) => ({ key: r.topicId, label: r.topic, value: r.averageImprovementPoints }))} format={(n) => `+${num(n, 1)} pts`} /></Section>
            </div>
            <Section title="Pre vs post diagnostic">
              <NamedTable rows={d.prePostBySubject} cols={[{ head: "Subject", render: (r) => r.subject }, { head: "Pre", render: (r) => pct(r.preAverage, 1) }, { head: "Post", render: (r) => pct(r.postAverage, 1) }, { head: "Students", render: (r) => num(r.students) }]} />
            </Section>
            <Section title="Students requiring attention">
              <NamedTable rows={d.studentsRequiringAttention} cols={[{ head: "Student", render: student }, { head: "Risk", render: (r) => <RiskBadge level={r.riskLevel as RiskLevel} /> }, { head: "Type", render: (r) => r.riskType }, { head: "Details", render: (r) => <span className="text-xs">{r.description}{r.recommendedAction && <> — <i>{r.recommendedAction}</i></>}</span> }]} />
            </Section>
          </>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- H. Features --------------------------------------------------------------------

export function FeaturesCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/features`, { days: 30 })
  const h = d?.productHealth
  return (
    <DashCard title="Product / Feature Analytics" icon={Layers} loading={loading && !d} error={error} onExpand={onExpand}>
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Top feature" value={<span className="text-base">{h?.topFeature ?? "—"}</span>} />
            <Metric label="Most abandoned" value={<span className="text-base">{h?.mostAbandoned ?? "—"}</span>} />
            <Metric label="Most common bug" value={<span className="text-base">{h?.mostCommonBug ?? "—"}</span>} />
            <Metric label="Most requested" value={<span className="text-base">{h?.mostRequestedFeature ?? "—"}</span>} />
          </div>
          <BarList rows={d.featureUsage.map((f: any) => ({ key: f.feature, label: f.label, value: f.uses }))} format={(n) => `${n} uses`} />
        </div>
      )}
    </DashCard>
  )
}

export function FeaturesDetails({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useDetails<any>("features", open, { days: 30 })
  const { openFeedback } = useProfileDrawer()
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title="Product / Feature Analytics" description="Last 30 days. “—” means the backend has no signal for that metric." wide>
      <DetailBody state={s}>
        {s.data && (
          <NamedTable rows={s.data.features} cols={[
            { head: "Feature", render: (r) => r.label },
            { head: "Users", render: (r) => num(r.users) },
            { head: "Uses", render: (r) => num(r.uses) },
            { head: "Uses/user/wk", render: (r) => num(r.usesPerUserPerWeek, 1) },
            { head: "Completion", render: (r) => pct(r.completionRate, 1) },
            { head: "Abandonment", render: (r) => pct(r.abandonmentRate, 1) },
            { head: "Rating", render: (r) => pct(r.rating, 1) },
            { head: "Feedback", render: (r) => <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { onOpenChange(false); openFeedback(r.feature) }}>{num(r.relatedFeedbackCount)}</Button> },
          ]} />
        )}
      </DetailBody>
    </DetailSheet>
  )
}

// ---- I. Feedback --------------------------------------------------------------------

export function FeedbackCard({ onExpand }: { onExpand: () => void }) {
  const { data: d, loading, error } = useApi<any>(`${D}/feedback`)
  const p = d?.openBugsByPriority
  return (
    <DashCard title="Feedback & Bugs" icon={MessageSquareWarning} loading={loading && !d} error={error} onExpand={onExpand} expandLabel="Triage">
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Open bugs" value={num(d.openBugs)} />
            <Metric label="Critical bugs" value={num(d.criticalBugs)} />
            <Metric label="New feedback" value={num(d.newFeedback)} />
            <Metric label="Feature requests" value={num(d.featureRequests)} />
            <Metric label="AI issues" value={num(d.aiIssues)} />
          </div>
          {p && <p className="text-sm">🔴 {p.critical} Critical &nbsp; 🟠 {p.high} High &nbsp; 🟡 {p.medium} Medium</p>}
        </div>
      )}
    </DashCard>
  )
}

// ---- Leaderboard (disabled per spec) -------------------------------------------------

export function LeaderboardCard() {
  return (
    <DashCard title="Student Leaderboard" icon={Trophy} badge="Coming soon" disabled>
      <p className="text-sm text-muted-foreground">XP and lesson completion aren&apos;t tracked yet.</p>
    </DashCard>
  )
}

export { useDisclosure }
