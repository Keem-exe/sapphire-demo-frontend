# Frontend Integration Guide
### Learning Intelligence Engine Integration

This guide shows you how to integrate the Learning Intelligence Engine with your Next.js frontend.

---

## 📁 Files Created

### 1. **Service Layer** - `lib/services/learning-intelligence-service.ts`
Client-side service with TypeScript types and API methods:
- `getDashboard()` - Get comprehensive learning dashboard
- `getNextContent()` - Get personalized content recommendation
- `getMasteryLevel()` - Get mastery for specific topic
- `getKnowledgeGaps()` - Find areas needing attention
- `recordQuizCompletion()` - Track quiz results
- `recordFlashcardPractice()` - Track flashcard reviews
- `detectRisks()` - Identify at-risk patterns

### 2. **React Hooks** - `lib/hooks/use-learning-intelligence.ts`
Custom hooks for easy data fetching:
- `useLearningDashboard(userId)` - Dashboard data with loading states
- `useNextContent(userId, subjectId)` - Next recommended content
- `useMasteryLevel(userId, subjectId, topicId)` - Mastery for topic
- `useKnowledgeGaps(userId, subjectId)` - Knowledge gaps
- `useRiskDetection(userId)` - Risk alerts
- `useQuizCompletion()` - Record quiz with automatic mastery update
- `useFlashcardPractice()` - Record flashcard practice

### 3. **Dashboard Component** - `components/learning/LearningDashboard.tsx`
Pre-built React component showing:
- Risk alerts (critical/high priority)
- Study statistics
- Mastery progress bars
- Knowledge gaps
- Personalized recommendations

---

## 🚀 Quick Start

### 1. Update API Configuration

Add learning intelligence endpoints to `lib/api-config.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  
  endpoints: {
    // ... existing endpoints
    
    // Learning Intelligence endpoints
    learning: {
      dashboard: '/api/learning/dashboard',
      nextContent: '/api/learning/next-content',
      mastery: '/api/learning/mastery',
      knowledgeGaps: '/api/learning/knowledge-gaps',
      insights: '/api/learning/insights',
      pacing: '/api/learning/pacing',
      adjustDifficulty: '/api/learning/adjust-difficulty',
      risks: '/api/learning/risks',
      detectRisks: '/api/learning/detect-risks',
      recordQuiz: '/api/learning/record-quiz',
      recordFlashcard: '/api/learning/record-flashcard',
      feedback: '/api/learning/feedback',
    },
  },
}
```

### 2. Add Learning Dashboard to Profile Page

In `app/profile/page.tsx`:

```typescript
'use client'

import { LearningDashboard } from '@/components/learning/LearningDashboard'
import { useAuth } from '@/contexts/auth-context'

export default function ProfilePage() {
  const { user } = useAuth()
  
  if (!user) return <div>Please log in</div>

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Learning Profile</h1>
      
      {/* Learning Intelligence Dashboard */}
      <LearningDashboard userId={user.id} />
    </div>
  )
}
```

### 3. Integrate with Quiz Grading

In `app/quiz/grade/page.tsx` (or your quiz result component):

```typescript
'use client'

import { useQuizCompletion } from '@/lib/hooks/use-learning-intelligence'
import { useEffect } from 'react'

export default function QuizGradePage() {
  const { recordCompletion } = useQuizCompletion()
  
  // After quiz is graded
  useEffect(() => {
    const recordQuizResult = async () => {
      if (quizCompleted && quizResults) {
        try {
          await recordCompletion({
            userId: user.id,
            subjectId: quiz.subjectId,
            topicId: quiz.topicId,
            quizId: quiz.id,
            score: quizResults.score / 100, // Convert to 0-1
            durationSeconds: quizResults.duration,
          })
          
          console.log('Quiz recorded, mastery updated!')
        } catch (error) {
          console.error('Failed to record quiz:', error)
        }
      }
    }
    
    recordQuizResult()
  }, [quizCompleted, quizResults])
  
  return (
    <div>
      {/* Your quiz results UI */}
    </div>
  )
}
```

### 4. Show Next Recommended Content

In `app/workspace/[subjectId]/page.tsx`:

```typescript
'use client'

import { useNextContent } from '@/lib/hooks/use-learning-intelligence'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function WorkspacePage({ params }: { params: { subjectId: string } }) {
  const { user } = useAuth()
  const { recommendation, loading } = useNextContent(
    user?.id || null, 
    parseInt(params.subjectId)
  )
  
  if (loading) return <div>Loading recommendation...</div>
  
  return (
    <div className="container mx-auto p-6">
      {/* Recommended Next Topic */}
      {recommendation && (
        <Card className="mb-6 p-6 border-2 border-primary">
          <h2 className="text-xl font-bold mb-2">📚 Recommended for You</h2>
          <p className="text-lg mb-2">{recommendation.topic_name}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {recommendation.reason}
          </p>
          <div className="flex gap-2">
            <Badge>{recommendation.difficulty}</Badge>
            <Badge variant="outline">
              ~{recommendation.estimated_duration} min
            </Badge>
          </div>
          <Button className="mt-4">Start Learning</Button>
        </Card>
      )}
      
      {/* Rest of workspace */}
    </div>
  )
}
```

### 5. Integrate with Flashcards

In `app/flashcards/page.tsx`:

