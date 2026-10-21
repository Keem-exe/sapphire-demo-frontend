"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { analyticsService } from "@/lib/services/analytics"
import { intelligenceEngine } from "@/lib/services/intelligence-engine"
import { quizHistoryService } from "@/lib/services/quiz-history-service"
import { useNextContent } from '@/lib/hooks/use-learning-intelligence'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  User,
  Award,
  TrendingUp,
  Clock,
  AlertTriangle,
  BookOpen,
  Target,
  Lightbulb,
  Brain,
  Flame,
  ShieldCheck,
} from "lucide-react"
import { LearningDashboard } from '@/components/learning/LearningDashboard'

// SAMPLE: shown for the demo account (user_id 999), which has no backend data, so the page looks
// like the design. Real accounts always show their own analytics, history and alerts.
const DEMO_USER_ID = 999
const DEMO_ANALYTICS = {
  quiz_performance: { total_quizzes: 14, average_score: 74 },
  flashcard_performance: { total_sessions: 9, average_recall: 0.68 },
  current_streak: 6,
  total_study_time: 312,
  topic_mastery: [
    { topic: "Statistics", subject_id: "csec-math", confidence_score: 86, practice_count: 9 },
    { topic: "Sets", subject_id: "csec-math", confidence_score: 72, practice_count: 6 },
    { topic: "Number theory", subject_id: "csec-math", confidence_score: 64, practice_count: 7 },
    { topic: "Algebra", subject_id: "csec-math", confidence_score: 51, practice_count: 11 },
    { topic: "Factorising", subject_id: "csec-math", confidence_score: 38, practice_count: 4 },
  ],
  knowledge_gaps: ["Factorising"],
}
const DEMO_QUIZ_HISTORY = [
  { subjectId: "csec-math", topic: "Algebra", completedAt: "2026-10-14", score: 80 },
  { subjectId: "csec-math", topic: "Statistics", completedAt: "2026-10-13", score: 90 },
  { subjectId: "csec-math", topic: "Factorising", completedAt: "2026-10-10", score: 45 },
  { subjectId: "csec-math", topic: "Sets", completedAt: "2026-10-08", score: 70 },
]
const DEMO_RISK_ALERT = {
  level: "medium",
  title: "Factorising needs attention",
  reason: "Your last three Algebra quizzes averaged 48% on factorising. Try a 10-card flashcard drill on it this week.",
  intervention_suggestions: [] as string[],
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [intelligence, setIntelligence] = useState<any>(null)
  const [quizHistory, setQuizHistory] = useState<any[]>([])
  const [flashcardHistory, setFlashcardHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const { recommendation } = useNextContent(user?.id || null, undefined)
  const isDemo = user?.user_id === DEMO_USER_ID

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    // Load analytics and intelligence data
    const loadData = async () => {
      try {
        setIsLoading(true)
        const analyticsData = isDemo ? DEMO_ANALYTICS : analyticsService.getAnalytics(user.user_id)
        const intelligenceData = intelligenceEngine.getLearningIntelligence(user.user_id, "csec-math")
        setAnalytics(analyticsData)
        setIntelligence(
          isDemo
            ? {
                ...intelligenceData,
                personalized_actions: { ...intelligenceData?.personalized_actions, risk_alerts: DEMO_RISK_ALERT },
              }
            : intelligenceData,
        )

        // Render profile immediately; history can hydrate after first paint.
        setIsLoading(false)
        setHistoryLoading(true)

        const [quizData, flashcardData] = await Promise.all([
          quizHistoryService.getQuizHistory(user.user_id, 20),
          quizHistoryService.getFlashcardHistory(user.user_id, 20),
        ])
        setQuizHistory(isDemo && !quizData.length ? DEMO_QUIZ_HISTORY : quizData)
        setFlashcardHistory(flashcardData)
      } catch (error) {
        console.error("Failed to load profile data:", error)
        if (isDemo) setQuizHistory(DEMO_QUIZ_HISTORY)
      } finally {
        setHistoryLoading(false)
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, router])

  if (!user) {
    return null
  }

  // The demo account has no level on the user record, so use the one picked on the level screen
  const levelKey = String(
    user.level || (typeof window !== "undefined" ? localStorage.getItem("selectedLevel") : "") || "csec",
  ).toLowerCase()

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your learning profile...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No learning data available yet. Start taking quizzes and studying to build your profile!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getMasteryColor = (level: number) => {
    if (level >= 80) return "border-status-success/30 bg-status-success-subtle text-status-success"
    if (level >= 60) return "border-primary/30 bg-primary/10 text-primary-strong"
    if (level >= 40) return "border-status-warning/40 bg-status-warning-subtle text-status-warning"
    return "border-destructive/30 bg-status-danger-subtle text-destructive"
  }

  const getMasteryLabel = (level: number) => {
    if (level >= 80) return "Mastered"
    if (level >= 60) return "Proficient"
    if (level >= 40) return "Learning"
    return "Needs Practice"
  }

  const getRiskBadgeColor = (level: string) => {
    if (level === "high") return "destructive" as const
    if (level === "medium") return "secondary" as const
    return "outline" as const
  }

  const getQuizHistory = () => {
    // Use real backend data if available, otherwise fall back to intelligence engine
    if (quizHistory && quizHistory.length > 0) {
      return quizHistory.map((quiz) => ({
        subject_id: `subject-${quiz.subjectId}`,
        topic: quiz.topic,
        completed_at: quiz.completedAt,
        score: quiz.score
      }))
    }
    return intelligence?.student_signals?.recent_quizzes || []
  }

  const getFlashcardHistory = () => {
    // Use real backend data if available, otherwise fall back to intelligence engine
    if (flashcardHistory && flashcardHistory.length > 0) {
      return flashcardHistory.map((session) => ({
        subject_id: `subject-${session.subjectId}`,
        topic: session.topic,
        completed_at: session.completedAt,
        cards_studied: session.cardsStudied,
        cards_mastered: session.cardsMastered,
        mastery_rate: session.masteryRate
      }))
    }
    return intelligence?.student_signals?.recent_flashcards || []
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hdr">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="min-h-11 shadow-none">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <span className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Learning Profile</h1>
          </div>
          {user?.accountType === "admin" && (
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")} className="min-h-11 shadow-none">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Admin console
            </Button>
          )}
        </div>
      </header>
      <div className="container mx-auto p-6 pt-7 max-w-7xl">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <Card className="rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-sky mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
              {`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || <User className="w-12 h-12" />}
            </div>
            <CardTitle>{user.first_name} {user.last_name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Age</p>
                <p className="font-semibold">{user.age} years</p>
              </div>
              <div>
                <p className="text-muted-foreground">Level</p>
                <p className="font-semibold">{levelKey.toUpperCase()}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Learning Style</p>
              <Badge className="mt-1 border-transparent bg-primary/10 text-primary-strong">{user.learning_style}</Badge>
            </div>
            {user.user_id === 999 && (
              <Badge variant="secondary" className="w-full justify-center">
                Demo Account
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your learning at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.quiz_performance.total_quizzes}
                </div>
                <div className="text-xs text-muted-foreground">Quizzes</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.flashcard_performance.total_sessions}
                </div>
                <div className="text-xs text-muted-foreground">Flashcards</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <Flame className="w-6 h-6 text-streak mx-auto mb-1" />
                <div className="text-2xl font-bold text-streak">
                  {analytics.current_streak}
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <Clock className="w-6 h-6 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-primary">
                  {Math.round(analytics.total_study_time)}m
                </div>
                <div className="text-xs text-muted-foreground">Study Time</div>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">Average Quiz Score</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">
                    {Math.round(analytics.quiz_performance.average_score)}%
                  </span>
                </div>
                <Progress value={analytics.quiz_performance.average_score} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">Flashcard Recall</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">
                    {Math.round(analytics.flashcard_performance.average_recall * 100)}%
                  </span>
                </div>
                <Progress
                  value={analytics.flashcard_performance.average_recall * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Alert (if applicable) */}
        {intelligence?.personalized_actions?.risk_alerts &&
         intelligence.personalized_actions.risk_alerts.level &&
         intelligence.personalized_actions.risk_alerts.level !== "none" && (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning-subtle p-3.5 text-sm lg:col-span-3"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
            <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
              <b className="font-semibold">
                {intelligence.personalized_actions.risk_alerts.title ?? "Learning alert"}{" "}
                <Badge variant={getRiskBadgeColor(intelligence.personalized_actions.risk_alerts.level)} className="ml-1 align-middle">
                  {intelligence.personalized_actions.risk_alerts.level.toUpperCase()} RISK
                </Badge>
              </b>
              <span className="text-muted-foreground">{intelligence.personalized_actions.risk_alerts.reason}</span>
              {intelligence.personalized_actions.risk_alerts.intervention_suggestions?.length ? (
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {intelligence.personalized_actions.risk_alerts.intervention_suggestions.map((suggestion: string, i: number) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => router.push(`/workspace/${levelKey}-math/flashcards`)}>
              Start drill
            </Button>
          </div>
        )}

        {/* Main Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="mastery" className="w-full">
            <TabsList className="grid w-full max-w-[640px] grid-cols-4 rounded-xl">
              <TabsTrigger value="mastery">Mastery</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="recommendations">Next steps</TabsTrigger>
            </TabsList>

            {/* Mastery Tab */}
            <TabsContent value="mastery" className="space-y-4">
              <div className="flex flex-wrap items-start gap-6">
              <Card className="min-w-0 flex-[999_1_520px] rounded-2xl">
                <CardHeader>
                  <CardTitle>Topic Mastery Levels</CardTitle>
                  <CardDescription>Your progress across different topics</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topic_mastery.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      No topic data yet. Complete quizzes to track your mastery levels.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.topic_mastery.map((topic: any) => (
                        <div key={topic.topic} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{topic.topic}</span>
                              <p className="text-xs text-muted-foreground">{topic.subject_id}</p>
                            </div>
                            <Badge variant="outline" className={cn("rounded-full", getMasteryColor(topic.confidence_score))}>
                              {getMasteryLabel(topic.confidence_score)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                            <span>{topic.confidence_score}% confidence</span>
                            <span>•</span>
                            <span>{topic.practice_count} sessions</span>
                          </div>
                          <Progress value={topic.confidence_score} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="flex-[1_1_300px] rounded-2xl">
                <CardHeader>
                  <CardTitle>Recent quizzes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getQuizHistory().length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quizzes yet. Take your first quiz to see it here.</p>
                  ) : (
                    getQuizHistory().slice(0, 4).map((quiz: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{quiz.topic}</p>
                          <p className="text-xs text-muted-foreground">{new Date(quiz.completed_at).toLocaleDateString()}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("rounded-full tabular-nums", getMasteryColor(quiz.score))}
                        >
                          {Math.round(quiz.score)}%
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              </div>

              {/* Knowledge Gaps */}
              {analytics.knowledge_gaps && analytics.knowledge_gaps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Knowledge Gaps
                    </CardTitle>
                    <CardDescription>Areas that need more attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analytics.knowledge_gaps.map((gap: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-destructive/10">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz History</CardTitle>
                  <CardDescription>Your recent quiz performances</CardDescription>
                  {historyLoading ? <p className="text-xs text-muted-foreground">Syncing latest history...</p> : null}
                </CardHeader>
                <CardContent>
                  {getQuizHistory().length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      No quiz history yet. Take your first quiz to get started!
                    </p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {getQuizHistory().map((quiz: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start justify-between border-b pb-3 last:border-0"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{quiz.subject_id}</Badge>
                                <span className="text-sm font-medium">
                                  {quiz.topic}
                                </span>
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{new Date(quiz.completed_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{quiz.score}% score</span>
                              </div>
                            </div>
                            <Badge
                              variant={quiz.score >= 80 ? "default" : quiz.score >= 60 ? "secondary" : "destructive"}
                            >
                              {Math.round(quiz.score)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Flashcard Sessions</CardTitle>
                  <CardDescription>Your flashcard practice history</CardDescription>
                </CardHeader>
                <CardContent>
                  {getFlashcardHistory().length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      No flashcard sessions yet. Start practicing to track your progress!
                    </p>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {getFlashcardHistory().map((session: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start justify-between border-b pb-3 last:border-0"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{session.subject_id}</Badge>
                                <span className="text-sm font-medium">{session.topic}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{new Date(session.completed_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{session.cards_studied} cards</span>
                                <span>•</span>
                                <span>{session.cards_mastered} mastered</span>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {Math.round(session.mastery_rate * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {intelligence?.personalized_actions?.pacing_guidance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Learning Pace
                    </CardTitle>
                    <CardDescription>Personalized pacing recommendations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-accent-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">
                          {intelligence.personalized_actions.pacing_guidance.should_advance
                            ? "Ready to Advance!"
                            : "Keep Practicing"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {intelligence.personalized_actions.pacing_guidance.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {intelligence?.personalized_actions?.study_guidance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Study Guidance
                    </CardTitle>
                    <CardDescription>Personalized tips for effective learning</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm">
                        {intelligence.personalized_actions.study_guidance.motivation_message}
                      </p>
                    </div>

                    {intelligence.personalized_actions.study_guidance.daily_goal && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm font-medium mb-1">Today's Goal</p>
                        <p className="text-sm">{intelligence.personalized_actions.study_guidance.daily_goal}</p>
                      </div>
                    )}

                    {intelligence.personalized_actions.study_guidance.break_reminder && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mt-0.5" />
                        <p>{intelligence.personalized_actions.study_guidance.break_reminder}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {intelligence?.personalized_actions?.feedback && 
               intelligence.personalized_actions.feedback.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Targeted Feedback
                    </CardTitle>
                    <CardDescription>Insights based on your recent performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {intelligence.personalized_actions.feedback.map((item: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{item.topic}</Badge>
                            <Badge variant={item.sentiment === "positive" ? "default" : "secondary"}>
                              {item.sentiment}
                            </Badge>
                          </div>
                          <p className="text-sm">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Personalized Recommendations
                  </CardTitle>
                  <CardDescription>AI-powered suggestions for your next steps</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {intelligence?.personalized_actions?.content_recommendations && (
                    <>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Next Study Suggestion</h4>
                        <div className="p-4 bg-primary/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {intelligence.personalized_actions.content_recommendations.next_study_suggestion.topic}
                            </span>
                            <Badge>
                              {intelligence.personalized_actions.content_recommendations.next_study_suggestion.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {intelligence.personalized_actions.content_recommendations.next_study_suggestion.reason}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => router.push(`/workspace/${levelKey}-math/quiz`)}>
                              Take Quiz
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/workspace/${levelKey}-math/flashcards`)}>
                              Practice Flashcards
                            </Button>
                          </div>
                        </div>
                      </div>

                      {intelligence.personalized_actions.content_recommendations.recommended_topics.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Focus Topics</h4>
                          <div className="flex flex-wrap gap-2">
                            {intelligence.personalized_actions.content_recommendations.recommended_topics.map((topic: string, i: number) => (
                              <Badge key={i} variant="outline">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Learning Intelligence Dashboard */}
        <div className="lg:col-span-3">
          <LearningDashboard userId={user.user_id} />
        </div>
      </div>
      </div>
    </div>
  )
}
