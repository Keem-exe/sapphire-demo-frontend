export type AccountType = "student" | "teacher" | "admin"
export type RiskLevel = "critical" | "high" | "medium" | "low"

export interface AdminUser {
  id: number
  firstName: string
  lastName: string
  email: string
  age?: number | null
  gender?: string | null
  accountType: AccountType
  isSuspended: boolean
  isFirstLogin?: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface RiskIndicator {
  id: number
  userId: number
  userName?: string
  subjectId?: number | null
  riskType: string
  riskLevel: RiskLevel
  riskScore: number
  description: string
  recommendedAction?: string
  evidence?: unknown
  isActive: boolean
  resolvedAt?: string | null
  createdAt: string
}

export interface UserDetail extends AdminUser {
  stats: {
    enrolledSubjects: number
    notes: number
    quizzesTaken: number
    flashcardSets: number
    interactionsLast30Days: number
  }
  activeRisks: RiskIndicator[]
}

export interface Subject {
  id: number
  name: string
  code: string
  icon?: string
  color?: string
}

export interface Topic {
  id: number
  subjectId: number
  name: string
  description?: string
}

export interface Reel {
  id: number
  subjectId: number
  topicId?: number | null
  topicName?: string | null
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string | null
  duration: number
  keyPoints?: string[]
  viewCount: number
  likeCount: number
  saveCount: number
  createdAt: string
}

export interface Setting {
  key: string
  value: boolean
  description: string
  updatedBy?: number | null
  updatedAt?: string | null
}
