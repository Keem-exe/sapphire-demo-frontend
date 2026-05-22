"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, ArrowLeft, Menu, NotebookText, Brain, Video, Layers, User } from "lucide-react"
import { NotebookSidebar } from "@/components/workspace/notebook-sidebar"
import { NoteEditor } from "@/components/workspace/note-editor"
import { AiChatPanel } from "@/components/workspace/ai-chat-panel"
import { ToolsPanel } from "@/components/workspace/tools-panel"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"

interface Note {
  id: string
  title: string
  date: string
  preview: string
  content: string
  tags: string[]
}

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
  const [activeMobileTab, setActiveMobileTab] = useState<"notebook" | "tools" | "coach">("notebook")
  const [isHydrating, setIsHydrating] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])

  // Load notes from localStorage
  useEffect(() => {
    const storageKey = `sapphire_notes_${subjectId}`
    const storedNotes = localStorage.getItem(storageKey)
    if (storedNotes) {
      try {
        setNotes(JSON.parse(storedNotes))
      } catch (e) {
        console.error('Failed to load notes:', e)
      }
    }
    setTimeout(() => setIsHydrating(false), 180)
  }, [subjectId])

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      const storageKey = `sapphire_notes_${subjectId}`
      localStorage.setItem(storageKey, JSON.stringify(notes))
    }
  }, [notes, subjectId])

  const handleNoteSelect = (note: Note | null) => {
    setSelectedNote(note)
    setIsCreatingNote(false)
  }

  const handleNewNote = () => {
    setSelectedNote(null)
    setIsCreatingNote(true)
  }

  const handleNoteSave = (note: Note) => {
    setNotes((prevNotes) => {
      const existingIndex = prevNotes.findIndex((n) => n.id === note.id)
      if (existingIndex >= 0) {
        // Update existing note
        const updated = [...prevNotes]
        updated[existingIndex] = note
        return updated
      } else {
        // Add new note
        return [note, ...prevNotes]
      }
    })
    setSelectedNote(note)
    setIsCreatingNote(false)
  }

  const handleNoteDelete = (noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((n) => n.id !== noteId))
    if (selectedNote?.id === noteId) {
      setSelectedNote(null)
      setIsCreatingNote(false)
    }
  }

  const handleEditorClose = () => {
    setSelectedNote(null)
    setIsCreatingNote(false)
  }

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
    <div className="h-screen flex flex-col bg-background pb-16 lg:pb-0">
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
                className="rounded-lg lg:hidden min-h-11 focus-visible:ring-2 focus-visible:ring-primary/70"
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

      {/* Subject Navigation */}
      <div className="border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <Button size="sm" className="rounded-full min-h-11 bg-blue-600 hover:bg-blue-500 text-white focus-visible:ring-2 focus-visible:ring-blue-300" onClick={() => router.push(`/workspace/${subjectId}`)}>
              <NotebookText className="w-4 h-4 mr-2" />
              Notebook
            </Button>
            <Button size="sm" variant="outline" className="rounded-full min-h-11 border-blue-300 text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-300" onClick={() => router.push(`/workspace/${subjectId}/quiz`)}>
              <Brain className="w-4 h-4 mr-2" />
              Quiz
            </Button>
            <Button size="sm" variant="outline" className="rounded-full min-h-11 border-pink-300 text-pink-700 hover:bg-pink-50 focus-visible:ring-2 focus-visible:ring-pink-300" onClick={() => router.push(`/workspace/${subjectId}/reels`)}>
              <Video className="w-4 h-4 mr-2" />
              Reels
            </Button>
            <Button size="sm" variant="outline" className="rounded-full min-h-11 border-green-300 text-green-700 hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-green-300" onClick={() => router.push(`/workspace/${subjectId}/flashcards`)}>
              <Layers className="w-4 h-4 mr-2" />
              Flashcards
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full min-h-11 focus-visible:ring-2 focus-visible:ring-primary/70" onClick={() => router.push("/profile")}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Subject Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        {isHydrating ? (
          <div className="absolute inset-x-0 top-[116px] bottom-0 p-4 bg-background/80 z-10 animate-pulse">
            <div className="grid lg:grid-cols-[320px_1fr_320px] gap-4 h-full">
              <div className="rounded-2xl bg-muted/60" />
              <div className="rounded-2xl bg-muted/60" />
              <div className="rounded-2xl bg-muted/60" />
            </div>
          </div>
        ) : null}

        {/* Left Panel - Notebook Index */}
        <div
          className={`${
            showNotebook ? "w-80" : "w-0"
          } hidden lg:flex transition-all duration-300 border-r bg-card/30 backdrop-blur-sm overflow-hidden flex-col`}
        >
          <div className="px-4 py-2 border-b bg-background/70">
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Section 1</p>
            <p className="text-sm font-medium text-foreground">Notebook Index</p>
          </div>
          <NotebookSidebar 
            subjectId={subjectId} 
            notes={notes}
            onNoteSelect={handleNoteSelect}
            onNewNote={handleNewNote}
            onNoteDelete={handleNoteDelete}
          />
        </div>

        {/* Center Panel - Notebook First */}
        <div className="flex-1 flex flex-col overflow-hidden lg:border-x border-border/50">
          <div className="border-b px-4 py-3 bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Section 2</p>
                <p className="text-sm font-semibold text-foreground">Focus Notebook</p>
                <p className="text-xs text-foreground/75">Capture ideas first, then use AI and tools.</p>
              </div>
              <Badge variant="secondary">{notes.length} notes</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-hidden hidden lg:block">
            <NoteEditor 
              note={isCreatingNote ? null : selectedNote}
              onSave={handleNoteSave}
              onClose={handleEditorClose}
              isCreatingNote={isCreatingNote}
              subjectId={subjectId}
            />
          </div>

          <div className="flex-1 overflow-hidden lg:hidden">
            {activeMobileTab === "notebook" ? (
              <NoteEditor 
                note={isCreatingNote ? null : selectedNote}
                onSave={handleNoteSave}
                onClose={handleEditorClose}
                isCreatingNote={isCreatingNote}
                subjectId={subjectId}
              />
            ) : null}
            {activeMobileTab === "tools" ? <ToolsPanel /> : null}
            {activeMobileTab === "coach" ? <AiChatPanel subjectName={subject.name} /> : null}
          </div>
        </div>

        {/* Right Panel - Tools + AI Coach */}
        <div
          className={`${
            showTools ? "w-80" : "w-0"
          } hidden lg:flex transition-all duration-300 border-l bg-card/30 backdrop-blur-sm overflow-hidden flex-col`}
        >
          <div className="px-4 py-2 border-b bg-background/70">
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Section 3</p>
            <p className="text-sm font-medium text-foreground">Tools, Coach, Syllabus</p>
          </div>
          <Tabs defaultValue="tools" className="h-full">
            <div className="p-3 border-b bg-background/70">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="coach">AI Coach</TabsTrigger>
                <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tools" className="h-full mt-0">
              <div className="h-full overflow-hidden">
                <ToolsPanel />
              </div>
            </TabsContent>

            <TabsContent value="coach" className="h-full mt-0">
              <div className="h-full overflow-hidden">
                <AiChatPanel subjectName={subject.name} />
              </div>
            </TabsContent>

            <TabsContent value="syllabus" className="h-full mt-0">
              <div className="p-3 overflow-auto h-full">
                {subjectId === "csec-math" && subject.syllabus ? (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">CSEC Mathematics Syllabus</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                      <div>
                        <p className="font-semibold text-foreground mb-2">Major Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.syllabus.majorTopics.map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-[11px]">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-2">Goals</p>
                        <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                          {subject.syllabus.goals.map((goal) => (
                            <li key={goal}>{goal}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-2">Skill Weighting</p>
                        <div className="space-y-1.5 text-muted-foreground">
                          <p>Algorithmic: {subject.syllabus.skillWeighting.algorithmic}%</p>
                          <p>Conceptual: {subject.syllabus.skillWeighting.conceptual}%</p>
                          <p>Reasoning: {subject.syllabus.skillWeighting.reasoning}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Syllabus details are being prepared for this subject.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-sm px-3 py-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant={activeMobileTab === "notebook" ? "default" : "outline"}
            onClick={() => setActiveMobileTab("notebook")}
            className="min-h-11 rounded-xl"
          >
            <NotebookText className="w-4 h-4 mr-1" />
            Notebook
          </Button>
          <Button
            size="sm"
            variant={activeMobileTab === "tools" ? "default" : "outline"}
            onClick={() => setActiveMobileTab("tools")}
            className="min-h-11 rounded-xl"
          >
            <Layers className="w-4 h-4 mr-1" />
            Tools
          </Button>
          <Button
            size="sm"
            variant={activeMobileTab === "coach" ? "default" : "outline"}
            onClick={() => setActiveMobileTab("coach")}
            className="min-h-11 rounded-xl"
          >
            <Brain className="w-4 h-4 mr-1" />
            Coach
          </Button>
        </div>
      </div>
    </div>
  )
}
