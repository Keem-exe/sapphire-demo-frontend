"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Copy, Check, Sparkles, ChevronRight } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import { hasAuthToken, resolveBackendSubject } from "@/lib/services/backend-subject-map"
import { cn } from "@/lib/utils"

interface AiChatPanelProps {
  subjectName: string
}

// ---------------------------------------------------------------------------
// Inline text renderer: handles **bold**, *italic*, `code`, ^super, _sub
// ---------------------------------------------------------------------------
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = []
  // Match **bold** | *italic* | `code` | ^{x} | ^x | _{x} | _x
  const RE = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\^{([^}]+)}|\^(\w+)|_{([^}]+)}|_([a-zA-Z0-9]+))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0

  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index))
    if (m[2] !== undefined) result.push(<strong key={`${keyPrefix}-b${k++}`} className="font-semibold text-foreground">{m[2]}</strong>)
    else if (m[3] !== undefined) result.push(<em key={`${keyPrefix}-i${k++}`}>{m[3]}</em>)
    else if (m[4] !== undefined) result.push(
      <code key={`${keyPrefix}-c${k++}`} className="px-1 py-0.5 rounded bg-primary/10 text-primary font-mono text-[0.85em]">{m[4]}</code>
    )
    else if (m[5] !== undefined) result.push(<sup key={`${keyPrefix}-sup${k++}`} className="text-[0.7em]">{m[5]}</sup>)
    else if (m[6] !== undefined) result.push(<sup key={`${keyPrefix}-sup${k++}`} className="text-[0.7em]">{m[6]}</sup>)
    else if (m[7] !== undefined) result.push(<sub key={`${keyPrefix}-sub${k++}`} className="text-[0.7em]">{m[7]}</sub>)
    else if (m[8] !== undefined) result.push(<sub key={`${keyPrefix}-sub${k++}`} className="text-[0.7em]">{m[8]}</sub>)
    last = m.index + m[0].length
  }
  if (last < text.length) result.push(text.slice(last))
  return result
}

// ---------------------------------------------------------------------------
// Block-level markdown renderer
// ---------------------------------------------------------------------------
type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "para"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "rule" }

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: "code", lang, text: codeLines.join("\n") })
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "rule" })
      i++
      continue
    }

    // Heading
    const hm = line.match(/^(#{1,4})\s+(.+)/)
    if (hm) {
      blocks.push({ type: "heading", level: hm[1].length, text: hm[2] })
      i++
      continue
    }

    // Blockquote
    if (/^>\s/.test(line)) {
      const bqLines: string[] = [line.replace(/^>\s?/, "")]
      while (i + 1 < lines.length && /^>\s/.test(lines[i + 1])) {
        i++
        bqLines.push(lines[i].replace(/^>\s?/, ""))
      }
      blocks.push({ type: "blockquote", lines: bqLines })
      i++
      continue
    }

    // Table (| col | col |)
    if (/^\|/.test(line) && line.includes("|", 1)) {
      const tableLines: string[] = [line]
      while (i + 1 < lines.length && /^\|/.test(lines[i + 1])) {
        i++
        // Skip separator rows like |---|---|
        if (!/^\|[\s\-:|]+\|/.test(lines[i])) tableLines.push(lines[i])
        else tableLines.push("") // placeholder keeps row count stable
      }
      const rows = tableLines
        .filter(l => l.trim() && !/^[\|\s\-:]+$/.test(l))
        .map(l =>
          l
            .split("|")
            .slice(1, -1) // remove leading/trailing empty cells
            .map(c => c.trim())
        )
      if (rows.length > 0) blocks.push({ type: "table", rows })
      i++
      continue
    }

    // Unordered list
    if (/^[-•*]\s/.test(line)) {
      const items: string[] = [line.replace(/^[-•*]\s+/, "")]
      while (i + 1 < lines.length && /^[-•*]\s/.test(lines[i + 1])) {
        i++
        items.push(lines[i].replace(/^[-•*]\s+/, ""))
      }
      blocks.push({ type: "ul", items })
      i++
      continue
    }

    // Ordered list
    if (/^\d+[\.\)]\s/.test(line)) {
      const items: string[] = [line.replace(/^\d+[\.\)]\s+/, "")]
      while (i + 1 < lines.length && /^\d+[\.\)]\s/.test(lines[i + 1])) {
        i++
        items.push(lines[i].replace(/^\d+[\.\)]\s+/, ""))
      }
      blocks.push({ type: "ol", items })
      i++
      continue
    }

    // Empty line — skip
    if (!line.trim()) {
      i++
      continue
    }

    // Paragraph — accumulate consecutive non-special lines
    const paraLines: string[] = [line]
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !/^[#>\-•*|`]/.test(lines[i + 1]) &&
      !/^\d+[\.\)]/.test(lines[i + 1]) &&
      !/^---+$/.test(lines[i + 1].trim())
    ) {
      i++
      paraLines.push(lines[i])
    }
    blocks.push({ type: "para", text: paraLines.join(" ") })
    i++
  }

  return blocks
}

