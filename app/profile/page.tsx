"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { quizHistoryService } from "@/lib/services/quiz-history-service"
import { useProfileStats } from "@/lib/hooks/use-me"
import { meService, taskRoute, type DailyTasks, type ProfileStats } from "@/lib/services/me-service"
import { subjectIdForName } from "@/lib/data/subjects"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Award, TrendingUp, Clock, AlertTriangle, Target, Brain, Flame, ShieldCheck, CheckCircle2, Circle } from "lucide-react"

// SAMPLE: the demo account (no backend session) shows the design's numbers in the same shape the
// backend returns. Signed-in students only ever see their own data from GET /api/me/stats.
const DEMO_STATS: ProfileStats = {
  streak: { current: 6, best: 11, todayDone: false, atRisk: true, history: [] },
  quizzesTaken: 14,
  averageScore: 74,
  flashcardSessions: 9,
  reelsWatched: 12,
  studyMinutes: 312,
  thisWeekMinutes: 95,
  lastWeekMinutes: 70,
  recallStrength: 68,
  topicMastery: [
    { topicId: 1, topicName: "Statistics", subjectId: 1, subjectName: "Mathematics", mastery: 86, status: "mastered", attempts: 9 },
    { topicId: 2, topicName: "Sets", subjectId: 1, subjectName: "Mathematics", mastery: 72, status: "reviewing", attempts: 6 },
    { topicId: 3, topicName: "Number Theory", subjectId: 1, subjectName: "Mathematics", mastery: 64, status: "learning", attempts: 7 },
    { topicId: 4, topicName: "Algebra", subjectId: 1, subjectName: "Mathematics", mastery: 51, status: "needs_review", attempts: 11 },
  ],
  knowledgeGaps: [
    { topicId: 4, topicName: "Algebra", subjectId: 1, subjectName: "Mathematics", mastery: 48, accuracy: 48, attempts: 11 },
  ],
  recentQuizzes: [
    { id: 1, title: "Algebra quiz", subjectId: 1, subjectName: "Mathematics", difficulty: "Medium", score: 4, totalQuestions: 5, percentage: 80, completedAt: "2026-10-14T10:00:00" },
    { id: 2, title: "Statistics quiz", subjectId: 1, subjectName: "Mathematics", difficulty: "Medium", score: 9, totalQuestions: 10, percentage: 90, completedAt: "2026-10-13T10:00:00" },
    { id: 3, title: "Sets quiz", subjectId: 1, subjectName: "Mathematics", difficulty: "Easy", score: 7, totalQuestions: 10, percentage: 70, completedAt: "2026-10-08T10:00:00" },
  ],
  subjects: [{ subjectId: 1, subjectName: "Mathematics" }],
}

const STATUS_LABEL: Record<string, string> = {
  mastered: "Mastered",
  reviewing: "Reviewing",
  learning: "Learning",
  needs_review: "Needs practice",
  not_started: "Not started",
}

const STYLE_LABEL: Record<string, string> = {
  visual: "Visual",
  auditory: "Auditory",
  kinesthetic: "Hands-on",
  reading: "Reading and writing",
}

const STYLE_TIPS: Record<string, string[]> = {
  visual: ["Watch a study reel before starting a new topic", "Turn your notes into mind maps"],
  auditory: ["Explain each topic out loud to Sapphy", "Read your notes aloud before a quiz"],
  kinesthetic: ["Start topics with a short quiz", "Do lots of practice questions"],
  reading: ["Rewrite each topic in your own words", "Make flashcards from your notes"],
}

const masteryTone = (level: number) => {
  if (level >= 80) return "border-status-success/30 bg-status-success-subtle text-status-success"
  if (level >= 60) return "border-primary/30 bg-primary/10 text-primary-strong"
  if (level >= 40) return "border-status-warning/40 bg-status-warning-subtle text-status-warning"
  return "border-destructive/30 bg-status-danger-subtle text-destructive"
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).toLocaleDateString() : ""

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)

// Same values the backend accepts (UpdateMeSchema). The form also sets how hard Sapphy's questions can get.
const GRADE_LEVELS = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower 6", "Upper 6"]
const SCHOOL_TYPES = ["Government", "Private", "Denominational", "Homeschool"]

