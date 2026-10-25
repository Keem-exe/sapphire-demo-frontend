"use client"

import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Save, X, Tag, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { meService } from "@/lib/services/me-service"
import { useToast } from "@/hooks/use-toast"
import { MessageContent } from "@/components/workspace/ai-chat-panel"
import { cn } from "@/lib/utils"

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
  subjectId?: string
  /** Backend subject id, so note-taking counts as study time (null for the demo account) */
  backendSubjectId?: number | null
}

export function NoteEditor({ note, isCreatingNote = false, onSave, onClose, subjectId, backendSubjectId }: NoteEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [predictiveEnabled, setPredictiveEnabled] = useState(true)
  const [predictiveText, setPredictiveText] = useState("")
  const [predictiveLoading, setPredictiveLoading] = useState(false)
  const [lastPredictedInput, setLastPredictedInput] = useState("")
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<[number, number] | null>(null)

  // Restore the selection after a toolbar action rewrites the content
  useLayoutEffect(() => {
    const selection = pendingSelection.current
    const textarea = textareaRef.current
    if (!selection || !textarea) return
    pendingSelection.current = null
    textarea.focus()
    textarea.setSelectionRange(selection[0], selection[1])
  }, [content])

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags)
    } else if (isCreatingNote) {
      setTitle("")
      setContent("")
      setTags([])
      setSessionStartTime(Date.now()) // Start tracking new note session
    }
  }, [note, isCreatingNote])

  // Track word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
  }, [content])

  useEffect(() => {
    if (!predictiveEnabled) {
      setPredictiveText("")
      return
    }

    const trimmed = content.trim()
    if (trimmed.length < 24 || trimmed === lastPredictedInput) {
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setPredictiveLoading(true)
        const context = content.slice(-500)

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: subjectId || "general",
            message:
              `Predictive typing mode. Continue this student note with one short continuation of 4-10 words. ` +
              `Return only the continuation text with no quotes, bullets, or labels. ` +
              `Note title: ${title || "Untitled"}. Current note: ${context}`,
            history: [],
          }),
        })

        if (!response.ok) {
          setPredictiveText("")
          return
        }

        const payload = await response.json()
        const suggestion = String(payload?.reply || "")
          .replace(/[\r\n]+/g, " ")
          .trim()

        if (!suggestion || suggestion.length < 3) {
          setPredictiveText("")
          return
        }

        if (content.toLowerCase().endsWith(suggestion.toLowerCase())) {
          setPredictiveText("")
          return
        }

        setLastPredictedInput(trimmed)
        setPredictiveText(suggestion)
      } catch {
        setPredictiveText("")
      } finally {
        setPredictiveLoading(false)
      }
    }, 700)

    return () => clearTimeout(timeout)
  }, [content, title, subjectId, predictiveEnabled, lastPredictedInput])

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      toast({ title: "Nothing to save", description: "Add a title or some content before saving.", variant: "destructive" })
      return
    }

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
    
    // Notes live in this browser; tell the backend about the study time so it counts on the
    // dashboard and profile. Note text is never sent.
    if (user && backendSubjectId && sessionStartTime) {
      try {
        const durationSeconds = Math.min(4 * 60 * 60, Math.round((Date.now() - sessionStartTime) / 1000));
        await meService.logNoteActivity({ subjectId: backendSubjectId, durationSeconds, wordCount });
        setSessionStartTime(Date.now());
        toast({ title: "Note saved", description: "Your study time has been added to your progress." });
      } catch (error) {
        console.error('Failed to record note-taking:', error);
      }
    }
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

  // Apply a formatting action to the current selection. Notes are stored as markdown, so the
  // toolbar wraps or prefixes the selected text, and a second click on the same action undoes it.
  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    let next = content
    let selStart = start
    let selEnd = end

    if (format === "bold" || format === "italic") {
      const len = format === "bold" ? 2 : 1
      const mark = "*".repeat(len)
      // Work on the text itself: any markers already inside the selection count as surrounding ones
      let s = start
      let e = end
      while (s < e && content[s] === "*") s++
      while (e > s && content[e - 1] === "*") e--
      let before = 0
      while (content[s - 1 - before] === "*") before++
      let after = 0
      while (content[e + after] === "*") after++
      const around = Math.min(before, after)
      // "**" = bold, "*" = italic, "***" = both
      const active = format === "bold" ? around >= 2 : around % 2 === 1
      if (active) {
        next = content.slice(0, s - len) + content.slice(s, e) + content.slice(e + len)
        selStart = s - len
        selEnd = e - len
      } else {
        next = content.slice(0, s) + mark + content.slice(s, e) + mark + content.slice(e)
        selStart = s + len
        selEnd = e + len
      }
    } else {
      // Line formats apply to every line touched by the selection
      const blockStart = content.lastIndexOf("\n", start - 1) + 1
      const newlineAfter = content.indexOf("\n", end)
      const blockEnd = newlineAfter === -1 ? content.length : newlineAfter
      const lines = content.slice(blockStart, blockEnd).split("\n")
      const anyPrefix = /^(#{1,6} |[-*] |\d+\. )/
      const prefixFor = (i: number) =>
        format === "h1" ? "# " : format === "h2" ? "## " : format === "ul" ? "- " : `${i + 1}. `
      const matches = (line: string, i: number) =>
        format === "ol" ? /^\d+\. /.test(line) : line.startsWith(prefixFor(i)) && !(format === "h1" && line.startsWith("##"))
      const allOn = lines.every((l, i) => l.trim() === "" || matches(l, i))
      const out = lines.map((line, i) => {
        if (line.trim() === "") return line
        const bare = line.replace(anyPrefix, "")
        return allOn ? bare : prefixFor(i) + bare
      })
      const replaced = out.join("\n")
      next = content.slice(0, blockStart) + replaced + content.slice(blockEnd)
      selStart = blockStart
      selEnd = blockStart + replaced.length
    }

    if (next === content) return
    pendingSelection.current = [selStart, selEnd]
    setContent(next)
  }

  const acceptPrediction = () => {
    if (!predictiveText) return

    setContent((previous) => {
      const needsSpace = previous.length > 0 && !/\s$/.test(previous)
      return `${previous}${needsSpace ? " " : ""}${predictiveText}`
    })
    setPredictiveText("")
  }

  if (!note && !isCreatingNote) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("bold")}
            className="h-8 w-8 p-0"
            title="Bold"
            aria-label="Bold"
            disabled={preview}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("italic")}
            className="h-8 w-8 p-0"
            title="Italic"
            aria-label="Italic"
            disabled={preview}
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
            aria-label="Heading 1"
            disabled={preview}
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("h2")}
            className="h-8 w-8 p-0"
            title="Heading 2"
            aria-label="Heading 2"
            disabled={preview}
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
            aria-label="Bullet List"
            disabled={preview}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("ol")}
            className="h-8 w-8 p-0"
            title="Numbered List"
            aria-label="Numbered List"
            disabled={preview}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 rounded-lg bg-muted p-[3px]" role="group" aria-label="Editor mode">
              <button
                type="button"
                aria-pressed={!preview}
                onClick={() => setPreview(false)}
                className={cn("h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground", !preview && "bg-card text-foreground shadow-xs")}
              >
                Write
              </button>
              <button
                type="button"
                aria-pressed={preview}
                onClick={() => setPreview(true)}
                className={cn("h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground", preview && "bg-card text-foreground shadow-xs")}
              >
                Preview
              </button>
            </div>
            <Button
              variant={predictiveEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setPredictiveEnabled((value) => !value)}
              disabled={preview}
              className="h-8 text-xs rounded-md"
            >
              AI Predict
            </Button>
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-auto p-4">
        {preview ? (
          <div className="min-h-full rounded-md p-3 text-base">
            {content.trim() ? (
              <MessageContent content={content} msgKey="note-preview" />
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet. Switch to Write and add some notes.</p>
            )}
          </div>
        ) : (
        <div className="relative min-h-full">
          {predictiveEnabled && predictiveText ? (
            <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words rounded-md p-3 text-base leading-relaxed">
              <span className="opacity-0">{content}</span>
              <span className="text-muted-foreground/50">{`${content && !/\s$/.test(content) ? " " : ""}${predictiveText}`}</span>
            </div>
          ) : null}

          <Textarea
            ref={textareaRef}
            placeholder="Start writing your notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && predictiveText) {
                e.preventDefault()
                acceptPrediction()
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault()
                insertFormatting("bold")
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                e.preventDefault()
                insertFormatting("italic")
              }
            }}
            className="min-h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-base leading-relaxed"
          />
        </div>
        )}
        {predictiveEnabled && !preview ? (
          <div className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {predictiveLoading ? (
              <span>AI is thinking of your next phrase...</span>
            ) : predictiveText ? (
              <div className="flex items-center justify-between gap-2">
                <span>Press Tab to accept inline suggestion.</span>
                <Button size="sm" variant="secondary" onClick={acceptPrediction} className="h-6 text-[11px]">
                  Accept (Tab)
                </Button>
              </div>
            ) : (
              <span>Keep typing. AI suggestions appear as you write.</span>
            )}
          </div>
        ) : null}
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
