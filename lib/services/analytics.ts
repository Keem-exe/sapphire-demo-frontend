/**
 * Learning Intelligence Analytics Service
 * Tracks student learning signals and provides analytics
 */

import type {
  QuizPerformance,
  FlashcardSession,
  NotebookActivity,
  ChatSession,
  StudySession,
  StudentAnalytics,
  TopicMastery,
  MasteryLevel,
  RiskLevel,
  LearningActivity,
} from "@/lib/types/analytics";

const STORAGE_KEYS = {
  QUIZ_HISTORY: "sapphire_quiz_history",
  FLASHCARD_HISTORY: "sapphire_flashcard_history",
  NOTEBOOK_HISTORY: "sapphire_notebook_history",
  CHAT_HISTORY: "sapphire_chat_history",
  STUDY_SESSIONS: "sapphire_study_sessions",
  ANALYTICS: "sapphire_analytics",
} as const;

class AnalyticsService {
  // Track Quiz Performance
  trackQuiz(quizData: Omit<QuizPerformance, "completed_at">): void {
    const performance: QuizPerformance = {
      ...quizData,
      completed_at: new Date(),
    };

    const history = this.getQuizHistory();
    history.push(performance);
    
    // Keep last 100 quizzes
    if (history.length > 100) history.shift();
    
    localStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(history));
    this.updateAnalytics();
  }

  // Track Flashcard Session
  trackFlashcards(sessionData: Omit<FlashcardSession, "completed_at">): void {
    const session: FlashcardSession = {
      ...sessionData,
      completed_at: new Date(),
    };

    const history = this.getFlashcardHistory();
    history.push(session);
    
    // Keep last 100 sessions
    if (history.length > 100) history.shift();
    
    localStorage.setItem(STORAGE_KEYS.FLASHCARD_HISTORY, JSON.stringify(history));
    this.updateAnalytics();
  }

  // Track Notebook Activity
  trackNotebook(notebookData: Omit<NotebookActivity, "created_at">): void {
    const activity: NotebookActivity = {
      ...notebookData,
      created_at: new Date(),
    };

    const history = this.getNotebookHistory();
    history.push(activity);
    
    // Keep last 50 notebook entries
    if (history.length > 50) history.shift();
    
    localStorage.setItem(STORAGE_KEYS.NOTEBOOK_HISTORY, JSON.stringify(history));
    this.updateAnalytics();
  }

  // Track Chat Session
  trackChat(chatData: Omit<ChatSession, "completed_at">): void {
    const session: ChatSession = {
      ...chatData,
      completed_at: new Date(),
    };

    const history = this.getChatHistory();
    history.push(session);
    
    // Keep last 50 chat sessions
    if (history.length > 50) history.shift();
    
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
    this.updateAnalytics();
  }

  // Start Study Session
  startSession(userId: number, subjectId: string, activityType: LearningActivity): string {
    const sessionId = crypto.randomUUID();
    const session: StudySession = {
      session_id: sessionId,
      user_id: userId,
      subject_id: subjectId,
      activity_type: activityType,
      start_time: new Date(),
      duration: 0,
      completed: false,
    };

    const sessions = this.getStudySessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(sessions));
    
    return sessionId;
  }

  // End Study Session
  endSession(sessionId: string): void {
    const sessions = this.getStudySessions();
    const session = sessions.find(s => s.session_id === sessionId);
    
    if (session && !session.completed) {
      session.end_time = new Date();
      session.duration = Math.floor(
        (session.end_time.getTime() - new Date(session.start_time).getTime()) / 1000
      );
      session.completed = true;
      
      localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(sessions));
      this.updateAnalytics();
    }
  }

  // Get Analytics Data
  getAnalytics(userId: number): StudentAnalytics {
    const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.calculateAnalytics(userId);
      }
    }
    return this.calculateAnalytics(userId);
  }

  // Calculate Complete Analytics
  private calculateAnalytics(userId: number): StudentAnalytics {
    const quizHistory = this.getQuizHistory();
    const flashcardHistory = this.getFlashcardHistory();
    const sessions = this.getStudySessions().filter(s => s.user_id === userId && s.completed);

    // Calculate total study time
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0) / 60; // minutes

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(sessions);

    // Calculate quiz performance
    const quizPerformance = {
      total_quizzes: quizHistory.length,
      average_score: quizHistory.length > 0
        ? quizHistory.reduce((sum, q) => sum + q.score, 0) / quizHistory.length
        : 0,
      best_subject: this.getBestSubject(quizHistory),
      improvement_rate: this.calculateImprovementRate(quizHistory),
    };

    // Calculate flashcard performance
    const flashcardPerformance = {
      total_sessions: flashcardHistory.length,
      average_recall: flashcardHistory.length > 0
        ? flashcardHistory.reduce((sum, f) => sum + f.recall_strength, 0) / flashcardHistory.length
        : 0,
      cards_mastered: flashcardHistory.reduce((sum, f) => sum + f.cards_mastered, 0),
    };

    // Calculate topic mastery
    const topicMastery = this.calculateTopicMastery(quizHistory, flashcardHistory);

    // Identify knowledge gaps
    const knowledge_gaps = quizHistory
      .flatMap(q => q.knowledge_gaps)
      .filter((gap, index, self) => self.indexOf(gap) === index)
      .slice(0, 10); // Top 10 gaps

    // Determine risk level
    const risk_level = this.calculateRiskLevel(quizPerformance.average_score, currentStreak, sessions);

    const analytics: StudentAnalytics = {
      user_id: userId,
      total_study_time: totalStudyTime,
      sessions_completed: sessions.length,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      quiz_performance: quizPerformance,
      flashcard_performance: flashcardPerformance,
      topic_mastery: topicMastery,
      knowledge_gaps,
      risk_level,
      last_active: sessions.length > 0 ? new Date(sessions[sessions.length - 1].end_time!) : new Date(),
    };

    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
    return analytics;
  }

  private calculateTopicMastery(
    quizHistory: QuizPerformance[],
    flashcardHistory: FlashcardSession[]
  ): TopicMastery[] {
    const topicMap = new Map<string, {
      scores: number[];
      recalls: number[];
      lastPracticed: Date;
      count: number;
      subjectId: string;
    }>();

    // Aggregate quiz data
    quizHistory.forEach(quiz => {
      const key = `${quiz.subject_id}:${quiz.topic}`;
      const existing = topicMap.get(key) || {
        scores: [],
        recalls: [],
        lastPracticed: quiz.completed_at,
        count: 0,
        subjectId: quiz.subject_id,
      };
      existing.scores.push(quiz.score);
      existing.lastPracticed = quiz.completed_at;
      existing.count++;
      topicMap.set(key, existing);
    });

    // Aggregate flashcard data
    flashcardHistory.forEach(session => {
      const key = `${session.subject_id}:${session.topic}`;
      const existing = topicMap.get(key) || {
        scores: [],
        recalls: [],
        lastPracticed: session.completed_at,
        count: 0,
        subjectId: session.subject_id,
      };
      existing.recalls.push(session.recall_strength);
      if (session.completed_at > existing.lastPracticed) {
        existing.lastPracticed = session.completed_at;
      }
      existing.count++;
      topicMap.set(key, existing);
    });

    // Calculate mastery for each topic
    const masteryList: TopicMastery[] = [];
    topicMap.forEach((data, key) => {
      const [subjectId, topic] = key.split(":");
      const quizAvg = data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0;
      const flashcardAvg = data.recalls.length > 0
        ? data.recalls.reduce((a, b) => a + b, 0) / data.recalls.length
        : 0;

      const confidence = Math.round((quizAvg + flashcardAvg) / 2);
      
      masteryList.push({
        topic,
        subject_id: subjectId,
        mastery_level: this.getMasteryLevel(confidence),
        confidence_score: confidence,
        quiz_average: Math.round(quizAvg),
        flashcard_accuracy: Math.round(flashcardAvg),
        last_practiced: data.lastPracticed,
        practice_count: data.count,
      });
    });

    return masteryList.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  private getMasteryLevel(confidence: number): MasteryLevel {
    if (confidence >= 85) return "mastery";
    if (confidence >= 70) return "proficient";
    if (confidence >= 50) return "developing";
    return "beginner";
  }

  private calculateStreaks(sessions: StudySession[]): { currentStreak: number; longestStreak: number } {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const sortedSessions = sessions
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const dates = new Set(
      sortedSessions.map(s => new Date(s.start_time).toDateString())
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = new Date();
    lastDate.setDate(lastDate.getDate() + 1); // Start from tomorrow

    Array.from(dates).reverse().forEach(dateStr => {
      const date = new Date(dateStr);
      const daysDiff = Math.floor(
        (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
        currentStreak = tempStreak;
      } else if (daysDiff > 1) {
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = date;
    });

    return { currentStreak, longestStreak };
  }

  private getBestSubject(quizHistory: QuizPerformance[]): string {
    const subjectScores = new Map<string, number[]>();
    
    quizHistory.forEach(quiz => {
      const scores = subjectScores.get(quiz.subject_id) || [];
      scores.push(quiz.score);
      subjectScores.set(quiz.subject_id, scores);
    });

    let bestSubject = "None";
    let bestAverage = 0;

    subjectScores.forEach((scores, subject) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestSubject = subject;
      }
    });

    return bestSubject;
  }

  private calculateImprovementRate(quizHistory: QuizPerformance[]): number {
    if (quizHistory.length < 2) return 0;

    const recent = quizHistory.slice(-5);
    const older = quizHistory.slice(0, Math.min(5, quizHistory.length - 5));

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, q) => sum + q.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, q) => sum + q.score, 0) / older.length;

    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  }

  private calculateRiskLevel(averageScore: number, currentStreak: number, sessions: StudySession[]): RiskLevel {
    const daysSinceLastActivity = sessions.length > 0
      ? Math.floor((new Date().getTime() - new Date(sessions[sessions.length - 1].end_time!).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastActivity > 7 || averageScore < 40) return "high";
    if (daysSinceLastActivity > 3 || averageScore < 60) return "medium";
    if (currentStreak === 0 || averageScore < 75) return "low";
    return "none";
  }

  private updateAnalytics(): void {
    const userId = this.getCurrentUserId();
    if (userId) {
      this.calculateAnalytics(userId);
    }
  }

  private getCurrentUserId(): number | null {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.user_id;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Getter Methods
  getQuizHistory(): QuizPerformance[] {
    const stored = localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
    return stored ? JSON.parse(stored) : [];
  }

  getFlashcardHistory(): FlashcardSession[] {
    const stored = localStorage.getItem(STORAGE_KEYS.FLASHCARD_HISTORY);
    return stored ? JSON.parse(stored) : [];
  }

  getNotebookHistory(): NotebookActivity[] {
    const stored = localStorage.getItem(STORAGE_KEYS.NOTEBOOK_HISTORY);
    return stored ? JSON.parse(stored) : [];
  }

  getChatHistory(): ChatSession[] {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return stored ? JSON.parse(stored) : [];
  }

  getStudySessions(): StudySession[] {
    const stored = localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
    return stored ? JSON.parse(stored) : [];
  }

  // Clear all analytics data
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const analyticsService = new AnalyticsService();