function MessageContent({ content, msgKey }: { content: string; msgKey: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const bk = `${msgKey}-b${bi}`

        if (block.type === "heading") {
          const Tag = (["h2", "h3", "h4", "h5"] as const)[Math.min(block.level - 1, 3)]
          const classes = [
            "font-bold text-foreground mt-1",
            "text-base font-bold text-foreground mt-1",
            "text-sm font-semibold text-foreground mt-0.5",
            "text-sm font-semibold text-muted-foreground mt-0.5",
          ][Math.min(block.level - 1, 3)]
          return <Tag key={bk} className={classes}>{renderInline(block.text, bk)}</Tag>
        }

        if (block.type === "para") {
          return (
            <p key={bk} className="text-foreground/90">
              {renderInline(block.text, bk)}
            </p>
          )
        }

        if (block.type === "ul") {
          return (
            <ul key={bk} className="space-y-1 pl-1">
              {block.items.map((item, ii) => (
                <li key={`${bk}-${ii}`} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground/90">{renderInline(item, `${bk}-${ii}`)}</span>
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === "ol") {
          return (
            <ol key={bk} className="space-y-1 pl-1">
              {block.items.map((item, ii) => (
                <li key={`${bk}-${ii}`} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {ii + 1}
                  </span>
                  <span className="text-foreground/90">{renderInline(item, `${bk}-${ii}`)}</span>
                </li>
              ))}
            </ol>
          )
        }

        if (block.type === "code") {
          return (
            <pre
              key={bk}
              className="bg-slate-900 text-green-300 rounded-lg p-3 overflow-x-auto font-mono text-xs leading-relaxed border border-slate-700"
            >
              {block.lang && (
                <div className="text-slate-500 text-[10px] mb-2 uppercase tracking-wider">{block.lang}</div>
              )}
              {block.text}
            </pre>
          )
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={bk}
              className="border-l-4 border-primary/50 pl-3 py-0.5 bg-primary/5 rounded-r-md italic text-foreground/80"
            >
              {block.lines.map((l, li) => (
                <p key={`${bk}-${li}`}>{renderInline(l, `${bk}-${li}`)}</p>
              ))}
            </blockquote>
          )
        }

        if (block.type === "table") {
          const [head, ...body] = block.rows
          return (
            <div key={bk} className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                {head && (
                  <thead>
                    <tr className="bg-primary/10">
                      {head.map((cell, ci) => (
                        <th
                          key={`${bk}-h${ci}`}
                          className="px-3 py-2 text-left font-semibold text-foreground border-b border-border"
                        >
                          {renderInline(cell, `${bk}-h${ci}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={`${bk}-r${ri}`} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      {row.map((cell, ci) => (
                        <td key={`${bk}-r${ri}c${ci}`} className="px-3 py-2 border-b border-border/50 text-foreground/90">
                          {renderInline(cell, `${bk}-r${ri}c${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === "rule") {
          return <hr key={bk} className="border-border/50 my-1" />
        }

        return null
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing animation
// ---------------------------------------------------------------------------
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
      title="Copy response"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Subject-specific starter chips
// ---------------------------------------------------------------------------
const STARTER_CHIPS: Record<string, string[]> = {
  Mathematics: ["Solve a quadratic equation for me", "Explain differentiation step by step", "What are the laws of indices?", "How do I find the equation of a circle?"],
  Chemistry: ["Balance this equation: H₂ + O₂ → H₂O", "Explain Le Chatelier's principle", "What is electronegativity?", "How do I calculate molar mass?"],
  "English A": ["Analyse the poem 'The Cry of the Children'", "How do I write a good summary?", "What is juxtaposition? Give an example", "Tips for Paper 2 comprehension"],
  Physics: ["Explain Newton's second law with examples", "How do I calculate resistance in parallel circuits?", "What is the Doppler effect?", "Explain projectile motion"],
  "Pure Mathematics": ["Explain integration by parts", "How do I solve differential equations?", "What is the binomial theorem?", "Explain vectors in 3D"],
  Biology: ["Explain DNA replication", "What happens during meiosis?", "How does the heart pump blood?", "Explain photosynthesis vs respiration"],
}

function getStarterChips(subjectName: string): string[] {
  for (const [key, chips] of Object.entries(STARTER_CHIPS)) {
    if (subjectName.toLowerCase().includes(key.toLowerCase())) return chips
  }
  return ["Explain a key concept", "Give me a worked example", "What topics appear most in CSEC exams?", "How do I improve my exam technique?"]
}

// ---------------------------------------------------------------------------
// Main chat panel
// ---------------------------------------------------------------------------
export function AiChatPanel({ subjectName }: AiChatPanelProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: `## Welcome! I'm Sapphire 👋\n\nI'm your AI study companion for **${subjectName || "this subject"}**.\n\nAsk me anything — worked examples, concept breakdowns, exam technique, or practice questions. I'm here to make this click.`,
    },
  ])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const starterChips = getStarterChips(subjectName)
  const showChips = messages.length === 1

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const cleanedMessage = (text ?? message).trim()
    if (!cleanedMessage || loading) return

    const userMsg = { role: "user" as const, content: cleanedMessage }
    setMessages(m => [...m, userMsg])
    setMessage("")
    setLoading(true)

    const payload = {
      subjectId: (subjectName || "general").toLowerCase().replace(/\s+/g, ""),
      message: cleanedMessage,
      history: messages.slice(-8),
    }

    try {
      if (hasAuthToken()) {
        const subjectKey = (Object.entries(SUBJECTS).find(
          ([, value]) => value.name.toLowerCase() === (subjectName || "").toLowerCase()
        )?.[0] || "") as SubjectId | ""

        if (!subjectKey) throw new Error("Subject not found for chat.")

        const backendSubject = await resolveBackendSubject(subjectKey)
        const response: any = await apiClient.post("/api/ai/chat", {
          subjectId: backendSubject.subjectId,
          message: cleanedMessage,
        })

        const data = response?.data || response
        const reply = data?.response || "Sorry, I couldn't generate a response."
        setMessages(m => [...m, { role: "assistant", content: reply }])
        return
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || `Request failed: ${res.status}`)
      }

      const data = await res.json()
      const reply = data?.reply || "Sorry, I couldn't generate a response."
      setMessages(m => [...m, { role: "assistant", content: reply }])
    } catch (e: any) {
      console.error("Chat error:", e)
      setMessages(m => [
        ...m,
        { role: "assistant", content: `**Oops, something went wrong.**\n\n${e.message || "Failed to connect to Sapphire. Please try again."}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-2.5 border-b bg-gradient-to-r from-primary/5 to-secondary/5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Sapphire AI Coach</p>
          <p className="text-[10px] text-muted-foreground truncate">{subjectName} • CSEC/CAPE</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user"
          return (
            <div key={i} className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
              {/* Avatar */}
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Bubble */}
              <div className={cn("group relative max-w-[88%]", isUser ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 shadow-sm",
                    isUser
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border/60 rounded-bl-sm"
                  )}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <MessageContent content={msg.content} msgKey={`msg-${i}`} />
                  )}
                </div>

                {/* Copy button for AI messages */}
                {!isUser && (
                  <div className="flex justify-start mt-0.5 pl-1">
                    <CopyButton text={msg.content} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-card border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Quick-start chips — shown only at the beginning */}
        {showChips && !loading && (
          <div className="pt-1 space-y-1.5">
            <p className="text-[10px] text-muted-foreground px-1 font-medium uppercase tracking-wider">Quick questions</p>
            <div className="flex flex-col gap-1.5">
              {starterChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(chip)}
                  className="flex items-center gap-2 text-left text-xs px-3 py-2 rounded-xl border border-border/70 bg-card hover:bg-primary/5 hover:border-primary/40 transition-colors text-foreground/80 hover:text-foreground group"
                >
                  <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background/95">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${subjectName}… (Enter to send, Shift+Enter for new line)`}
            rows={1}
            className="flex-1 rounded-xl resize-none text-sm min-h-[38px] max-h-[120px] overflow-y-auto py-2.5 px-3 border-border/70 focus-visible:ring-primary/50"
            style={{ height: "auto" }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = "auto"
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !message.trim()}
            size="sm"
            className="rounded-xl h-9 w-9 p-0 flex-shrink-0 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Sapphire AI · CSEC &amp; CAPE focused · May make mistakes — verify important answers
        </p>
      </div>
    </div>
  )
}
