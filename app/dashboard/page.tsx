"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { SubjectCard, type SubjectCardData } from "@/components/subject-card"
import { AddSubjectDialog } from "@/components/add-subject-dialog"
import { LearningStyleDialog } from "@/components/onboarding/learning-style-dialog"
import { SapphyGuide } from "@/components/onboarding/sapphy-guide"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  Brain,
  User,
  Flame,
  Play,
  MessageSquarePlus,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Compass,
  Sparkles,
} from "lucide-react"
import { SapphyFab } from "@/components/sapphy-fab"
import { FeedbackDialog } from "@/components/feedback/feedback-dialog"
import { SUBJECTS, subjectIdForName, subjectsForLevel, type Level, type SubjectId } from "@/lib/data/subjects"
import { useOverview } from "@/lib/hooks/use-me"
import { taskRoute, type DailyTaskType, type StreakDay } from "@/lib/services/me-service"
import type { FabContent } from "@/lib/sapphy-fab-data"

// One row in "Today": a real Sapphy task, or (demo account only) a sample one.
type TaskRow = {
  key: string
  title: string
  message: string | null
  subjectName: string
  type: DailyTaskType
  done: boolean
  href: string
}

const TASK_STRIPE: Record<DailyTaskType, string> = {
  quiz: "var(--tool-quiz)",
  flashcards: "var(--tool-flashcards)",
  reel: "var(--tool-reels)",
  chat: "var(--primary)",
}

// SAMPLE: the demo account (andrew.lee@demo.com) has no backend session, so it shows the design's
// sample numbers. Signed-in students never see these.
const DEMO_PROGRESS: Record<SubjectId, { mastery: number; mastered: number; last: number; next: string }> = {
  "csec-math": { mastery: 65, mastered: 6, last: 2, next: "Algebra flashcards" },
  "csec-eng": { mastery: 45, mastered: 4, last: 26, next: "Summary writing quiz" },
  "cape-caribbean-studies": { mastery: 55, mastered: 5, last: 5, next: "Regional integration reel" },
  "cape-communication-studies": { mastery: 40, mastered: 4, last: 30, next: "Evaluating sources quiz" },
}
const DEMO_STREAK = 6
const DEMO_DAYS_TO_EXAM = 208

