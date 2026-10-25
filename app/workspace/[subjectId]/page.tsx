"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { NotebookSidebar } from "@/components/workspace/notebook-sidebar"
import { NoteEditor } from "@/components/workspace/note-editor"
import { AiChatPanel } from "@/components/workspace/ai-chat-panel"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { SUBJECTS, normalizeSubjectId } from "@/lib/data/subjects"
import { useSubjectTopics } from "@/lib/services/subject-topics"
import { useSubjectOverview } from "@/lib/hooks/use-me"
import { hasAuthToken } from "@/lib/services/backend-subject-map"

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
  const rawId = params.subjectId as string
  const subjectId = useMemo(() => normalizeSubjectId(rawId), [rawId])
  const subject = SUBJECTS[subjectId]
  // Real topics (syllabus order) and real stats for signed-in students; the demo gets sample data.
  const subjectTopics = useSubjectTopics(subjectId)
  const overview = useSubjectOverview(subjectTopics.backendSubjectId)
  const live = typeof window !== "undefined" && hasAuthToken()

  // Canonicalize URL
  useEffect(() => {
    if (rawId && rawId !== subjectId) {
      router.replace(`/workspace/${subjectId}`)
    }
  }, [rawId, subjectId, router])

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
    <WorkspaceShell
      subjectId={subjectId}
      subjectName={subject.name}
      subjectEmoji={subject.icon}
      levelLabel={subject.level.toUpperCase()}
      topics={subjectTopics.names}
      stats={overview.data}
      statsLoading={live && (subjectTopics.loading || overview.loading) && !overview.data}
      backendSubjectId={subjectTopics.backendSubjectId}
      noteTitles={notes.map((n) => n.title)}
      onBack={handleBack}
      notebook={
        <>
          <div className="flex min-w-[220px] max-w-[260px] flex-[1_1_220px] flex-col border-r">
            <NotebookSidebar
              subjectId={subjectId}
              notes={notes}
              onNoteSelect={handleNoteSelect}
              onNewNote={handleNewNote}
              onNoteDelete={handleNoteDelete}
            />
          </div>
          <div className="min-w-0 flex-[999_1_360px]">
            <NoteEditor
              note={isCreatingNote ? null : selectedNote}
              onSave={handleNoteSave}
              onClose={handleEditorClose}
              isCreatingNote={isCreatingNote}
              subjectId={subjectId}
              backendSubjectId={subjectTopics.backendSubjectId}
            />
          </div>
        </>
      }
      chat={({ fullScreen }) => <AiChatPanel subjectName={subject.name} sampleThread={fullScreen} />}
    />
  )
}
