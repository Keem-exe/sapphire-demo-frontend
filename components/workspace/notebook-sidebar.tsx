"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, FileText, Search, MoreVertical, Trash2, Edit, FolderOpen } from "lucide-react"

interface Note {
  id: string
  title: string
  date: string
  preview: string
  content: string
  tags: string[]
}

interface NotebookSidebarProps {
  subjectId: string
  unit?: string | null
  onNoteSelect?: (note: Note | null) => void
  onNewNote?: () => void
}

export function NotebookSidebar({ subjectId, unit, onNoteSelect, onNewNote }: NotebookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Chapter 1: Introduction",
      date: "2 hours ago",
      preview: "Basic concepts and definitions...",
      content: "# Chapter 1: Introduction\n\nBasic concepts and definitions for this topic.",
      tags: ["introduction", "basics"],
    },
    {
      id: "2",
      title: "Practice Problems",
      date: "1 day ago",
      preview: "Solving quadratic equations...",
      content: "# Practice Problems\n\nSolving quadratic equations step by step.",
      tags: ["practice", "problems"],
    },
    {
      id: "3",
      title: "Key Formulas",
      date: "2 days ago",
      preview: "Important formulas to remember...",
      content: "# Key Formulas\n\nImportant formulas to remember for exams.",
      tags: ["formulas", "reference"],
    },
  ])

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleNoteClick = (note: Note) => {
    setSelectedNoteId(note.id)
    onNoteSelect?.(note)
  }

  const handleNewNote = () => {
    onNewNote?.()
    setSelectedNoteId(null)
  }

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotes(notes.filter((n) => n.id !== noteId))
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
      onNoteSelect?.(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground mb-3">Notebook</h2>
        {unit && <p className="text-xs text-muted-foreground mb-3">Unit {unit} Notes</p>}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-background"
          />
        </div>
        <Button
          onClick={handleNewNote}
          className="w-full rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No notes found" : "No notes yet. Create your first note!"}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className={`w-full p-3 mb-2 rounded-lg transition-colors text-left group ${
                  selectedNoteId === note.id
                    ? "bg-primary/10 border-2 border-primary"
                    : "hover:bg-accent/50 border-2 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm text-foreground truncate">{note.title}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleNoteClick(note)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDeleteNote(note.id, e)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{note.date}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{note.preview}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
