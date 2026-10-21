"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { SubjectCard } from "@/components/subject-card"
import { CapeSubjectCard } from "@/components/cape-subject-card"
import { AddSubjectDialog } from "@/components/add-subject-dialog"
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
  Target,
  Video,
  Layers,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react"
import { SapphyFab } from "@/components/sapphy-fab"
import { FeedbackDialog } from "@/components/feedback/feedback-dialog"

// Initial CSEC subjects
const INITIAL_CSEC_SUBJECTS = [
  {
    id: "csec-math",
    name: "Mathematics",
    icon: "📐",
    color: "from-blue-500 to-cyan-500",
    progress: 65,
    lastStudied: "2 hours ago",
    topics: 24,
    type: "csec" as const,
  },
  {
    id: "csec-eng",
    name: "English A",
    icon: "📚",
    color: "from-purple-500 to-pink-500",
    progress: 45,
    lastStudied: "1 day ago",
    topics: 18,
    type: "csec" as const,
  },
  {
    id: "csec-chem",
    name: "Chemistry",
    icon: "🧪",
    color: "from-green-500 to-emerald-500",
    progress: 80,
    lastStudied: "3 hours ago",
    topics: 32,
    type: "csec" as const,
  },
]

// Initial CAPE subjects
const INITIAL_CAPE_SUBJECTS = [
  {
    id: "cape-puremath",
    name: "Pure Mathematics",
    icon: "📐",
    color: "from-blue-500 to-cyan-500",
    type: "cape" as const,
    units: [
      {
        unitNumber: 1,
        progress: 55,
        lastStudied: "5 hours ago",
        topics: 15,
      },
      {
        unitNumber: 2,
        progress: 40,
        lastStudied: "1 day ago",
        topics: 18,
      },
    ],
  },
  {
    id: "cape-phys",
    name: "Physics",
    icon: "⚡",
    color: "from-orange-500 to-red-500",
    type: "cape" as const,
    units: [
      {
        unitNumber: 1,
        progress: 70,
        lastStudied: "3 hours ago",
        topics: 12,
      },
      {
        unitNumber: 2,
        progress: 60,
        lastStudied: "6 hours ago",
        topics: 14,
      },
    ],
  },
  {
    id: "cape-bio",
    name: "Biology",
    icon: "🧬",
    color: "from-teal-500 to-green-500",
    type: "cape" as const,
    units: [
      {
        unitNumber: 1,
        progress: 85,
        lastStudied: "2 hours ago",
        topics: 16,
      },
      {
        unitNumber: 2,
        progress: 75,
        lastStudied: "4 hours ago",
        topics: 17,
      },
    ],
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<"csec" | "cape" | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [celebration, setCelebration] = useState("")
  const [dailyStreak] = useState(6)
  const [todayTasks, setTodayTasks] = useState([
    { id: "quiz", label: "Complete one quiz sprint", done: false },
    { id: "reel", label: "Watch one study reel", done: false },
    { id: "flash", label: "Run one flashcard drill", done: false },
  ])
  const { user, logout } = useAuth()

  const [csecSubjects, setCsecSubjects] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("csecSubjects")
      return stored ? JSON.parse(stored) : INITIAL_CSEC_SUBJECTS
    }
    return INITIAL_CSEC_SUBJECTS
  })

  const [capeSubjects, setCapeSubjects] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("capeSubjects")
      return stored ? JSON.parse(stored) : INITIAL_CAPE_SUBJECTS
    }
    return INITIAL_CAPE_SUBJECTS
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("csecSubjects", JSON.stringify(csecSubjects))
    }
  }, [csecSubjects])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("capeSubjects", JSON.stringify(capeSubjects))
    }
  }, [capeSubjects])

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    const level = localStorage.getItem("selectedLevel") as "csec" | "cape" | null
    if (!level) {
      router.push("/select-level")
    } else {
      setSelectedLevel(level)
      setTimeout(() => setIsBooting(false), 250)
    }
  }, [router, user])

  const handleAddSubject = (newSubject: any) => {
    if (selectedLevel === "csec") {
      setCsecSubjects([...csecSubjects, newSubject])
    } else if (selectedLevel === "cape") {
      setCapeSubjects([...capeSubjects, newSubject])
    }
  }

  const filteredCsecSubjects =
    selectedLevel === "csec"
      ? csecSubjects.filter((subject: any) => subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : []

  const filteredCapeSubjects =
    selectedLevel === "cape"
      ? capeSubjects.filter((subject: any) => subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : []

  const activeSubjects = selectedLevel === "csec" ? filteredCsecSubjects : filteredCapeSubjects
  const focusSubject = activeSubjects[0] || null
  const averageProgress = activeSubjects.length
    ? Math.round(
        activeSubjects.reduce((sum: number, subject: any) => {
          if (subject.type === "cape") {
            const unitAvg =
              subject.units.reduce((unitSum: number, unit: any) => unitSum + unit.progress, 0) /
              Math.max(subject.units.length, 1)
            return sum + unitAvg
          }
          return sum + (subject.progress || 0)
        }, 0) / activeSubjects.length
      )
    : 0

  const totalTopics = activeSubjects.reduce((sum: number, subject: any) => {
    if (subject.type === "cape") {
      return sum + subject.units.reduce((unitSum: number, unit: any) => unitSum + unit.topics, 0)
    }
    return sum + (subject.topics || 0)
  }, 0)

  const quickActions = focusSubject
    ? [
        {
          label: "Start Quiz Sprint",
          description: "Jump straight into a focused quiz session.",
          icon: Target,
          color: "from-blue-500 to-cyan-500",
          path: `/workspace/${focusSubject.id}/quiz`,
        },
        {
          label: "Watch Study Reels",
          description: "Get short concept videos to warm up fast.",
          icon: Video,
          color: "from-pink-500 to-rose-500",
          path: `/workspace/${focusSubject.id}/reels`,
          taskId: "reel",
        },
        {
          label: "Flashcard Drill",
          description: "Train memory with rapid review cards.",
          icon: Layers,
          color: "from-emerald-500 to-teal-500",
          path: `/workspace/${focusSubject.id}/flashcards`,
          taskId: "flash",
        },
      ]
    : []

  const primaryAction = quickActions[0] || null
  const secondaryActions = quickActions.slice(1)

  const nextMilestone = Math.max(0, 70 - averageProgress)
  const tasksDone = todayTasks.filter((task) => task.done).length

  const handlePrimaryStart = () => {
    if (!primaryAction) return

    setTodayTasks((previous) => previous.map((task) => (task.id === "quiz" ? { ...task, done: true } : task)))
    setCelebration("Nice win. Momentum unlocked.")
    setTimeout(() => router.push(primaryAction.path), 120)
  }

  const handleSecondaryAction = (path: string, taskId?: string) => {
    if (taskId) {
      setTodayTasks((previous) => previous.map((task) => (task.id === taskId ? { ...task, done: true } : task)))
      setCelebration("Great move. Keep stacking wins.")
    }
    setTimeout(() => router.push(path), 120)
  }

  const handleChangeLevel = () => {
    localStorage.removeItem("selectedLevel")
    router.push("/select-level")
  }

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
  })()
  const levelLabel = selectedLevel === "csec" ? "CSEC" : "CAPE"
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "ME"
  // SAMPLE: the week strip and exam countdown have no backend data yet.
  const weekDays = [
    { day: "Mon", date: "12", state: "past", has: true },
    { day: "Tue", date: "13", state: "past", has: true },
    { day: "Wed", date: "14", state: "today", has: true },
    { day: "Thu", date: "15", state: "future", has: true },
    { day: "Fri", date: "16", state: "future", has: true },
    { day: "Sat", date: "17", state: "future", has: true },
    { day: "Sun", date: "18", state: "future", has: false },
  ]
  const todayRows = quickActions.map((action) => ({
    ...action,
    subjectName: focusSubject?.name ?? "",
    stripe: action.taskId === "flash" ? "var(--tool-flashcards)" : "var(--tool-quiz)",
  }))

  if (!selectedLevel) {
    return null
  }

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
              onClick={handleChangeLevel}
              aria-label={`Switch level, currently ${levelLabel}`}
              className="min-h-11 gap-1 shadow-none"
            >
              {levelLabel}
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <nav className="flex items-center gap-2.5" aria-label="Account">
            <Badge variant="secondary" className="h-8 gap-1.5 px-3 text-[13px]" title="Study streak">
              <Flame className="size-4 text-streak" aria-hidden="true" />
              <span className="tabular-nums">{dailyStreak}-day streak</span>
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
                <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                  <MessageSquarePlus className="size-4" /> Feedback
                </DropdownMenuItem>
                {user?.accountType === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <ShieldCheck className="size-4" /> Admin console
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push("/engine-demo")}>
                  <Brain className="size-4" /> Engine Demo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pb-16 pt-7">
        {isBooting ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-40 rounded-3xl bg-muted/60" />
          </div>
        ) : null}

        {/* 1. One next action */}
        <section className="hero-blue flex flex-wrap items-center gap-8 rounded-3xl p-9">
          <div className="doodles" style={{ "--dx": "-120px", "--dy": "-80px" } as React.CSSProperties} aria-hidden="true" />
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky">
              {greeting}
              {user?.first_name ? `, ${user.first_name}` : ""}
            </p>
            <h1 className="text-[30px] font-bold leading-[38px]">
              {primaryAction ? `Next up: ${primaryAction.label.replace(/^Start /, "")}` : "Add a subject to get started"}
            </h1>
            <p className="text-[15px] leading-6 text-white/90">
              {focusSubject
                ? `${focusSubject.name} · about 8 minutes. ${nextMilestone > 0 ? `${Math.ceil(nextMilestone / 5)} sessions to 70% mastery.` : "You're at mastery momentum."}`
                : "Your subjects will appear here."}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              {primaryAction ? (
                <Button
                  onClick={handlePrimaryStart}
                  className="h-11 rounded-2xl bg-accent px-6 font-semibold text-accent-foreground shadow-none hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Start
                </Button>
              ) : null}
              {focusSubject ? (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/workspace/${focusSubject.id}`)}
                  className="min-h-11 text-white shadow-none hover:bg-white/15 hover:text-white"
                >
                  Ask Sapphy something else
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex w-[190px] flex-none flex-col gap-0.5 border-l border-white/30 pl-7">
            <span className="text-xs font-semibold uppercase tracking-wide text-sky">{levelLabel} exams in</span>
            <span className="text-[44px] font-bold leading-[50px] tabular-nums">208</span>
            <span className="text-white/90">days</span>
          </div>
        </section>

        {/* 2. This week */}
        <Card className="gap-[18px] rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">This week</h2>
            <span className="tabular-nums text-muted-foreground">
              {tasksDone} of {todayTasks.length} sessions done today
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2.5">
            {weekDays.map((d) => (
              <div
                key={d.day}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3",
                  d.state === "today" ? "border-2 border-primary bg-primary/[0.08]" : d.state === "past" ? "bg-muted/50" : "bg-card",
                )}
              >
                <span className="text-xs text-muted-foreground">{d.day}</span>
                <span className="text-lg font-semibold tabular-nums">{d.date}</span>
                <span
                  className={cn("size-2 rounded-full", !d.has ? "bg-transparent" : d.state === "past" ? "bg-status-success" : "bg-primary")}
                />
              </div>
            ))}
          </div>
          {todayRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
              {todayRows.map((row) => (
                <button
                  key={row.label}
                  onClick={() => handleSecondaryAction(row.path, row.taskId)}
                  className="flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left"
                  style={{ borderLeft: `4px solid ${row.stripe}` }}
                >
                  <span className="flex-1 font-medium">{row.label}</span>
                  <span className="text-xs text-muted-foreground">{row.subjectName}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          {celebration ? (
            <div className="rounded-lg border border-status-success/25 bg-status-success-subtle px-3 py-2 text-sm font-medium text-status-success">
              {celebration}
            </div>
          ) : null}
        </Card>

        {/* 3. Subjects */}
        <section className="flex flex-col gap-5">
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

          {selectedLevel === "csec" && filteredCsecSubjects.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
              {filteredCsecSubjects.map((subject: any) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}

          {selectedLevel === "cape" && filteredCapeSubjects.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
              {filteredCapeSubjects.map((subject: any) => (
                <CapeSubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}

          {filteredCsecSubjects.length === 0 && filteredCapeSubjects.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {searchQuery ? "No subjects found matching your search." : "No subjects yet. Add your first subject!"}
              </p>
            </div>
          )}
        </section>
      </main>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <SapphyFab activity="dashboard" subjectId={selectedLevel === "cape" ? "cape-puremath" : "csec-math"} />

      {/* Add Subject Dialog */}
      <AddSubjectDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddSubject={handleAddSubject}
        level={selectedLevel}
      />
    </div>
  )
}
