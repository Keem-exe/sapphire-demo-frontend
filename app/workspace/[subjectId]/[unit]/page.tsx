"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft, Menu, X } from "lucide-react"
import { NotebookSidebar } from "@/components/workspace/notebook-sidebar"
import { AiChatPanel } from "@/components/workspace/ai-chat-panel"
import { ToolsPanel } from "@/components/workspace/tools-panel"
import { NoteEditor } from "@/components/workspace/note-editor"
import { SUBJECTS } from "@/lib/data/subjects" // ✅ Import your real subject list

type SubjectId = keyof typeof SUBJECTS

interface Note {
  id: string
  title: string
  date: string
  preview: string
  content: string
  tags: string[]
}

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const unit = params.unit as string
  
  // ✅ Normalize route-based subject IDs
  const normalizeSubjectId = (id: string): string => {
    const map: Record<string, string> = {
      "csec-1": "csec-math",
      "csec-2": "csec-chem",
      "csec-3": "csec-eng",
      "cape-1": "cape-puremath",
      "cape-2": "cape-phys",
      "cape-3": "cape-bio",
    }
    return map[id] || id
  }

  const normalizedId = normalizeSubjectId(subjectId)
  const subject = SUBJECTS[normalizedId as SubjectId]

  // ✅ Handle missing or unknown subjects gracefully
  if (!subject) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-red-600 text-lg font-medium">
        ⚠️ Unknown subject ID: <span className="ml-2 text-foreground font-semibold">{subjectId}</span>
      </div>
    )
  }

  const [showNotebook, setShowNotebook] = useState(true)
  const [showTools, setShowTools] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNoteEditor, setShowNoteEditor] = useState(false)

  const unitNumber = unit ? unit.replace("unit-", "") : null

  const handleBack = () => {
    router.push("/dashboard")
  }

  const handleNoteSelect = (note: Note | null) => {
    setSelectedNote(note)
    setShowNoteEditor(true)
  }

  const handleNewNote = () => {
    setSelectedNote(null)
    setShowNoteEditor(true)
  }

  const handleCloseEditor = () => {
    setShowNoteEditor(false)
    setSelectedNote(null)
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
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{subject.name}</h1>
                  {unitNumber && <p className="text-xs text-muted-foreground">Unit {unitNumber}</p>}
                </div>
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
          <NotebookSidebar
            subjectId={normalizedId} // ✅ Use normalized subject
            unit={unitNumber}
            onNoteSelect={handleNoteSelect}
            onNewNote={handleNewNote}
          />
        </div>

        {/* Center Panel - AI Chat or Note Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showNoteEditor ? (
            <NoteEditor note={selectedNote} onClose={handleCloseEditor} />
          ) : (
            <AiChatPanel subjectName={`${subject.name}${unitNumber ? ` - Unit ${unitNumber}` : ""}`} />
          )}
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
