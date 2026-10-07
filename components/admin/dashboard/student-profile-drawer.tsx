"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/lib/admin/use-api"
import type { UserDetail } from "@/lib/admin/types"
import { ErrorNote, StatusBadge, fmtDate } from "@/components/admin/common"
import { UserActions } from "@/components/admin/user-actions"
import { BarList, DetailSheet, Metric, NoData, NotTracked, Section, mins, num, pct } from "./primitives"

interface Profile {
  profile: { id: number; name: string; email: string; age: number | null; gradeLevel: string | null; school: string | null; subjects: string[]; registeredAt: string; lastActive: string | null; device: string | null; accountStatus: "active" | "suspended" }
  learning: {
    diagnosticStatus: string | null
    diagnosticScore: number | null
    overallProficiencyPercent: number | null
    subjectProficiency: { subjectId: string | number; subject: string; percent: number }[]
    topicsMastered: string[]
    topicsStruggling: string[]
    currentLearningPath: { title: string; type: string }[]
    lessonsCompleted: number | null
    quizzesCompleted: number | null
    assignmentsCompleted: number | null
  }
  engagement: {
    currentStreak: number | null
    longestStreak: number | null
    totalStudyMinutes: number | null
    sessionsThisWeek: number | null
    sessionsThisMonth: number | null
    lastLogin: string | null
    featureUsage: { feature: string; label: string; uses: number }[]
  }
  ai: {
    conversations: number | null
    questionsAsked: number | null
    averageSessionMinutes: number | null
    commonTopics: string[]
    ratings: { helpful: number; partiallyHelpful: number; unhelpful: number }
  }
}

const Chips = ({ items, empty }: { items?: string[]; empty: string }) =>
  items?.length ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Badge key={t} variant="secondary">{t}</Badge>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  )

function Actions({ id }: { id: number }) {
  const { data } = useApi<{ user: UserDetail }>(`/api/admin/users/${id}`)
  if (!data) return null
  return <UserActions user={data.user} variant="buttons" onDeleted={() => window.location.reload()} />
}

export function StudentProfileDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, loading, error } = useApi<Profile>(id ? `/api/admin/students/${id}/profile` : null)
  const p = data?.profile
  return (
    <DetailSheet open={id !== null} onOpenChange={(o) => !o && onClose()} title={p?.name ?? "Student profile"} description={p?.email} wide>
      <ErrorNote message={error} />
      {loading && !data && <Skeleton className="h-64 w-full" />}
      {data && p && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge suspended={p.accountStatus === "suspended"} />
            {id && <Actions id={id} />}
          </div>

          <Section title="Profile">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric label="Age / Year" value={`${p.age ?? "—"} / ${p.gradeLevel ?? "—"}`} />
              <Metric label="School type" value={p.school ?? "—"} />
              <Metric label="Device" value={p.device ?? "—"} />
              <Metric label="Registered" value={<span className="text-sm">{fmtDate(p.registeredAt)}</span>} />
              <Metric label="Last active" value={<span className="text-sm">{fmtDate(p.lastActive)}</span>} />
            </div>
            <div className="pt-2"><Chips items={p.subjects} empty="No subjects selected" /></div>
          </Section>

          <Section title="Learning">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Diagnostic" value={<span className="text-base capitalize">{data.learning.diagnosticStatus?.replace("_", " ") ?? "—"}</span>} hint={data.learning.diagnosticScore != null ? `Score ${pct(data.learning.diagnosticScore)}` : undefined} />
              <Metric label="Overall proficiency" value={pct(data.learning.overallProficiencyPercent)} />
              <Metric label="Quizzes completed" value={num(data.learning.quizzesCompleted)} />
              <Metric label="Assignments completed" value={num(data.learning.assignmentsCompleted)} />
            </div>
            <BarList rows={data.learning.subjectProficiency.map((s) => ({ key: s.subjectId, label: s.subject, value: s.percent }))} format={(n) => pct(n)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="mb-1 text-xs text-muted-foreground">Topics mastered</p><Chips items={data.learning.topicsMastered} empty="None yet" /></div>
              <div><p className="mb-1 text-xs text-muted-foreground">Topics struggling</p><Chips items={data.learning.topicsStruggling} empty="None yet" /></div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Current learning path</p>
              {data.learning.currentLearningPath.length ? (
                <ul className="text-sm">{data.learning.currentLearningPath.map((s, i) => <li key={i}>{s.title} <span className="text-muted-foreground">· {s.type}</span></li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">No learning path yet</p>}
            </div>
            {data.learning.lessonsCompleted == null && <NotTracked what="Lessons completed" />}
          </Section>

          <Section title="Engagement">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Current streak" value={num(data.engagement.currentStreak)} />
              <Metric label="Longest streak" value={num(data.engagement.longestStreak)} />
              <Metric label="Total study time" value={mins(data.engagement.totalStudyMinutes)} />
              <Metric label="Sessions (wk / mo)" value={`${num(data.engagement.sessionsThisWeek)} / ${num(data.engagement.sessionsThisMonth)}`} />
            </div>
            <p className="text-xs text-muted-foreground">Last login: {fmtDate(data.engagement.lastLogin)}</p>
            <BarList rows={data.engagement.featureUsage.map((f) => ({ key: f.feature, label: f.label, value: f.uses }))} format={(n) => `${n} uses`} />
          </Section>

          <Section title="AI usage">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Conversations" value={num(data.ai.conversations)} />
              <Metric label="Questions asked" value={num(data.ai.questionsAsked)} />
              <Metric label="Avg session" value={mins(data.ai.averageSessionMinutes)} />
              <Metric label="Ratings 👍 / 😐 / 👎" value={`${data.ai.ratings.helpful} / ${data.ai.ratings.partiallyHelpful} / ${data.ai.ratings.unhelpful}`} />
            </div>
            <div><p className="mb-1 text-xs text-muted-foreground">Common topics</p><Chips items={data.ai.commonTopics} empty="No topics yet" /></div>
          </Section>
        </>
      )}
      {!loading && !data && !error && <NoData />}
    </DetailSheet>
  )
}
