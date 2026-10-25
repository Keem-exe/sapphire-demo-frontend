"use client";

// The signed-in student's own data: check-in, Sapphy's daily tasks, streak, real stats and
// study tracking. Every number here comes from the backend; nothing is estimated client-side.

import { apiClient } from "@/lib/api-client";

export type Level = "csec" | "cape";

export type DailyTaskType = "quiz" | "flashcards" | "reel" | "chat";

export interface DailyTask {
  id: number;
  slot: number;
  date: string;
  type: DailyTaskType;
  subjectId: number | null;
  subjectName: string | null;
  subjectCode: string | null;
  topicId: number | null;
  topicName: string | null;
  title: string;
  sapphyMessage: string | null;
  target: number;
  progress: number;
  done: boolean;
  completedAt: string | null;
}

export interface DailyTasks {
  date: string;
  tasks: DailyTask[];
  completed: number;
  total: number;
  perfectDay: boolean;
}

export interface StreakDay {
  date: string;
  weekday: string;
  isToday: boolean;
  active: boolean;
  tasksCompleted: number;
  streakDay: boolean;
  perfectDay: boolean;
}

export interface Streak {
  current: number;
  best: number;
  todayDone: boolean;
  atRisk: boolean;
  history: StreakDay[];
}

export interface NextUp {
  title: string;
  type: DailyTaskType | "quiz";
  topicId: number | null;
  topicName: string | null;
  fromTask: boolean;
}

export interface OverviewSubject {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  icon: string;
  color: string;
  level: Level | null;
  unitCount: number;
  topicCount: number;
  progressPercentage: number;
  masteryPercent: number;
  topicsMastered: number;
  syllabusCovered: number;
  lastStudiedAt: string | null;
  examDate: string | null;
  nextUp: NextUp | null;
}

export interface Overview {
  today: string;
  timezone: string;
  streak: Streak;
  dailyTasks: DailyTasks;
  subjects: OverviewSubject[];
  nextExam: { subjectId: number; subjectName: string; date: string; daysLeft: number } | null;
}

export interface TopicRow {
  id: number;
  name: string;
  moduleNumber: number | null;
  moduleTitle: string | null;
  mastery: number;
  status: string;
  attempts: number;
  nextReviewDue: string | null;
}

export interface SubjectOverview {
  subjectId: number;
  today: string;
  streak: { current: number; best: number; atRisk: boolean };
  lastStudiedAt: string | null;
  examDate: string | null;
  studyTime: {
    week: { date: string; weekday: string; isToday: boolean; minutes: number }[];
    thisWeekMinutes: number;
    lastWeekMinutes: number;
    focusMinutesThisWeek: number;
  };
  mastery: {
    totalTopics: number;
    topicsMastered: number;
    closeToMastery: number;
    topicsStarted: number;
    syllabusCovered: number;
    masteryPercent: number;
    weakestTopic: { id: number; name: string; mastery: number } | null;
  };
  topics: TopicRow[];
  tools: {
    cardsDue: number;
    flashcardSets: number;
    quizzesTaken: number;
    lastQuiz: RecentQuiz | null;
    savedReels: number;
    papersAttempted: number;
    papersAverage: number | null;
  };
  weekPlan: { tasks: DailyTask[]; done: number; total: number };
}

export interface RecentQuiz {
  id: number;
  title: string;
  subjectId: number;
  subjectName: string | null;
  difficulty: string;
  score: number | null;
  totalQuestions: number;
  percentage: number | null;
  completedAt: string | null;
}

export interface ProfileStats {
  streak: Streak;
  quizzesTaken: number;
  averageScore: number | null;
  flashcardSessions: number;
  reelsWatched: number;
  studyMinutes: number;
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  recallStrength: number | null;
  topicMastery: {
    topicId: number;
    topicName: string | null;
    subjectId: number;
    subjectName: string | null;
    mastery: number;
    status: string;
    attempts: number;
  }[];
  knowledgeGaps: {
    topicId: number;
    topicName: string | null;
    subjectId: number;
    subjectName: string;
    mastery: number;
    accuracy: number;
    attempts: number;
  }[];
  recentQuizzes: RecentQuiz[];
  subjects: { subjectId: number; subjectName: string }[];
}

export interface PastPaper {
  id: number;
  subjectId: number;
  title: string;
  year: number | null;
  paperNo: string | null;
  score: number;
  maxScore: number;
  percentage: number;
  attemptedAt: string | null;
}

