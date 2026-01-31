"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Brain, TrendingUp, AlertTriangle, Target, Zap } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StudentProfile, LearnerModel, SignalEvent } from "@/lib/types/learning-engine"
import { getLearningEngine } from "@/lib/services/learning-engine"

export function LearningEngineDemo() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [learnerModel, setLearnerModel] = useState<LearnerModel | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [recentSignals, setRecentSignals] = useState<SignalEvent[]>([])

  useEffect(() => {
    // Load Andrew Lee's profile
    fetch('/demo/andrew_lee_profile.json')
      .then(res => res.json())
      .then(data => {
        setProfile(data)
        // Initialize or load learner model
        const engine = getLearningEngine()
        const existing = engine.getLearnerModel()
        if (existing && existing.student_id === data.student_id) {
          setLearnerModel(existing)
        } else {
          const initial = engine.initializeLearnerModel(data)
          setLearnerModel(initial)
        }
      })
      .catch(err => console.error("Failed to load profile:", err))
  }, [])

  const simulateQuizSignal = async () => {
    if (!profile || !learnerModel) return
    
    setIsUpdating(true)
    const signal: SignalEvent = {
      type: 'quiz_result',
      subject: 'Mathematics',
      topic: 'fractions & ratios',
      timestamp: new Date().toISOString(),
      items: [
        { id: 1, skill: 'simplify_fractions', correct: true, time_sec: 22 },
        { id: 2, skill: 'ratio_word_problem', correct: false, time_sec: 71, chosen: 'B', correct_answer: 'D' },
        { id: 3, skill: 'fraction_of_quantity', correct: false, time_sec: 63 }
      ],
      session_behavior: { hesitation: 'high', changed_answers: 2 }
    }

    try {
      const engine = getLearningEngine()
      const updated = await engine.updateLearnerModel(profile, learnerModel, signal)
      setLearnerModel(updated)
      setRecentSignals([signal, ...recentSignals].slice(0, 5))
    } catch (error) {
      console.error("Failed to update model:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const simulateFlashcardSignal = async () => {
    if (!profile || !learnerModel) return
    
    setIsUpdating(true)
    const signal: SignalEvent = {
      type: 'flashcard_review',
      subject: 'Mathematics',
      topic: 'fractions',
      timestamp: new Date().toISOString(),
      cards: [
        { card_id: 'f01', answer_quality: 'good', seconds: 9 },
        { card_id: 'f02', answer_quality: 'partial', seconds: 21 },
        { card_id: 'f03', answer_quality: 'wrong', seconds: 18 }
      ]
    }

    try {
      const engine = getLearningEngine()
      const updated = await engine.updateLearnerModel(profile, learnerModel, signal)
      setLearnerModel(updated)
      setRecentSignals([signal, ...recentSignals].slice(0, 5))
    } catch (error) {
      console.error("Failed to update model:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const simulateShortResponse = async () => {
    if (!profile || !learnerModel) return
    
    setIsUpdating(true)
    const signal: SignalEvent = {
      type: 'short_response',
      subject: 'Mathematics',
      topic: 'ratio_word_problem',
      prompt: 'A recipe uses 2 cups of flour for every 3 cups of sugar. If sugar is 12 cups, how much flour?',
      student_answer: '6 cups because 12/2 = 6',
      timestamp: new Date().toISOString()
    }

    try {
      const engine = getLearningEngine()
      const updated = await engine.updateLearnerModel(profile, learnerModel, signal)
      setLearnerModel(updated)
      setRecentSignals([signal, ...recentSignals].slice(0, 5))
    } catch (error) {
      console.error("Failed to update model:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!profile || !learnerModel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading Learning Intelligence Engine...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Learning Intelligence Engine Demo</h1>
        </div>
        <p className="text-muted-foreground">
          Watch the engine analyze {profile.name}'s learning in real-time: <strong>Signal → Inference → Action</strong>
        </p>
      </div>

      {/* 3-Panel Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Student Actions */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Student Actions
            </CardTitle>
            <CardDescription>Simulate student activities to trigger engine updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={simulateQuizSignal}
              disabled={isUpdating}
              className="w-full"
              variant="outline"
            >
              📝 Submit Quiz Result
            </Button>
            
            <Button
              onClick={simulateFlashcardSignal}
              disabled={isUpdating}
              className="w-full"
              variant="outline"
            >
              🃏 Complete Flashcard Review
            </Button>
            
            <Button
              onClick={simulateShortResponse}
              disabled={isUpdating}
              className="w-full"
              variant="outline"
            >
              ✍️ Submit Short Answer
            </Button>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Recent Signals:</h4>
              <ScrollArea className="h-64">
                {recentSignals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No signals yet. Click a button above!</p>
                ) : (
                  <div className="space-y-2">
                    {recentSignals.map((signal, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-xs">
                        <Badge variant="outline" className="mb-1">{signal.type}</Badge>
                        <p className="text-muted-foreground">{signal.topic}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {new Date(signal.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel: Learner Model JSON */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary animate-pulse" />
              Learner Model State
              {isUpdating && <Badge variant="secondary" className="ml-auto">Updating...</Badge>}
            </CardTitle>
            <CardDescription>Live engine state (what the AI knows)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <pre className="text-xs bg-black/90 text-green-400 p-4 rounded-lg font-mono overflow-x-auto">
                {JSON.stringify(learnerModel, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Personalized Actions */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Personalized Actions
            </CardTitle>
            <CardDescription>What the engine recommends next</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Risk Alert */}
            {learnerModel.risk_alert.level !== 'none' && (
              <div className={`p-4 rounded-lg border-2 ${
                learnerModel.risk_alert.level === 'high' ? 'border-red-500 bg-red-500/10' :
                learnerModel.risk_alert.level === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                'border-blue-500 bg-blue-500/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <h4 className="font-semibold">Risk Alert: {learnerModel.risk_alert.level.toUpperCase()}</h4>
                </div>
                <p className="text-sm mb-2">{learnerModel.risk_alert.reason}</p>
                {learnerModel.risk_alert.recommended_intervention && (
                  <p className="text-xs text-muted-foreground">
                    → {learnerModel.risk_alert.recommended_intervention}
                  </p>
                )}
              </div>
            )}

            {/* Mastery Levels */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Skill Mastery
              </h4>
              {learnerModel.mastery.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {learnerModel.mastery.map((skill, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{skill.skill}</span>
                        <span className="font-mono">{(skill.level * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            skill.level >= 0.7 ? 'bg-green-500' :
                            skill.level >= 0.4 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${skill.level * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Best Actions */}
            <div>
              <h4 className="font-semibold mb-3">📍 What to Study Next</h4>
              {learnerModel.next_best_actions.map((action, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg mb-2">
                  <Badge variant="outline" className="mb-2">{action.action}</Badge>
                  <p className="text-sm font-medium">{action.topic}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.why}</p>
                </div>
              ))}
            </div>

            {/* Motivation Nudge */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
              <p className="text-sm font-medium mb-1">💬 {learnerModel.motivation_nudge.type}</p>
              <p className="text-sm">{learnerModel.motivation_nudge.message}</p>
            </div>

            {/* Pacing */}
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Pacing</p>
              <p className="font-semibold">{learnerModel.pacing_recommendation.mode.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground mt-1">{learnerModel.pacing_recommendation.reason}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
