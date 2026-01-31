// …imports stay the same…
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

interface AiChatPanelProps {
  subjectName: string // you already have this
}

export function AiChatPanel({ subjectName }: AiChatPanelProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI study companion for ${subjectName || "this subject"}. Ask me anything.`,
    },
  ])
  const [loading, setLoading] = useState(false)

async function handleSend() {
  if (!message.trim() || loading) return
  const cleanedMessage = message.trim()

  // Build the payload once, to log and verify
  const payload = {
    subjectId: (subjectName || "general").toLowerCase().replace(/\s+/g, ""),
    message: cleanedMessage,
    history: messages.slice(-8),
  }

  console.log("📤 Sending payload:", payload)

  const userMsg = { role: "user" as const, content: cleanedMessage }
  setMessages((m) => [...m, userMsg])
  setMessage("")
  setLoading(true)

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    // explicit error handling
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData?.error || `Request failed: ${res.status}`)
    }

    const data = await res.json()
    const reply = data?.reply || "Sorry, I couldn’t generate a response."
    setMessages((m) => [...m, { role: "assistant", content: reply }])
  } catch (e: any) {
    console.error("❌ Chat send error:", e)
    setMessages((m) => [
      ...m,
      { role: "assistant", content: `⚠️ Error: ${e.message || "Failed to connect to tutor service."}` },
    ])
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[80%] rounded-2xl px-4 py-3 " +
                (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="inline-block max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
              Thinking…
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about today’s topic…"
          onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
          className="rounded-xl"
        />
        <Button onClick={handleSend} disabled={loading} className="rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