export interface SavedResource {
  id: number;
  subjectId: number;
  key: string;
  title: string;
  kind: "paper" | "mark_scheme" | "syllabus" | "notes" | "reel" | "other";
  savedAt: string | null;
}

export type MeUser = Record<string, any>;

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export const meService = {
  /** Records today's visit and the browser's time zone. Tasks come from overview()/dailyTasks(). */
  async checkIn(): Promise<{ user: MeUser; streak: Streak }> {
    return unwrap(await apiClient.post("/api/me/check-in", { timezone: browserTimeZone() }));
  },
  async overview(): Promise<Overview> {
    return unwrap(await apiClient.get("/api/me/overview"));
  },
  async dailyTasks(): Promise<{ streak: Streak; dailyTasks: DailyTasks }> {
    return unwrap(await apiClient.get("/api/me/daily-tasks"));
  },
  async stats(): Promise<ProfileStats> {
    return unwrap(await apiClient.get("/api/me/stats"));
  },
  async subjectOverview(backendSubjectId: number): Promise<SubjectOverview> {
    return unwrap(await apiClient.get(`/api/me/subjects/${backendSubjectId}/overview`));
  },
  async updateMe(fields: {
    level?: Level;
    learningStyle?: string;
    timezone?: string;
    onboardingCompleted?: boolean;
  }): Promise<MeUser> {
    return unwrap<{ user: MeUser }>(await apiClient.patch("/api/users/me", fields)).user;
  },
  async getMe(): Promise<MeUser> {
    return unwrap<{ user: MeUser }>(await apiClient.get("/api/users/me")).user;
  },
  async saveLearningStyle(answers: { questionId: number; value: string }[]) {
    return unwrap(await apiClient.post("/api/learning-style", { answers }));
  },
  async setExamDate(backendSubjectId: number, examDate: string | null) {
    return unwrap(await apiClient.patch(`/api/subject/${backendSubjectId}`, { examDate }));
  },
  async catalog(level?: Level) {
    const q = level ? `?level=${level}` : "";
    return unwrap<{ subjects: any[] }>(await apiClient.get(`/api/subjects/catalog${q}`)).subjects;
  },
  async pastPapers(backendSubjectId: number): Promise<{ papers: PastPaper[]; attempted: number; average: number | null }> {
    return unwrap(await apiClient.get("/api/past-papers", { subject_id: backendSubjectId }));
  },
  async addPastPaper(body: {
    subjectId: number;
    title: string;
    year?: number | null;
    paperNo?: string | null;
    score: number;
    maxScore: number;
  }): Promise<PastPaper> {
    return unwrap<{ paper: PastPaper }>(await apiClient.post("/api/past-papers", body)).paper;
  },
  async deletePastPaper(id: number) {
    return unwrap(await apiClient.delete(`/api/past-papers/${id}`));
  },
  async startFocus(subjectId: number, plannedMinutes: number): Promise<{ id: number }> {
    return unwrap<{ session: { id: number } }>(await apiClient.post("/api/focus-sessions", { subjectId, plannedMinutes })).session;
  },
  async finishFocus(id: number, actualSeconds: number) {
    return unwrap(await apiClient.patch(`/api/focus-sessions/${id}`, { actualSeconds }));
  },
  async savedResources(backendSubjectId?: number): Promise<SavedResource[]> {
    const params = backendSubjectId ? { subject_id: backendSubjectId } : undefined;
    return unwrap<{ resources: SavedResource[] }>(await apiClient.get("/api/resources/saved", params)).resources;
  },
  async saveResource(body: { subjectId: number; key: string; title: string; kind: SavedResource["kind"] }): Promise<SavedResource> {
    return unwrap<{ resource: SavedResource }>(await apiClient.post("/api/resources/saved", body)).resource;
  },
  async unsaveResource(id: number) {
    return unwrap(await apiClient.delete(`/api/resources/saved/${id}`));
  },
  async logNoteActivity(body: { subjectId: number; durationSeconds?: number; wordCount?: number; topicId?: number | null }) {
    return unwrap(await apiClient.post("/api/learning/interactions", { type: "notebook", ...body }));
  },
};

/** Workspace route segment for a daily task type. */
export function taskRoute(type: DailyTaskType): string {
  switch (type) {
    case "quiz":
      return "quiz";
    case "flashcards":
      return "flashcards";
    case "reel":
      return "reels";
    default:
      return ""; // chat opens the subject workspace, where Sapphy lives
  }
}
