"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Brain, Eye, Ear, Hand, BookText, ArrowRight, ArrowLeft } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "When learning something new, I prefer to:",
    options: [
      { value: "visual", label: "See diagrams, charts, or videos", icon: Eye },
      { value: "auditory", label: "Listen to explanations or discussions", icon: Ear },
      { value: "kinesthetic", label: "Try it out hands-on with practice", icon: Hand },
      { value: "reading", label: "Read detailed notes or articles", icon: BookText },
    ],
  },
  {
    id: 2,
    question: "When studying for an exam, I find it most helpful to:",
    options: [
      { value: "visual", label: "Create mind maps or color-coded notes", icon: Eye },
      { value: "auditory", label: "Discuss topics with others or record myself", icon: Ear },
      { value: "kinesthetic", label: "Do practice problems and experiments", icon: Hand },
      { value: "reading", label: "Write and rewrite my notes", icon: BookText },
    ],
  },
  {
    id: 3,
    question: "I remember information best when:",
    options: [
      { value: "visual", label: "I can visualize it with images or diagrams", icon: Eye },
      { value: "auditory", label: "I hear it explained or discuss it", icon: Ear },
      { value: "kinesthetic", label: "I physically interact with the material", icon: Hand },
      { value: "reading", label: "I read and take detailed notes", icon: BookText },
    ],
  },
  {
    id: 4,
    question: "When following instructions, I prefer:",
    options: [
      { value: "visual", label: "Pictures, diagrams, or demonstrations", icon: Eye },
      { value: "auditory", label: "Verbal explanations or audio guides", icon: Ear },
      { value: "kinesthetic", label: "Learning by doing it myself", icon: Hand },
      { value: "reading", label: "Written step-by-step instructions", icon: BookText },
    ],
  },
  {
    id: 5,
    question: "In class, I learn best when the teacher:",
    options: [
      { value: "visual", label: "Uses slides, videos, and visual aids", icon: Eye },
      { value: "auditory", label: "Lectures and encourages discussion", icon: Ear },
      { value: "kinesthetic", label: "Includes activities and experiments", icon: Hand },
      { value: "reading", label: "Provides detailed handouts and readings", icon: BookText },
    ],
  },
]

const LEARNING_STYLES = {
  visual: {
    name: "Visual Learner",
    icon: Eye,
    color: "from-blue-500 to-cyan-500",
    description: "You learn best through images, diagrams, and visual representations.",
    tips: [
      "Use mind maps and flowcharts",
      "Watch educational videos",
      "Color-code your notes",
      "Draw diagrams to explain concepts",
    ],
  },
  auditory: {
    name: "Auditory Learner",
    icon: Ear,
    color: "from-purple-500 to-pink-500",
    description: "You learn best through listening and verbal explanations.",
    tips: [
      "Record and listen to lectures",
      "Discuss topics with study groups",
      "Read your notes aloud",
      "Use mnemonic devices and rhymes",
    ],
  },
  kinesthetic: {
    name: "Kinesthetic Learner",
    icon: Hand,
    color: "from-orange-500 to-red-500",
    description: "You learn best through hands-on practice and physical activity.",
    tips: [
      "Do practice problems regularly",
      "Use physical objects to model concepts",
      "Take breaks to move around",
      "Create experiments and demonstrations",
    ],
  },
  reading: {
    name: "Reading/Writing Learner",
    icon: BookText,
    color: "from-green-500 to-emerald-500",
    description: "You learn best through reading and writing text.",
    tips: [
      "Take detailed written notes",
      "Rewrite information in your own words",
      "Create lists and summaries",
      "Read textbooks and articles thoroughly",
    ],
  },
}

export default function LearningQuizPage() {
  const router = useRouter()
  const { user, updateUserLevel } = useAuth()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [learningStyle, setLearningStyle] = useState<keyof typeof LEARNING_STYLES | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/")
    }
  }, [user, router])

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value })
  }

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateResults()
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateResults = () => {
    const scores: Record<string, number> = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      reading: 0,
    }

    Object.values(answers).forEach((answer) => {
      scores[answer] = (scores[answer] || 0) + 1
    })

    const dominantStyle = Object.entries(scores).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0] as keyof typeof LEARNING_STYLES

    setLearningStyle(dominantStyle)
    setShowResults(true)

    // Store learning style in localStorage
    localStorage.setItem("learningStyle", dominantStyle)
  }

  const handleFinish = () => {
    router.push("/dashboard")
  }

  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100
  const currentQuestionData = QUIZ_QUESTIONS[currentQuestion]
  const currentAnswer = answers[currentQuestion]

  if (!user) {
    return null
  }

  if (showResults && learningStyle) {
    const style = LEARNING_STYLES[learningStyle]
    const StyleIcon = style.icon

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-2 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center shadow-lg`}
              >
                <StyleIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">{style.name}</CardTitle>
              <CardDescription className="text-base">{style.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Study Tips for You:</h3>
              <ul className="space-y-3">
                {style.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">{index + 1}</span>
                    </div>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4">
              <Button
                onClick={handleFinish}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Continue to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Discover Your Learning Style</CardTitle>
                <CardDescription>
                  Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
                </CardDescription>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{currentQuestionData.question}</h3>
            <RadioGroup value={currentAnswer} onValueChange={handleAnswer} className="space-y-3">
              {currentQuestionData.options.map((option) => {
                const OptionIcon = option.icon
                return (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50 ${
                      currentAnswer === option.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => handleAnswer(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`${currentQuestion}-${option.value}`} />
                    <OptionIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Label
                      htmlFor={`${currentQuestion}-${option.value}`}
                      className="flex-1 cursor-pointer text-base font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestion === 0}
              className="flex-1 h-12 rounded-xl bg-transparent"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!currentAnswer}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {currentQuestion === QUIZ_QUESTIONS.length - 1 ? "See Results" : "Next"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
