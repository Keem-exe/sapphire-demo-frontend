"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, GraduationCap, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SelectLevelPage() {
  const router = useRouter()

  const handleSelectLevel = (level: "csec" | "cape") => {
    // Store the selected level in localStorage
    localStorage.setItem("selectedLevel", level)
    // Redirect to learning quiz
    router.push("/learning-quiz")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
            Choose Your Level
          </h1>
          <p className="text-muted-foreground text-lg">Select the examination level you're preparing for</p>
        </div>

        {/* Level Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* CSEC Card */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer group">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold">CSEC</CardTitle>
                <CardDescription className="text-base">Caribbean Secondary Education Certificate</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Secondary level examinations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Single subject focus
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Foundation for CAPE studies
                </li>
              </ul>
              <Button
                onClick={() => handleSelectLevel("csec")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Select CSEC
              </Button>
            </CardContent>
          </Card>

          {/* CAPE Card */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer group">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold">CAPE</CardTitle>
                <CardDescription className="text-base">Caribbean Advanced Proficiency Examination</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Advanced level examinations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Unit 1 and Unit 2 structure
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  University preparation
                </li>
              </ul>
              <Button
                onClick={() => handleSelectLevel("cape")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Select CAPE
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
