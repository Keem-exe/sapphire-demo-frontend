"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { analyticsService } from "@/lib/services/analytics"
import { intelligenceEngine } from "@/lib/services/intelligence-engine"
import { quizHistoryService } from "@/lib/services/quiz-history-service"
import { useQuizCompletion, useNextContent } from '@/lib/hooks/use-learning-intelligence'
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
} from "lucide-react"
import { LearningDashboard } from '@/components/learning/LearningDashboard'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [intelligence, setIntelligence] = useState<any>(null)
  const [quizHistory, setQuizHistory] = useState<any[]>([])
  const [flashcardHistory, setFlashcardHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { recordCompletion } = useQuizCompletion()
  const { recommendation } = useNextContent(user?.id || null, undefined)

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    // Load analytics and intelligence data
    const loadData = async () => {
      try {
        const analyticsData = analyticsService.getAnalytics(user.user_id)
        const intelligenceData = intelligenceEngine.getLearningIntelligence(user.user_id, "csec-math")
        setAnalytics(analyticsData)
        setIntelligence(intelligenceData)
        
        // Load real quiz history from backend
        const quizData = await quizHistoryService.getQuizHistory(user.user_id, 20)
        const flashcardData = await quizHistoryService.getFlashcardHistory(user.user_id, 20)
        setQuizHistory(quizData)
        setFlashcardHistory(flashcardData)
      } catch (error) {
        console.error("Failed to load profile data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, router])

  if (!user) {
    return null
  }

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
    if (level >= 80) return "bg-green-500"
    if (level >= 60) return "bg-blue-500"
    if (level >= 40) return "bg-yellow-500"
    return "bg-red-500"
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Learning Profile</h1>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
              <User className="w-12 h-12 text-primary-foreground" />
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
                <p className="font-semibold">{user.level}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Learning Style</p>
              <Badge variant="outline" className="mt-1">{user.learning_style}</Badge>
            </div>
            {user.user_id === 999 && (
              <Badge variant="secondary" className="w-full justify-center">
                Demo Account
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2">
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
                <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-orange-500">
                  {analytics.current_streak}
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-500">
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
          <Card className="lg:col-span-3 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Learning Alert
              </CardTitle>
              <CardDescription>
                <Badge variant={getRiskBadgeColor(intelligence.personalized_actions.risk_alerts.level)}>
                  {intelligence.personalized_actions.risk_alerts.level.toUpperCase()} RISK
                </Badge>
              </CardDescription>
              <p className="text-sm mt-2">
                {intelligence.personalized_actions.risk_alerts.reason}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggested Actions:</p>
                <ul className="list-disc list-inside space-y-1">
                  {intelligence.personalized_actions.risk_alerts.intervention_suggestions?.map((suggestion: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Learning Intelligence Dashboard */}
        <div className="lg:col-span-3">
          <LearningDashboard userId={user.user_id} />
        </div>

        {/* Main Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="mastery" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mastery">Mastery</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Mastery Tab */}
            <TabsContent value="mastery" className="space-y-4">
              <Card>
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
                            <Badge variant="outline" className={getMasteryColor(topic.confidence_score)}>
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
                      <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
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
                            <Button size="sm" onClick={() => router.push(`/workspace/${user.level}-math/quiz`)}>
                              Take Quiz
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/workspace/${user.level}-math/flashcards`)}>
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
      </div>
    </div>
  )
}
