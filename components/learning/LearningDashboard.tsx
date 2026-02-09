/**
 * Learning Intelligence Dashboard Component
 * Displays personalized learning insights, mastery levels, and recommendations
 */

'use client'

import { useLearningDashboard, useKnowledgeGaps, useRiskDetection } from '@/lib/hooks/use-learning-intelligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, TrendingUp, Target, Lightbulb } from 'lucide-react'

interface LearningDashboardProps {
  userId: number
  subjectId?: number
}

export function LearningDashboard({ userId, subjectId }: LearningDashboardProps) {
  const { dashboard, loading: dashboardLoading } = useLearningDashboard(userId)
  const { gaps, loading: gapsLoading } = useKnowledgeGaps(userId, subjectId)
  const { risks, loading: risksLoading } = useRiskDetection(userId)

  if (dashboardLoading || gapsLoading || risksLoading) {
    return <div className="p-4">Loading learning insights...</div>
  }

  const criticalRisks = risks.filter(r => r.riskLevel === 'critical')
  const highRisks = risks.filter(r => r.riskLevel === 'high')
  const activeRecommendations = dashboard?.recommendations.filter(r => r.isActive) || []

  return (
    <div className="space-y-6">
      {/* Risk Alerts */}
      {(criticalRisks.length > 0 || highRisks.length > 0) && (
        <div className="space-y-3">
          {criticalRisks.map(risk => (
            <Alert key={risk.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{risk.description}</AlertTitle>
              <AlertDescription>{risk.recommendedAction}</AlertDescription>
            </Alert>
          ))}
          {highRisks.map(risk => (
            <Alert key={risk.id}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{risk.description}</AlertTitle>
              <AlertDescription>{risk.recommendedAction}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Study Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.total_interactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Study streak: {dashboard?.study_streak || 0} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics Mastered</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.mastery_levels.filter(m => m.status === 'mastered').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.mastery_levels.filter(m => m.status === 'proficient').length || 0} proficient
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recommendations</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRecommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeRecommendations.filter(r => r.priority >= 8).length} high priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mastery Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Mastery Progress</CardTitle>
          <CardDescription>Your progress across topics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dashboard?.mastery_levels.slice(0, 5).map(mastery => (
            <div key={mastery.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Topic {mastery.topicId}</span>
                  <MasteryBadge status={mastery.status} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(mastery.masteryScore * 100)}%
                </span>
              </div>
              <Progress value={mastery.masteryScore * 100} />
              <p className="text-xs text-muted-foreground">
                {mastery.correctAttempts}/{mastery.totalAttempts} correct
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>Topics that need attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.map(gap => (
              <div key={gap.topic_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{gap.topic_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Mastery: {Math.round(gap.mastery_score * 100)}%
                  </p>
                </div>
                <Badge variant={gap.gap_severity === 'high' ? 'destructive' : 'secondary'}>
                  {gap.gap_severity} priority
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {activeRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Personalized next steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRecommendations.slice(0, 5).map(rec => (
              <div key={rec.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{rec.title}</p>
                    {rec.priority >= 8 && <Badge variant="destructive">High Priority</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Reason: {rec.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MasteryBadge({ status }: { status: string }) {
  const variants = {
    not_started: 'secondary',
    struggling: 'destructive',
    learning: 'default',
    proficient: 'default',
    mastered: 'default',
  } as const

  const colors = {
    not_started: 'bg-gray-500',
    struggling: 'bg-red-500',
    learning: 'bg-yellow-500',
    proficient: 'bg-blue-500',
    mastered: 'bg-green-500',
  }

  return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
      <span className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors]} mr-1`} />
      {status.replace('_', ' ')}
    </Badge>
  )
}
