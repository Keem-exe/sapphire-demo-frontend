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
  /** Global admin. Absent until the backend ships it; treat missing as false. */
  isSuperAdmin?: boolean
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
  moduleNumber?: number | null
  moduleTitle?: string | null
  order?: number
  isArchived?: boolean
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

// ---- Question bank (admin review) ----
export type QuestionStatus = "draft" | "approved" | "rejected"
export type QuestionType = "mcq" | "short_answer" | "structured" | "essay" | "comprehension"
export type QuestionSource = "teacher" | "cxc_specimen" | "ai_generated"
export type QuestionPaper = "paper1" | "paper2" | "sba"

export interface BankQuestion {
  id: number
  subjectId: number
  status: QuestionStatus
  source: QuestionSource
  questionType: QuestionType
  stem: string
  options: { label: string; text: string }[] | null
  correctAnswer: string | null
  solutionSteps: string[] | null
  markScheme: string | null
  marks: number | null
  difficulty: number | null
  paper: QuestionPaper | null
  needsFigure: boolean
  sourceRef: string | null
  usableForTraining: boolean
  objective: { id: number; code: string; text: string } | null
  topic: { id: number; name: string } | null
  material: { id: number; filename: string; fileType: string; extractionStatus: string; extractionMethod?: string | null } | null
  contributedBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  /** Reasons the question cannot be approved yet; empty when approvable */
  problems: string[]
  createdAt: string
}

export interface QuestionSummary {
  counts: Record<QuestionStatus, number>
  drafts: { unmapped: number; needsFigure: number; fromVision: number; noAnswer: number }
  approvedForTraining: number
}

export interface QuestionObjective {
  id: number
  code: string
  text: string
  topicId?: number
  topicName?: string
}

export interface BankMaterial {
  id: number
  filename: string
  fileType?: string
  extractionStatus: string
  extractionMethod?: string | null
  text?: string | null
}

export interface BulkReviewResult {
  succeeded: number[]
  failed: { id: number; reason: string; problems?: string[] }[]
}

// ---- Material upload ----
export type IngestStatus = "queued" | "processing" | "completed" | "failed"
export type MaterialSource = "teacher" | "cxc_specimen"

export interface IngestSubject {
  id: number
  name: string
  code: string
  objectiveCount: number
  canIngest: boolean
}

export interface UploadedMaterial {
  id: number
  filename: string
  fileType: string
  ingestStatus: IngestStatus
}

export interface SkippedFile {
  filename: string
  reason: string
  existingMaterialId?: number
}

export interface UploadResult {
  materials: UploadedMaterial[]
  skipped: SkippedFile[]
}

export interface MaterialRecord {
  id: number
  subjectId: number
  filename: string
  fileType: string
  ingestStatus: IngestStatus
  questionsCreated: number | null
  extractionStatus: "pending" | "extracted" | "needs_vision" | "failed"
  extractionMethod?: string | null
  pageCount?: number | null
  error: string | null
  createdAt: string
  finishedAt?: string | null
  uploadedBy?: number | null
  questionCounts?: { draft: number; approved: number; rejected: number }
}

// ---- Tutoring dialogues ----
export type DialogueStatus = "draft" | "approved" | "rejected"
export type DialogueRole = "tutor" | "student"

export interface DialogueSource {
  id: number
  filename: string
  fileType: string
  origin: "recording" | "written"
  ingestStatus: IngestStatus
  turnCount: number | null
  dialoguesCreated: number | null
  redactions?: Record<string, number> | null
  consentConfirmed: boolean
  consentNote?: string | null
  error: string | null
  createdAt: string
  finishedAt?: string | null
  dialogueCounts?: { draft: number; approved: number; rejected: number }
}

export interface DialogueUploadResult {
  sources: { id: number; filename: string; fileType: string; ingestStatus: IngestStatus }[]
  skipped: { filename: string; reason: string; existingSourceId?: number }[]
}

export interface DialogueTurn {
  role: DialogueRole
  text: string
}

export interface DialogueItem {
  id: number
  summary: string | null
  preview: string | null
  turnCount: number
  tutorTurns: number
  tags: string[]
  quality: number | null
  qualityGuess: number | null
  piiFlags: string[]
  status: DialogueStatus
  usableForTraining: boolean
  excludedFromTraining: boolean
  sourceFilename: string | null
  subject: { id: number; name: string } | null
}

export interface DialogueDetail extends DialogueItem {
  turns: DialogueTurn[]
  approvalProblems: string[]
  reviewNote?: string | null
}

export interface DialogueSummary {
  byStatus: Record<DialogueStatus, number>
  approvedForTraining: number
  unrated: number
  flagged: number
  tags: { good: string[]; bad: string[]; excludedFromTraining: string[]; all: string[] }
}
