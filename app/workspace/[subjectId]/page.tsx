"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft, Menu, X } from "lucide-react"
import { NotebookSidebar } from "@/components/workspace/notebook-sidebar"
import { AiChatPanel } from "@/components/workspace/ai-chat-panel"
import { ToolsPanel } from "@/components/workspace/tools-panel"

// Mock subject data
const SUBJECTS: Record<string, { name: string; icon: string; color: string }> = {
  "1": { name: "Mathematics", icon: "📐", color: "from-blue-500 to-cyan-500" },
  "2": { name: "English A", icon: "📚", color: "from-purple-500 to-pink-500" },
  "3": { name: "Chemistry", icon: "🧪", color: "from-green-500 to-emerald-500" },
  "4": { name: "Physics", icon: "⚡", color: "from-orange-500 to-red-500" },
  "5": { name: "Biology", icon: "🧬", color: "from-teal-500 to-green-500" },
  "6": { name: "History", icon: "🏛️", color: "from-amber-500 to-yellow-500" },
}

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const subject = SUBJECTS[subjectId] || { name: "Unknown", icon: "📚", color: "from-primary to-secondary" }

  const [showNotebook, setShowNotebook] = useState(true)
  const [showTools, setShowTools] = useState(true)

  const handleBack = () => {
    router.push("/dashboard")
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
                <span className="text-2xl">{subject.icon}</span>
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
