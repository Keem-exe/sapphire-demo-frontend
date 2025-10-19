"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

interface CapeUnit {
  unitNumber: number
  progress: number
  lastStudied: string
  topics: number
}

interface CapeSubject {
  id: string
  name: string
  icon: string
  color: string
  type: "cape"
  units: CapeUnit[]
}

interface CapeSubjectCardProps {
  subject: CapeSubject
}

export function CapeSubjectCard({ subject }: CapeSubjectCardProps) {
  const router = useRouter()

  const handleOpenUnit = (unitNumber: number) => {
    router.push(`/workspace/${subject.id}/unit-${unitNumber}`)
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${subject.color}`} />
      <CardContent className="p-6">
        {/* Icon and Name */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">{subject.icon}</div>
          <div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {subject.name}
            </h3>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">CAPE</span>
          </div>
        </div>

        {/* Unit 1 */}
        <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Unit 1</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {subject.units[0].topics} topics
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <Progress value={subject.units[0].progress} className="h-1.5 flex-1 mr-3" />
            <span className="text-xs font-semibold text-primary">{subject.units[0].progress}%</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{subject.units[0].lastStudied}</span>
            </div>
          </div>
          <Button
            onClick={() => handleOpenUnit(1)}
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Study Unit 1
          </Button>
        </div>

        {/* Unit 2 */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Unit 2</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {subject.units[1].topics} topics
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <Progress value={subject.units[1].progress} className="h-1.5 flex-1 mr-3" />
            <span className="text-xs font-semibold text-primary">{subject.units[1].progress}%</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{subject.units[1].lastStudied}</span>
            </div>
          </div>
          <Button
            onClick={() => handleOpenUnit(2)}
            size="sm"
            className="w-full rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Study Unit 2
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
