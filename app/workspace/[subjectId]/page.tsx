"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft, Menu, X } from "lucide-react"
import { NotebookSidebar } from "@/components/workspace/notebook-sidebar"
import { AiChatPanel } from "@/components/workspace/ai-chat-panel"
import { ToolsPanel } from "@/components/workspace/tools-panel"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"

const normalizeSubjectId = (id: string): SubjectId => {
  const map: Record<string, SubjectId> = {
    "1": "csec-math",
    "2": "csec-eng",
    "3": "csec-chem",
    "4": "cape-phys",
    "5": "cape-bio",
    "6": "cape-puremath",
  };
  return (map[id] || id) as SubjectId;
};

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params.subjectId as string
  const subjectId = useMemo(() => normalizeSubjectId(rawId), [rawId])
  const subject = SUBJECTS[subjectId]

  // Canonicalize URL
  useEffect(() => {
    if (rawId && rawId !== subjectId) {
      router.replace(`/workspace/${subjectId}`)
    }
  }, [rawId, subjectId, router])

  const [showNotebook, setShowNotebook] = useState(true)
  const [showTools, setShowTools] = useState(true)

  const handleBack = () => {
    router.push("/dashboard")
  }

  if (!subject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Unknown Subject</h1>
          <p className="text-muted-foreground mt-2">Subject ID: {subjectId}</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">📚</span>
                <h1 className="text-lg font-semibold text-foreground">{subject.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotebook(!showNotebook)}
                className="rounded-lg lg:hidden"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Three-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Notebook Sidebar */}
        <div
          className={`${
            showNotebook ? "w-80" : "w-0"
          } transition-all duration-300 border-r bg-card/30 backdrop-blur-sm overflow-hidden`}
        >
          <NotebookSidebar subjectId={subjectId} />
        </div>

        {/* Center Panel - AI Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AiChatPanel subjectName={subject.name} />
        </div>

        {/* Right Panel - Tools */}
        <div
          className={`${
            showTools ? "w-80" : "w-0"
          } transition-all duration-300 border-l bg-card/30 backdrop-blur-sm overflow-hidden`}
        >
          <ToolsPanel />
        </div>
      </div>

      {/* Toggle Buttons for Mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 flex flex-col gap-2 z-30">
        <Button
          size="sm"
          onClick={() => setShowNotebook(!showNotebook)}
          className="rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          {showNotebook ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