```typescript
'use client'

import { useFlashcardPractice } from '@/lib/hooks/use-learning-intelligence'
import { useState } from 'react'

export default function FlashcardsPage() {
  const { recordPractice } = useFlashcardPractice()
  const [startTime, setStartTime] = useState<number>(0)
  
  const handleCardFlip = () => {
    setStartTime(Date.now())
  }
  
  const handleAnswer = async (wasCorrect: boolean, userGuessed: boolean = false) => {
    const responseTime = Date.now() - startTime
    
    try {
      await recordPractice({
        userId: user.id,
        flashcardId: currentCard.id,
        wasCorrect,
        responseTimeMs: responseTime,
        userGuessed, // Important for detecting false positives!
      })
      
      // Move to next card
      nextCard()
    } catch (error) {
      console.error('Failed to record practice:', error)
    }
  }
  
  return (
    <div>
      {/* Flashcard UI */}
      <div className="mt-4 space-x-2">
        <Button onClick={() => handleAnswer(false)}>Wrong</Button>
        <Button onClick={() => handleAnswer(true, true)}>Correct (Guessed)</Button>
        <Button onClick={() => handleAnswer(true, false)}>Correct (Knew It)</Button>
      </div>
    </div>
  )
}
```

### 6. Display Knowledge Gaps

Create `components/learning/KnowledgeGapsWidget.tsx`:

```typescript
'use client'

import { useKnowledgeGaps } from '@/lib/hooks/use-learning-intelligence'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function KnowledgeGapsWidget({ userId, subjectId }: { userId: number; subjectId?: number }) {
  const { gaps, loading } = useKnowledgeGaps(userId, subjectId)
  
  if (loading) return <div>Loading gaps...</div>
  if (gaps.length === 0) return null
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>⚠️ Focus Areas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gaps.map(gap => (
          <div key={gap.topic_id}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{gap.topic_name}</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(gap.mastery_score * 100)}%
              </span>
            </div>
            <Progress value={gap.mastery_score * 100} />
            <ul className="text-xs text-muted-foreground mt-2 ml-4">
              {gap.recommended_actions.map((action, i) => (
                <li key={i}>• {action}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

---

## 🎨 Advanced Use Cases

### Risk Detection Alert Component

```typescript
'use client'

import { useRiskDetection } from '@/lib/hooks/use-learning-intelligence'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function RiskAlerts({ userId }: { userId: number }) {
  const { risks } = useRiskDetection(userId)
  
  const criticalRisks = risks.filter(r => r.riskLevel === 'critical')
  
  if (criticalRisks.length === 0) return null
  
  return (
    <div className="space-y-2">
      {criticalRisks.map(risk => (
        <Alert key={risk.id} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{risk.description}</AlertTitle>
          <AlertDescription>
            {risk.recommendedAction}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
```

### Mastery Progress Indicator

```typescript
'use client'

import { useMasteryLevel } from '@/lib/hooks/use-learning-intelligence'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export function MasteryIndicator({ 
  userId, 
  subjectId, 
  topicId 
}: { 
  userId: number
  subjectId: number
  topicId: number 
}) {
  const { mastery, loading } = useMasteryLevel(userId, subjectId, topicId)
  
  if (loading || !mastery) return null
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Mastery</span>
        <Badge variant={mastery.status === 'mastered' ? 'default' : 'secondary'}>
          {mastery.status}
        </Badge>
      </div>
      <Progress value={mastery.masteryScore * 100} />
      <p className="text-xs text-muted-foreground">
        {mastery.correctAttempts} / {mastery.totalAttempts} correct
      </p>
    </div>
  )
}
```

---

## 🔧 Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

For production:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-railway-backend.railway.app
```

---

## 📊 Testing

### Test with Demo Users

Use these demo user IDs for testing:

1. **Sarah Chen** (ID: 2) - High performer
2. **Marcus Williams** (ID: 3) - Struggling student
3. **Alicia Lopez** (ID: 4) - Balanced learner
4. **Jayden Baptiste** (ID: 5) - Crammer
5. **Priya Sharma** (ID: 6) - Exceptional
6. **Kayla Joseph** (ID: 7) - At-risk

### Test API Directly

```typescript
import { learningIntelligenceService } from '@/lib/services/learning-intelligence-service'

// Get dashboard
const dashboard = await learningIntelligenceService.getDashboard(2)
console.log(dashboard)

// Get next content
const next = await learningIntelligenceService.getNextContent(2, 1)
console.log(next)

// Detect risks
const risks = await learningIntelligenceService.detectRisks(3)
console.log(risks)
```

---

## 🎯 Best Practices

1. **Always record interactions** - Call `recordQuizCompletion()` and `recordFlashcardPractice()` after every activity
2. **Show personalized feedback** - Use `getPersonalizedFeedback()` when grading questions
3. **Display risks prominently** - Show critical risks at the top of dashboards
4. **Update in real-time** - Call `refresh()` functions after recording new data
5. **Handle errors gracefully** - All hooks return error states

---

## 🚨 Common Issues

### 1. CORS Errors
Make sure Flask backend has CORS enabled for your frontend URL:
```python
# backend config.py
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
```

### 2. 404 Errors
Verify backend is running on correct port (default: 5000)

### 3. Type Errors
Run `npm run type-check` to catch TypeScript issues early

---

## 📚 Next Steps

1. **Add the dashboard** to your profile page
2. **Integrate quiz recording** in your quiz grading flow
3. **Show knowledge gaps** on subject workspace pages
4. **Display risk alerts** for struggling students
5. **Personalize content recommendations** based on mastery

The learning intelligence engine is now ready to make your app truly adaptive! 🚀
