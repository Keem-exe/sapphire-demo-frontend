"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  progress: number
  lastStudied: string
  topics: number
}

// lib/utils.ts
export function normalizeSubjectId(id: string): string {
  const map: Record<string, string> = {
    // CSEC aliases
    "csec-1": "csec-math",
    "csec-2": "csec-eng",
    "csec-3": "csec-chem",
    // CAPE aliases
    "cape-1": "cape-puremath",
    "cape-2": "cape-phys",
    "cape-3": "cape-bio",
  };
  return map[id] || id;
}

interface SubjectCardProps {
  subject: Subject
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const router = useRouter()

  const handleOpenSubject = () => {
    router.push(`/workspace/${normalizeSubjectId(subject.id)}`)
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${subject.color}`} />
      <CardContent className="p-6">
        {/* Icon and Name */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{subject.icon}</div>
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {subject.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                <span>{subject.topics} topics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm font-semibold text-primary">{subject.progress}%</span>
          </div>
          <Progress value={subject.progress} className="h-2" />
        </div>

        {/* Last Studied */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="w-4 h-4" />
          <span>Last studied {subject.lastStudied}</span>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleOpenSubject}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all duration-200"
        >
          Continue Learning
        </Button>
      </CardContent>
    </Card>
  )
}
