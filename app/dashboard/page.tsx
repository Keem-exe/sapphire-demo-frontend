"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SubjectCard } from "@/components/subject-card"
import { CapeSubjectCard } from "@/components/cape-subject-card"
import { AddSubjectDialog } from "@/components/add-subject-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Plus, Search, LogOut, ArrowLeft, Brain, User } from "lucide-react"

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
                className="text-primary border-primary/20 hover:bg-primary/10"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/engine-demo")}
                className="text-primary border-primary/20 hover:bg-primary/10"
              >
                <Brain className="w-4 h-4 mr-2" />
                Engine Demo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeLevel}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Level
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back{user?.first_name ? `, ${user.first_name}` : ", Student"}!
          </h2>
          <p className="text-muted-foreground text-lg">
            {selectedLevel === "csec" ? "Ready to ace your CSEC exams?" : "Ready to master your CAPE units?"}
          </p>
        </div>

        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-2"
            />
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Subject
          </Button>
        </div>

        {selectedLevel === "csec" && filteredCsecSubjects.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-foreground">My Subjects</h3>
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
              <h3 className="text-2xl font-bold text-foreground">My Subjects</h3>
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