/** Form and school type, saved to the account as soon as they're picked. */
function SchoolDetails() {
  const { user, updateSchoolDetails } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const save = (fields: { gradeLevel?: string; schoolType?: string }) => {
    setError(null)
    updateSchoolDetails(fields).catch((e) => setError(e?.message || "Couldn't save that. Please try again."))
  }
  const field = (id: string, label: string, value: string | null | undefined, options: string[], key: "gradeLevel" | "schoolType") => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {label}
      </Label>
      <Select value={value ?? undefined} onValueChange={(v) => save({ [key]: v })}>
        <SelectTrigger id={id} className="h-11 w-full rounded-xl">
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field("grade-level", "Form", user?.gradeLevel, GRADE_LEVELS, "gradeLevel")}
        {field("school-type", "School type", user?.schoolType, SCHOOL_TYPES, "schoolType")}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, isDemo } = useAuth()
  const router = useRouter()
  const { data, loading, error, refresh } = useProfileStats(!!user && !isDemo)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [today, setToday] = useState<DailyTasks | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push("/")
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || isDemo) return
    quizHistoryService.getFlashcardHistory(user.user_id, 20).then(setFlashcards).catch(() => setFlashcards([]))
    meService
      .dailyTasks()
      .then((r) => setToday(r.dailyTasks))
      .catch(() => setToday(null))
  }, [user, isDemo])

  const stats: ProfileStats | null = isDemo ? DEMO_STATS : data
  const subjectNames = useMemo(
    () => new Map((stats?.subjects ?? []).map((s) => [s.subjectId, s.subjectName])),
    [stats],
  )

  if (!user) return null

  const levelKey = String(user.level || (typeof window !== "undefined" ? localStorage.getItem("selectedLevel") : "") || "csec").toUpperCase()
  const workspaceFor = (subjectName: string | null | undefined, tool = "") => {
    const id = subjectIdForName(subjectName)
    return id ? `/workspace/${id}${tool ? `/${tool}` : ""}` : "/dashboard"
  }

  if (!stats) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-6">
        {error ? (
          <Card className="max-w-md rounded-2xl">
            <CardContent className="space-y-3 pt-6 text-center">
              <p className="text-muted-foreground">Couldn't load your learning profile. {error}</p>
              <Button className="min-h-11" onClick={refresh}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <Brain className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary" />
            <p className="text-muted-foreground">{loading ? "Loading your learning profile..." : "Getting things ready..."}</p>
          </div>
        )}
      </div>
    )
  }

  const gap = stats.knowledgeGaps[0]
  const weekDelta = stats.thisWeekMinutes - stats.lastWeekMinutes
  const style = user.learning_style ?? null

  return (
    <div className="min-h-screen bg-background">
      <header className="hdr">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="min-h-11 shadow-none">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <span className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Learning Profile</h1>
          </div>
          {user.accountType === "admin" && (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")} className="min-h-11 shadow-none">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin console
            </Button>
          )}
        </div>
      </header>
      <div className="container mx-auto max-w-7xl p-6 pt-7">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* User card */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky text-3xl font-bold text-white">
                {`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || <User className="h-12 w-12" />}
              </div>
              <CardTitle>
                {user.first_name} {user.last_name}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-semibold">{user.age ? `${user.age} years` : "–"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Level</p>
                  <p className="font-semibold">{levelKey}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Learning style</p>
                <Badge className="mt-1 border-transparent bg-primary/10 text-primary-strong">
                  {style ? STYLE_LABEL[style] : "Not set yet"}
                </Badge>
              </div>
              {!isDemo && <SchoolDetails />}
              {isDemo && (
                <Badge variant="secondary" className="w-full justify-center">
                  Demo account · sample numbers
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick stats</CardTitle>
              <CardDescription>Your learning at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <div className="text-2xl font-bold text-primary tabular-nums">{stats.quizzesTaken}</div>
                  <div className="text-xs text-muted-foreground">Quizzes</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <div className="text-2xl font-bold text-primary tabular-nums">{stats.flashcardSessions}</div>
                  <div className="text-xs text-muted-foreground">Flashcard sessions</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <Flame className="mx-auto mb-1 h-6 w-6 text-streak" />
                  <div className="text-2xl font-bold text-streak tabular-nums">{stats.streak.current}</div>
                  <div className="text-xs text-muted-foreground">Day streak · best {stats.streak.best}</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <Clock className="mx-auto mb-1 h-6 w-6 text-primary" />
                  <div className="text-2xl font-bold text-primary tabular-nums">{minutes(stats.studyMinutes)}</div>
                  <div className="text-xs text-muted-foreground">Study time</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="mb-2 text-xs text-muted-foreground">Average quiz score</div>
                  <span className="text-lg font-semibold">{stats.averageScore != null ? `${Math.round(stats.averageScore)}%` : "No quizzes yet"}</span>
                  <Progress value={stats.averageScore ?? 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="mb-2 text-xs text-muted-foreground">Recall strength</div>
                  <span className="text-lg font-semibold">{stats.recallStrength != null ? `${stats.recallStrength}%` : "Builds as you practise"}</span>
                  <Progress value={stats.recallStrength ?? 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weakest topic */}
          {gap && (
            <div role="alert" className="flex flex-wrap items-start gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning-subtle p-3.5 text-sm lg:col-span-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
              <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
                <b className="font-semibold">{gap.topicName ?? "A topic"} needs attention</b>
                <span className="text-muted-foreground">
                  {gap.subjectName}: {gap.mastery}% mastery after {gap.attempts} attempts. A short flashcard round will help.
                </span>
              </div>
              <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => router.push(workspaceFor(gap.subjectName, "flashcards"))}>
                Start drill
              </Button>
            </div>
          )}

          <div className="lg:col-span-3">
            <Tabs defaultValue="mastery" className="w-full">
              <TabsList className="grid w-full max-w-[640px] grid-cols-4 rounded-xl">
                <TabsTrigger value="mastery">Mastery</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="next">Next steps</TabsTrigger>
              </TabsList>

              {/* Mastery */}
              <TabsContent value="mastery" className="space-y-4">
                <div className="flex flex-wrap items-start gap-6">
                  <Card className="min-w-0 flex-[999_1_520px] rounded-2xl">
                    <CardHeader>
                      <CardTitle>Topic mastery</CardTitle>
                      <CardDescription>Topics you've practised most recently</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.topicMastery.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground">No topic data yet. Take a quiz or a flashcard round to start tracking mastery.</p>
                      ) : (
                        <div className="space-y-4">
                          {stats.topicMastery.map((t) => (
                            <div key={`${t.subjectId}-${t.topicId}`} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{t.topicName ?? "Topic"}</span>
                                  <p className="text-xs text-muted-foreground">{t.subjectName}</p>
                                </div>
                                <Badge variant="outline" className={cn("rounded-full", masteryTone(t.mastery))}>
                                  {STATUS_LABEL[t.status] ?? t.status}
                                </Badge>
                              </div>
                              <div className="mb-1 flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{t.mastery}% mastery</span>
                                <span>•</span>
                                <span>
                                  {t.attempts} {t.attempts === 1 ? "attempt" : "attempts"}
                                </span>
                              </div>
                              <Progress value={t.mastery} className="h-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="flex-[1_1_300px] rounded-2xl">
                    <CardHeader>
                      <CardTitle>Recent quizzes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stats.recentQuizzes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No quizzes yet. Take your first quiz to see it here.</p>
                      ) : (
                        stats.recentQuizzes.slice(0, 4).map((q) => (
                          <div key={q.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium">{q.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {q.subjectName} · {formatDate(q.completedAt)}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn("rounded-full tabular-nums", masteryTone(q.percentage ?? 0))}>
                              {q.percentage != null ? `${Math.round(q.percentage)}%` : "–"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {stats.knowledgeGaps.length > 0 && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Knowledge gaps
                      </CardTitle>
                      <CardDescription>Topics under 60% after several attempts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {stats.knowledgeGaps.map((g) => (
                          <Link key={`${g.subjectId}-${g.topicId}`} href={workspaceFor(g.subjectName, "quiz")}>
                            <Badge variant="outline" className="bg-destructive/10">
                              {g.topicName} · {g.mastery}%
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* History */}
              <TabsContent value="history" className="space-y-4">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Quiz history</CardTitle>
                    <CardDescription>Your recent quiz results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.recentQuizzes.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">No quiz history yet.</p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {stats.recentQuizzes.map((q) => (
                            <div key={q.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="outline">{q.subjectName}</Badge>
                                  <span className="text-sm font-medium">{q.title}</span>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>{formatDate(q.completedAt)}</span>
                                  <span>•</span>
                                  <span>
                                    {q.score} of {q.totalQuestions} correct · {q.difficulty}
                                  </span>
                                </div>
                              </div>
                              <Badge variant={(q.percentage ?? 0) >= 80 ? "default" : (q.percentage ?? 0) >= 50 ? "secondary" : "destructive"}>
                                {q.percentage != null ? `${Math.round(q.percentage)}%` : "–"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Flashcard sessions</CardTitle>
                    <CardDescription>Your flashcard practice</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isDemo || flashcards.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">
                        {isDemo ? "Flashcard history appears here for signed-in accounts." : "No flashcard sessions yet."}
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {flashcards.map((s: any) => (
                            <div key={s.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="outline">{subjectNames.get(s.subjectId) ?? "Subject"}</Badge>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>{formatDate(s.completedAt)}</span>
                                  <span>•</span>
                                  <span>
                                    {s.cardsMastered} of {s.cardsStudied} cards remembered
                                  </span>
                                </div>
                              </div>
                              <Badge variant="secondary">{Math.round((s.masteryRate || 0) * 100)}%</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insights */}
              <TabsContent value="insights" className="space-y-4">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      This week
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      You've studied <b>{minutes(stats.thisWeekMinutes)}</b> this week
                      {weekDelta > 0
                        ? `, ${minutes(weekDelta)} more than last week. Great momentum!`
                        : weekDelta < 0
                          ? `, ${minutes(-weekDelta)} less than last week.`
                          : stats.lastWeekMinutes
                            ? ", the same as last week."
                            : "."}
                    </p>
                    <p className="text-muted-foreground">
                      {stats.streak.todayDone
                        ? `Today already counts towards your ${stats.streak.current}-day streak.`
                        : stats.streak.current
                          ? `Finish one of today's tasks to keep your ${stats.streak.current}-day streak.`
                          : "Finish one of Sapphy's daily tasks today to start a streak."}
                    </p>
                    <p className="text-muted-foreground">
                      {stats.reelsWatched} study {stats.reelsWatched === 1 ? "reel" : "reels"} watched so far.
                    </p>
                  </CardContent>
                </Card>
                {style && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Tips for a {STYLE_LABEL[style].toLowerCase()} learner
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {STYLE_TIPS[style].map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Next steps */}
              <TabsContent value="next">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Today's tasks from Sapphy
                    </CardTitle>
                    <CardDescription>Picked from your own results. Finish one to keep your streak.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isDemo || !today || today.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {isDemo ? "Your daily tasks appear on the dashboard." : "No tasks yet. Add a subject on the dashboard to get started."}
                      </p>
                    ) : (
                      today.tasks.map((t) => {
                        const seg = taskRoute(t.type)
                        return (
                          <Link
                            key={t.id}
                            href={workspaceFor(t.subjectName, seg)}
                            className="flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-primary/50"
                          >
                            {t.done ? (
                              <CheckCircle2 className="size-5 shrink-0 text-status-success" aria-label="Done" />
                            ) : (
                              <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Not done yet" />
                            )}
                            <span className={cn("flex-1 font-medium", t.done && "line-through")}>{t.title}</span>
                            <span className="text-xs text-muted-foreground">{t.subjectName}</span>
                          </Link>
                        )
                      })
                    )}
                    {stats.knowledgeGaps.length > 0 && (
                      <div className="pt-3">
                        <h4 className="mb-2 text-sm font-medium">Focus topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {stats.knowledgeGaps.map((g) => (
                            <Button key={`${g.subjectId}-${g.topicId}`} size="sm" variant="outline" className="min-h-11 shadow-none" asChild>
                              <Link href={workspaceFor(g.subjectName, "quiz")}>Quiz: {g.topicName}</Link>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
