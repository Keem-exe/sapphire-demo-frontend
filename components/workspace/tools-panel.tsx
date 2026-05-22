"use client"

import { useParams, useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Video, Layers, ChevronRight } from "lucide-react"

export function ToolsPanel() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string

  const tools = [
    {
      id: "quiz",
      name: "Quiz Generator",
      icon: Brain,
      description: "Test your knowledge with AI-generated quizzes",
      color: "from-blue-500 to-cyan-500",
      milestone: "1 sprint for confidence boost",
      path: `/workspace/${subjectId}/quiz`,
    },
    {
      id: "reels",
      name: "Study Reels",
      icon: Video,
      description: "Quick video summaries of key concepts",
      color: "from-pink-500 to-rose-500",
      milestone: "Finish this topic today",
      path: `/workspace/${subjectId}/reels`,
    },
    {
      id: "flashcards",
      name: "Flashcards",
      icon: Layers,
      description: "Create and review flashcards for memorization",
      color: "from-green-500 to-emerald-500",
      milestone: "2 sessions to 70% mastery",
      path: `/workspace/${subjectId}/flashcards`,
    },
  ]

  const handleToolClick = (path: string) => {
    router.push(path)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Study Tools</h2>
        <p className="text-xs text-foreground/75 mt-1">Pick one action and stack a quick win.</p>
      </div>

      {/* Tools List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Card
                key={tool.id}
                onClick={() => handleToolClick(tool.path)}
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-primary/70"
              >
                <div className={`h-1 bg-gradient-to-r ${tool.color}`} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                      <Badge variant="outline" className="mt-2 text-[11px]">
                        {tool.milestone}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
