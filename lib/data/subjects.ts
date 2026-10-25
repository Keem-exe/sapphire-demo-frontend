// The subjects Sapphire offers. The backend catalog (GET /api/subjects/catalog) is the source of
// truth for topics and progress; this list maps URL ids to backend subject names and gives the
// demo account (which has no backend session) an offline topic list.
//
// Launch catalog: CSEC Mathematics and English A; CAPE Caribbean Studies and Communication Studies.

export type SubjectId =
  | "csec-math"
  | "csec-eng"
  | "cape-caribbean-studies"
  | "cape-communication-studies"

export type Level = "csec" | "cape"

export interface SubjectDefinition {
  /** Exact backend subject name: the backend matches subjects by code name.upper().replace(" ", "_") */
  name: string
  level: Level
  icon: string
  /** CAPE Caribbean Studies and Communication Studies are single-unit subjects */
  units: number
  /** Offline topic list, only used for the demo account. Signed-in students get the backend's topics. */
  topics: string[]
}

export const SUBJECTS: Record<SubjectId, SubjectDefinition> = {
  "csec-math": {
    name: "Mathematics",
    level: "csec",
    icon: "📐",
    units: 1,
    topics: [
      "Number Theory",
      "Consumer Arithmetic",
      "Sets",
      "Measurement",
      "Algebra",
      "Relations, Functions and Graphs",
      "Geometry and Trigonometry",
      "Vectors and Matrices",
      "Statistics",
    ],
  },
  "csec-eng": {
    name: "English A",
    level: "csec",
    icon: "📚",
    units: 1,
    topics: [
      "Comprehension",
      "Summary Writing",
      "Essay Writing",
      "Grammar and Usage",
      "Vocabulary",
      "Figurative Language",
      "Letter Writing",
      "Oral Communication",
    ],
  },
  "cape-caribbean-studies": {
    name: "Caribbean Studies",
    level: "cape",
    icon: "🌴",
    units: 1,
    topics: [
      "Location and Definition of the Caribbean",
      "Geographical Phenomena",
      "Historical Evolution of Caribbean Society",
      "Characteristics of Society and Culture",
      "Identity and Social Formation",
      "Caribbean-Global Interactions",
      "Concepts and Indicators of Development",
      "Globalisation and Development",
      "Regional Integration",
      "Research Design",
    ],
  },
  "cape-communication-studies": {
    name: "Communication Studies",
    level: "cape",
    icon: "💬",
    units: 1,
    topics: [
      "Sources of Information",
      "Evaluating Sources",
      "Reading and Listening Comprehension",
      "Summary Skills",
      "Nature and Functions of Language",
      "The Caribbean Language Situation",
      "Register and Dialect",
      "The Communication Process",
      "Expository and Persuasive Writing",
      "Oral Presentation",
    ],
  },
}

export const DEFAULT_SUBJECT: SubjectId = "csec-math"

export const SUBJECT_IDS = Object.keys(SUBJECTS) as SubjectId[]

/** Subjects offered at a level, in display order. */
export function subjectsForLevel(level: Level): SubjectId[] {
  return SUBJECT_IDS.filter((id) => SUBJECTS[id].level === level)
}

// Short or older ids that may still be in bookmarks or links.
const ALIASES: Record<string, SubjectId> = {
  "1": "csec-math",
  "2": "csec-eng",
  "csec-1": "csec-math",
  "csec-2": "csec-eng",
  "csec-english": "csec-eng",
  "csec-mathematics": "csec-math",
  "cape-1": "cape-caribbean-studies",
  "cape-2": "cape-communication-studies",
  "cape-caribbean": "cape-caribbean-studies",
  "cape-comm": "cape-communication-studies",
}

/** Canonical subject id for a URL segment; unknown ids are returned unchanged (and render "Unknown subject"). */
export function normalizeSubjectId(id: string): SubjectId {
  const key = String(id || "").trim().toLowerCase()
  return (ALIASES[key] || key) as SubjectId
}

/** Frontend subject id for a backend subject name, or null if Sapphire doesn't offer it. */
export function subjectIdForName(name?: string | null): SubjectId | null {
  if (!name) return null
  const wanted = name.trim().toLowerCase()
  return SUBJECT_IDS.find((id) => SUBJECTS[id].name.toLowerCase() === wanted) ?? null
}
