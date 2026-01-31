"use client"

import { useParams, useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
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
      path: `/workspace/${subjectId}/quiz`,
    },
    {
      id: "reels",
      name: "Study Reels",
      icon: Video,
      description: "Quick video summaries of key concepts",
      color: "from-purple-500 to-pink-500",
      path: `/workspace/${subjectId}/reels`,
    },
    {
      id: "flashcards",
      name: "Flashcards",
      icon: Layers,
      description: "Create and review flashcards for memorization",
      color: "from-green-500 to-emerald-500",
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
        <p className="text-xs text-muted-foreground mt-1">Enhance your learning experience</p>
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
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer overflow-hidden"
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
