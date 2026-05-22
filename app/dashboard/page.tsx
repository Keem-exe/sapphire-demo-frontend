"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SubjectCard } from "@/components/subject-card"
import { CapeSubjectCard } from "@/components/cape-subject-card"
import { AddSubjectDialog } from "@/components/add-subject-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Sparkles,
  Plus,
  Search,
  LogOut,
  ArrowLeft,
  Brain,
  User,
  Flame,
  Target,
  Video,
  Layers,
  CheckCircle2,
} from "lucide-react"

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

  if (!selectedLevel) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sapphire
                </h1>
                <p className="text-xs text-muted-foreground">
                  {selectedLevel === "csec" ? "CSEC" : "CAPE"} Study Companion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile")}
                className="text-primary border-primary/20 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/70 min-h-11"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/engine-demo")}
                className="text-primary border-primary/20 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/70 min-h-11"
              >
                <Brain className="w-4 h-4 mr-2" />
                Engine Demo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeLevel}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/70 min-h-11"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Level
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/70 min-h-11"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isBooting ? (
          <div className="space-y-6 mb-8 animate-pulse">
            <div className="h-40 rounded-3xl bg-muted/60" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 rounded-2xl bg-muted/60" />
              <div className="h-24 rounded-2xl bg-muted/60" />
              <div className="h-24 rounded-2xl bg-muted/60" />
            </div>
          </div>
        ) : null}

        {/* Mission Hero */}
        <div className="mb-8 rounded-3xl border bg-gradient-to-r from-primary/15 via-background to-secondary/15 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Today&apos;s Mission</p>
              <h2 className="text-3xl font-bold text-foreground mt-2">
                {user?.first_name ? `${user.first_name}, stay in momentum.` : "Stay in momentum."}
              </h2>
              <p className="text-foreground/85 text-base mt-2 max-w-xl">
                Build daily consistency with fast wins first. Dashboard now leads with action so you can study before distractions.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  <Flame className="w-3 h-3 mr-1" />
                  Momentum Mode
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-xs">
                  {selectedLevel === "csec" ? "CSEC Focus" : "CAPE Focus"}
                </Badge>
                <Badge variant="outline" className="px-3 py-1 text-xs">
                  {nextMilestone > 0 ? `${Math.ceil(nextMilestone / 5)} sessions to 70% mastery` : "At mastery momentum"}
                </Badge>
              </div>

              {primaryAction ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handlePrimaryStart}
                    className="min-h-11 rounded-xl px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-semibold shadow-xl focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Start Now: {primaryAction.label}
                  </Button>
                  {secondaryActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        onClick={() => handleSecondaryAction(action.path, action.taskId)}
                        className="min-h-11 rounded-xl border-muted-foreground/30 text-foreground/90 hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/70"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <Card className="w-full md:w-[280px] border-primary/20 shadow-lg">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Progress</span>
                  <span className="font-semibold text-primary">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subjects Active</span>
                  <span className="font-semibold">{activeSubjects.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Topics in Rotation</span>
                  <span className="font-semibold">{totalTopics}</span>
                </div>
                <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary font-medium">
                  Next milestone: {nextMilestone > 0 ? `Finish this topic today and move ${nextMilestone}% closer.` : "Maintain mastery with one review set."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Win Streak */}
        <Card className="mb-8 border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Quick-Win Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-foreground/90">Daily streak: <span className="font-semibold text-orange-600">{dailyStreak} days</span></p>
              <p className="text-muted-foreground">{tasksDone}/3 tasks today</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {todayTasks.map((task) => (
                <div key={task.id} className="rounded-lg border px-3 py-2 text-sm flex items-center gap-2 bg-background/60">
                  <CheckCircle2 className={`w-4 h-4 ${task.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className={task.done ? "text-foreground font-medium" : "text-muted-foreground"}>{task.label}</span>
                </div>
              ))}
            </div>
            {celebration ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-700 font-medium">
                {celebration}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-2 focus-visible:ring-2 focus-visible:ring-primary/70"
            />
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Subject
          </Button>
        </div>

        {selectedLevel === "csec" && filteredCsecSubjects.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-foreground">Subject Hub</h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCsecSubjects.map((subject: any) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          </div>
        )}

        {selectedLevel === "cape" && filteredCapeSubjects.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-foreground">Subject Hub</h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCapeSubjects.map((subject: any) => (
                <CapeSubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          </div>
        )}

        {filteredCsecSubjects.length === 0 && filteredCapeSubjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "No subjects found matching your search." : "No subjects yet. Add your first subject!"}
            </p>
          </div>
        )}
      </main>

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