function dayNumber(iso: string) {
  return String(Number(iso.slice(8, 10)))
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isDemo, isSynced, logout, completeOnboarding, restartOnboarding } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [level, setLevel] = useState<Level | null>(null)
  const [demoSubjects, setDemoSubjects] = useState<SubjectId[]>([])
  const [demoDone, setDemoDone] = useState<string[]>([])
  const [styleDialogDone, setStyleDialogDone] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)

  const { data: overview, loading: overviewLoading, error: overviewError, refresh } = useOverview(!!user && !isDemo)

  // Who may see the dashboard: signed in, with a level (from the account, or this browser for the demo).
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push("/")
      return
    }
    const stored = (typeof window !== "undefined" ? localStorage.getItem("selectedLevel") : null) as Level | null
    const lvl = user.level ?? stored
    if (!lvl) {
      router.push("/select-level")
      return
    }
    setLevel(lvl)
    // Old browser data from before subjects came from the backend.
    try {
      localStorage.removeItem("csecSubjects")
      localStorage.removeItem("capeSubjects")
    } catch {}
  }, [isLoading, user, router])

  useEffect(() => {
    if (level && isDemo) setDemoSubjects(subjectsForLevel(level))
  }, [level, isDemo])

  // ---------------------------------------------------------------- data, real or demo
  const subjects: SubjectCardData[] = useMemo(() => {
    if (!level) return []
    if (isDemo) {
      return demoSubjects.map((id) => {
        const p = DEMO_PROGRESS[id]
        return {
          id,
          name: SUBJECTS[id].name,
          icon: SUBJECTS[id].icon,
          level: SUBJECTS[id].level,
          masteryPercent: p.mastery,
          topicCount: SUBJECTS[id].topics.length,
          topicsMastered: p.mastered,
          lastStudiedAt: new Date(Date.now() - p.last * 3600_000).toISOString(),
          nextUp: p.next,
        }
      })
    }
    return (overview?.subjects ?? []).flatMap((s) => {
      const id = subjectIdForName(s.subjectName)
      if (!id) return []
      return [
        {
          id,
          name: s.subjectName,
          icon: SUBJECTS[id].icon,
          level: (s.level ?? SUBJECTS[id].level) as Level,
          masteryPercent: s.masteryPercent,
          topicCount: s.topicCount,
          topicsMastered: s.topicsMastered,
          lastStudiedAt: s.lastStudiedAt,
          nextUp: s.nextUp?.title ?? null,
        },
      ]
    })
  }, [level, isDemo, demoSubjects, overview])

  const tasks: TaskRow[] = useMemo(() => {
    if (isDemo) {
      const first = demoSubjects[0]
      if (!first) return []
      const name = SUBJECTS[first].name
      return [
        { key: "quiz", title: "Take a quick quiz on Algebra", message: null, subjectName: name, type: "quiz" as const, done: false, href: `/workspace/${first}/quiz` },
        { key: "flash", title: "Review flashcards on Statistics", message: null, subjectName: name, type: "flashcards" as const, done: false, href: `/workspace/${first}/flashcards` },
        { key: "reel", title: "Watch a study reel on Sets", message: null, subjectName: name, type: "reel" as const, done: false, href: `/workspace/${first}/reels` },
      ].map((t) => ({ ...t, done: demoDone.includes(t.key) }))
    }
    return (overview?.dailyTasks.tasks ?? []).map((t) => {
      const sid = subjectIdForName(t.subjectName)
      const segment = taskRoute(t.type)
      return {
        key: String(t.id),
        title: t.title,
        message: t.sapphyMessage,
        subjectName: t.subjectName ?? "",
        type: t.type,
        done: t.done,
        href: sid ? `/workspace/${sid}${segment ? `/${segment}` : ""}` : "/dashboard",
      }
    })
  }, [isDemo, demoSubjects, demoDone, overview])

  const streakCount = isDemo ? DEMO_STREAK : overview?.streak.current ?? 0
  const bestStreak = isDemo ? 11 : overview?.streak.best ?? 0
  const atRisk = !isDemo && !!overview?.streak.atRisk
  const week: StreakDay[] = useMemo(() => {
    if (!isDemo) return overview?.streak.history ?? []
    // SAMPLE week for the demo: the last 7 days, the first five studied.
    return Array.from({ length: 7 }, (_, n) => {
      const d = new Date(Date.now() - (6 - n) * 86400_000)
      const iso = d.toISOString().slice(0, 10)
      const studied = n < 6 && n !== 1
      return { date: iso, weekday: d.toLocaleDateString(undefined, { weekday: "short" }), isToday: n === 6, active: studied, tasksCompleted: studied ? 2 : 0, streakDay: studied, perfectDay: n === 3 }
    })
  }, [isDemo, overview])

  const tasksDone = tasks.filter((t) => t.done).length
  const nextTask = tasks.find((t) => !t.done) ?? null
  const daysToExam = isDemo ? DEMO_DAYS_TO_EXAM : overview?.nextExam?.daysLeft ?? null
  const examSubject = isDemo ? null : overview?.nextExam?.subjectName ?? null

  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const firstSubject = subjects[0]?.id ?? null

  // ---------------------------------------------------------------- onboarding
  // 1) the learning-style quiz, if it was never finished; 2) then the Sapphy guide, once.
  const needsStyleQuiz = !!user && !isDemo && isSynced && !!level && !user.learning_style && !styleDialogDone
  // Latch it open: saving the answers sets learning_style, but the dialog still shows the result.
  useEffect(() => {
    if (needsStyleQuiz) setStyleOpen(true)
  }, [needsStyleQuiz])
  const showGuide =
    !!user && isSynced && !!level && !needsStyleQuiz && !styleOpen && !user.onboardingCompletedAt && (isDemo || !overviewLoading)

  const finishGuide = () => {
    completeOnboarding().catch(() => {})
  }

  // ---------------------------------------------------------------- Sapphy panel (real copy)
  const fabContent: Partial<FabContent> | undefined = isDemo
    ? undefined
    : {
        summary: !tasks.length
          ? "Add a subject and I'll set you three tasks every day."
          : tasksDone === tasks.length
            ? `Perfect day! All ${tasks.length} tasks done.${streakCount ? ` Your streak is ${streakCount} ${streakCount === 1 ? "day" : "days"}.` : ""}`
            : tasksDone > 0
              ? `${tasksDone} of ${tasks.length} tasks done. Today counts towards your ${streakCount}-day streak.`
              : atRisk
                ? `Finish one task today to keep your ${streakCount}-day streak.`
                : "Finish one task today to start a streak.",
        happy: tasks.length > 0 && tasksDone === tasks.length,
        steps: tasks
          .filter((t) => !t.done)
          .map((t) => ({ t: t.title, why: t.message ?? t.subjectName, to: "" as const, href: t.href })),
      }

  if (!level || !user) return null

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
  })()
  const levelLabel = level === "csec" ? "CSEC" : "CAPE"
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "ME"
  const loadingReal = !isDemo && overviewLoading && !overview

  return (
    <div className="wash min-h-screen">
      {/* Header */}
      <header className="hdr">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" aria-label="Sapphire OS home" className="inline-flex">
              <Image src="/sapphire-logo.png" alt="Sapphire OS" width={119} height={40} priority className="h-10 w-auto" />
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/select-level?change=1")}
              aria-label={`Switch level, currently ${levelLabel}`}
              className="min-h-11 gap-1 shadow-none"
            >
              {levelLabel}
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <nav className="flex items-center gap-2.5" aria-label="Account">
            <Badge
              data-tour="streak"
              variant="secondary"
              className={cn("h-8 gap-1.5 px-3 text-[13px]", atRisk && "ring-2 ring-status-warning/50")}
              title={
                atRisk
                  ? "Finish one of today's tasks to keep your streak"
                  : `Study streak. Best: ${bestStreak} ${bestStreak === 1 ? "day" : "days"}`
              }
            >
              <Flame className={cn("size-4", streakCount ? "text-streak" : "text-muted-foreground")} aria-hidden="true" />
              <span className="tabular-nums">
                {streakCount}-day streak
              </span>
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="Account menu" className="min-h-11 gap-2 rounded-full pl-1.5 shadow-none">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {initials}
                  </span>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <User className="size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => restartOnboarding().catch(() => {})}>
                  <Compass className="size-4" /> Replay the guide
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                  <MessageSquarePlus className="size-4" /> Feedback
                </DropdownMenuItem>
                {user.accountType === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <ShieldCheck className="size-4" /> Admin console
                  </DropdownMenuItem>
                )}
                {user.accountType === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/engine-demo")}>
                    <Brain className="size-4" /> Engine Demo
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pb-16 pt-7">
        {overviewError && !overview && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-status-danger-subtle px-4 py-3 text-sm">
            <span>Couldn't load your progress. {overviewError}</span>
            <Button size="sm" variant="outline" className="min-h-11 shadow-none" onClick={refresh}>
              Try again
            </Button>
          </div>
        )}

        {/* 1. One next action */}
        <section data-tour="hero" className="hero-blue flex flex-wrap items-center gap-8 rounded-3xl p-9">
          <div className="doodles" style={{ "--dx": "-120px", "--dy": "-80px" } as React.CSSProperties} aria-hidden="true" />
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky">
              {greeting}
              {user.first_name ? `, ${user.first_name}` : ""}
            </p>
            <h1 className="text-[30px] font-bold leading-[38px]">
              {loadingReal
                ? "Getting your day ready…"
                : nextTask
                  ? `Next up: ${nextTask.title}`
                  : tasks.length
                    ? "All done for today!"
                    : "Add a subject to get started"}
            </h1>
            <p className="text-[15px] leading-6 text-white/90">
              {loadingReal
                ? "Sapphy is picking today's tasks."
                : nextTask
                  ? `${nextTask.subjectName}${nextTask.message ? ` · ${nextTask.message}` : ""}`
                  : tasks.length
                    ? `That's a perfect day. Come back tomorrow for new tasks${streakCount ? ` and keep your ${streakCount}-day streak going` : ""}.`
                    : "Pick a subject and Sapphy will set you three short tasks every day."}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              {nextTask ? (
                <Button
                  onClick={() => router.push(nextTask.href)}
                  className="h-11 rounded-2xl bg-accent px-6 font-semibold text-accent-foreground shadow-none hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Start
                </Button>
              ) : !tasks.length && !loadingReal ? (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="h-11 rounded-2xl bg-accent px-6 font-semibold text-accent-foreground shadow-none hover:bg-accent/90"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add a subject
                </Button>
              ) : null}
              {firstSubject ? (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/workspace/${firstSubject}`)}
                  className="min-h-11 text-white shadow-none hover:bg-white/15 hover:text-white"
                >
                  Ask Sapphy something else
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex w-[190px] flex-none flex-col gap-0.5 border-l border-white/30 pl-7">
            {daysToExam !== null ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-wide text-sky">
                  {examSubject ?? levelLabel} exam in
                </span>
                <span className="text-[44px] font-bold leading-[50px] tabular-nums">{daysToExam}</span>
                <span className="text-white/90">{daysToExam === 1 ? "day" : "days"}</span>
              </>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-wide text-sky">Exam countdown</span>
                <span className="text-white/90">Add your exam date and I'll count down with you.</span>
                {firstSubject && (
                  <Link href={`/workspace/${firstSubject}/resources?exam=1`} className="mt-1 text-sm font-semibold text-white underline underline-offset-4">
                    Set exam date
                  </Link>
                )}
              </>
            )}
          </div>
        </section>

        {/* 2. Today and this week */}
        <Card className="gap-[18px] rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">This week</h2>
            <span className="tabular-nums text-muted-foreground">
              {tasks.length ? `${tasksDone} of ${tasks.length} tasks done today` : ""}
            </span>
          </div>
          <div data-tour="week" className="grid grid-cols-7 gap-2.5">
            {(week.length ? week : Array.from({ length: 7 }, () => null)).map((d, n) =>
              d ? (
                <div
                  key={d.date}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3",
                    d.isToday ? "border-2 border-primary bg-primary/[0.08]" : "bg-muted/50",
                  )}
                  title={d.streakDay ? `${d.tasksCompleted} ${d.tasksCompleted === 1 ? "task" : "tasks"} done` : d.active ? "Logged on" : "No study"}
                >
                  <span className="text-xs text-muted-foreground">{d.weekday}</span>
                  <span className="text-lg font-semibold tabular-nums">{dayNumber(d.date)}</span>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      d.perfectDay ? "bg-streak" : d.streakDay ? "bg-status-success" : d.active ? "border border-primary" : "bg-transparent",
                    )}
                  />
                  <span className="sr-only">
                    {d.perfectDay ? "Perfect day" : d.streakDay ? "Streak day" : d.active ? "Logged on, no task done" : "No study"}
                  </span>
                </div>
              ) : (
                <div key={n} className="h-[86px] animate-pulse rounded-xl bg-muted/60" />
              ),
            )}
          </div>
          <div data-tour="tasks" className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Today's tasks from Sapphy
            </p>
            {loadingReal && [0, 1, 2].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
            {!loadingReal && tasks.length === 0 && (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Add a subject and Sapphy will set you three tasks each day.
              </p>
            )}
            {tasks.map((row) => (
              <button
                key={row.key}
                onClick={() => {
                  if (isDemo) setDemoDone((d) => (d.includes(row.key) ? d : [...d, row.key]))
                  router.push(row.href)
                }}
                className={cn("flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left", row.done && "opacity-75")}
                style={{ borderLeft: `4px solid ${TASK_STRIPE[row.type]}` }}
              >
                {row.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-status-success" aria-label="Done" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Not done yet" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("font-medium", row.done && "line-through")}>{row.title}</span>
                  {row.message && !row.done && <span className="text-xs text-muted-foreground">{row.message}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{row.subjectName}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
            {tasks.length > 0 && tasksDone === tasks.length && (
              <div className="rounded-lg border border-status-success/25 bg-status-success-subtle px-3 py-2 text-sm font-medium text-status-success">
                Perfect day! Every task done.
              </div>
            )}
          </div>
        </Card>

        {/* 3. Subjects */}
        <section data-tour="subjects" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold leading-8">Your subjects</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="text"
                  aria-label="Search subjects"
                  placeholder="Search subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-56 rounded-2xl bg-card pl-9 focus-visible:ring-2 focus-visible:ring-primary/70"
                />
              </div>
              <Button variant="outline" onClick={() => setShowAddDialog(true)} className="h-11 rounded-2xl shadow-none">
                <Plus className="size-4" aria-hidden="true" />
                Add subject
              </Button>
            </div>
          </div>

          {loadingReal ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
              {[0, 1].map((n) => (
                <div key={n} className="h-[190px] animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
              {filtered.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {searchQuery ? "No subjects found matching your search." : "No subjects yet. Add your first subject!"}
              </p>
            </div>
          )}
        </section>
      </main>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <SapphyFab activity="dashboard" subjectId={firstSubject ?? "csec-math"} content={fabContent} />

      <AddSubjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        level={level}
        enrolled={subjects.map((s) => s.id)}
        onAdded={(id) => {
          if (isDemo) setDemoSubjects((list) => (list.includes(id) ? list : [...list, id]))
          else refresh()
        }}
      />

      <LearningStyleDialog
        open={styleOpen}
        onDone={() => {
          setStyleDialogDone(true)
          setStyleOpen(false)
        }}
      />
      <SapphyGuide open={showGuide} firstName={user.first_name} onClose={finishGuide} />
    </div>
  )
}
