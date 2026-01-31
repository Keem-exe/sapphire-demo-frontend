"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Save, X, Tag, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface Note {
  id: string
  title: string
  date: string
  preview: string
  content: string
  tags: string[]
}

interface NoteEditorProps {
  note: Note | null
  isCreatingNote?: boolean
  onSave?: (note: Note) => void
  onClose?: () => void
}

export function NoteEditor({ note, isCreatingNote = false, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags)
    } else if (isCreatingNote) {
      setTitle("")
      setContent("")
      setTags([])
    }
  }, [note, isCreatingNote])

  const handleSave = () => {
    const preview =
      content
        .slice(0, 100)
        .replace(/[#*\n]/g, " ")
        .trim() + "..."
    const savedNote: Note = {
      id: note?.id || Date.now().toString(),
      title: title || "Untitled Note",
      date: "Just now",
      preview,
      content,
      tags,
    }
    onSave?.(savedNote)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const insertFormatting = (format: string) => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let newText = ""
    let cursorOffset = 0

    switch (format) {
      case "bold":
        newText = `**${selectedText}**`
        cursorOffset = 2
        break
      case "italic":
        newText = `*${selectedText}*`
        cursorOffset = 1
        break
      case "h1":
        newText = `# ${selectedText}`
        cursorOffset = 2
        break
      case "h2":
        newText = `## ${selectedText}`
        cursorOffset = 3
        break
      case "ul":
        newText = `- ${selectedText}`
        cursorOffset = 2
        break
      case "ol":
        newText = `1. ${selectedText}`
        cursorOffset = 3
        break
    }

    const newContent = content.substring(0, start) + newText + content.substring(end)
    setContent(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length)
    }, 0)
  }

  if (!note && !isCreatingNote) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
            <Save className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Note Selected</h3>
          <p className="text-sm text-muted-foreground">Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{note ? "Edit Note" : "New Note"}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} size="sm" className="rounded-lg">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" className="rounded-lg">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Input
          type="text"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Formatting Toolbar */}
      <div className="p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("bold")}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("italic")}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("h1")}
            className="h-8 w-8 p-0"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("h2")}
            className="h-8 w-8 p-0"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("ul")}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("ol")}
            className="h-8 w-8 p-0"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-auto p-4">
        <Textarea
          placeholder="Start writing your notes..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-base leading-relaxed"
        />
      </div>

      {/* Tags Section */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tags</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            className="h-8 text-sm"
          />
          <Button onClick={handleAddTag} size="sm" variant="outline" className="h-8 bg-transparent">
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
