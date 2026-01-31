/**
 * Seed demo data for Andrew Lee (demo user)
 * Creates sample quiz, flashcard, and study session history
 */

import { analyticsService } from "./analytics"

export function seedDemoUserData() {
  // TEMPORARILY DISABLED - Type errors need fixing
  console.log("Demo data seeding temporarily disabled")
  return
  
  // Check if already seeded
  if (typeof window === "undefined") return
  
  const seeded = localStorage.getItem("demo_data_seeded")
  if (seeded === "true") return

  console.log("Seeding demo data for Andrew Lee...")

  /* COMMENTED OUT - Type errors
  // Seed quiz history
  const quizzes = [
    {
      subject_id: "csec-math",
      topics: ["Algebra", "Linear Equations"],
      score: 85,
      questions_answered: 10,
      correct_answers: 8,
      time_spent: 420, // 7 minutes
      difficulty: "medium" as const,
      knowledge_gaps: ["word problems"],
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      subject_id: "csec-math",
      topics: ["Fractions", "Ratios"],
      score: 60,
      questions_answered: 10,
      correct_answers: 6,
      time_spent: 540, // 9 minutes
      difficulty: "medium" as const,
      knowledge_gaps: ["ratio word problems", "fraction multiplication"],
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
      subject_id: "csec-math",
      topics: ["Geometry", "Angles"],
      score: 90,
      questions_answered: 10,
      correct_answers: 9,
      time_spent: 360, // 6 minutes
      difficulty: "easy" as const,
      knowledge_gaps: [],
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    },
    {
      subject_id: "csec-chem",
      topics: ["Periodic Table", "Elements"],
      score: 75,
      questions_answered: 8,
      correct_answers: 6,
      time_spent: 480, // 8 minutes
      difficulty: "medium" as const,
      knowledge_gaps: ["electron configuration"],
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
  ]

  quizzes.forEach((quiz) => {
    analyticsService.trackQuiz(quiz)
  })

  // Seed flashcard sessions
  const flashcardSessions = [
    {
      subject_id: "csec-math",
      topics: ["Algebra"],
      cards_reviewed: 15,
      cards_mastered: 12,
      cards_learning: 3,
      average_recall_strength: 0.8,
      time_spent: 600, // 10 minutes
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      subject_id: "csec-math",
      topics: ["Fractions"],
      cards_reviewed: 20,
      cards_mastered: 10,
      cards_learning: 10,
      average_recall_strength: 0.5,
      time_spent: 720, // 12 minutes
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      subject_id: "csec-chem",
      topics: ["Periodic Table"],
      cards_reviewed: 12,
      cards_mastered: 9,
      cards_learning: 3,
      average_recall_strength: 0.75,
      time_spent: 540, // 9 minutes
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  flashcardSessions.forEach((session) => {
    analyticsService.trackFlashcards(session)
  })

  // Seed study sessions
  const studySessions = [
    {
      subject_id: "csec-math",
      start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      duration: 2700, // 45 minutes
      activities: ["quiz", "flashcards"],
    },
    {
      subject_id: "csec-math",
      start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      duration: 1800, // 30 minutes
      activities: ["quiz"],
    },
    {
      subject_id: "csec-chem",
      start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
      duration: 1500, // 25 minutes
      activities: ["quiz", "flashcards"],
    },
  ]

  studySessions.forEach((session) => {
    // Start and end session to track
    const sessionId = analyticsService.startSession(session.subject_id)
    // Manually set the duration in localStorage
    const sessions = analyticsService.getStudySessions()
    const currentSession = sessions.find((s) => s.session_id === sessionId)
    if (currentSession) {
      currentSession.start_time = session.start_time
      currentSession.end_time = session.end_time
      currentSession.duration_seconds = session.duration
      currentSession.activities = session.activities
      localStorage.setItem("sapphire_study_sessions", JSON.stringify(sessions))
    }
  })

  // Seed some notebook activity
  analyticsService.trackNotebook({
    subject_id: "csec-math",
    topic: "Algebra Notes",
    action: "create",
    word_count: 250,
    time_spent: 600,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  })

  analyticsService.trackNotebook({
    subject_id: "csec-math",
    topic: "Geometry Summary",
    action: "edit",
    word_count: 180,
    time_spent: 420,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // Seed some chat activity
  analyticsService.trackChat({
    subject_id: "csec-math",
    topic: "Fractions Help",
    messages_sent: 5,
    ai_responses: 5,
    helpful: true,
    time_spent: 480,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  })

  analyticsService.trackChat({
    subject_id: "csec-math",
    topic: "Ratio Word Problems",
    messages_sent: 3,
    ai_responses: 3,
    helpful: true,
    time_spent: 300,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  })
  */

  localStorage.setItem("demo_data_seeded", "true")
  console.log("Demo data seeding skipped (disabled)")
}

export function clearDemoUserData() {
  if (typeof window === "undefined") return
  
  analyticsService.clearAllData()
  localStorage.removeItem("demo_data_seeded")
  console.log("Demo data cleared!")
}
