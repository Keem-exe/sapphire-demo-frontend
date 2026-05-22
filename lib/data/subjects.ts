// Define all subject IDs used across the app
export type SubjectId =
  | "csec-math"
  | "csec-chem"
  | "csec-eng"
  | "cape-puremath"
  | "cape-phys"
  | "cape-bio";

export interface SubjectSyllabus {
  majorTopics: string[]
  goals: string[]
  skillWeighting: {
    algorithmic: number
    conceptual: number
    reasoning: number
  }
}

export interface SubjectDefinition {
  name: string
  topics: string[]
  syllabus?: SubjectSyllabus
}

// Map of subjects with display names and core topic arrays
export const SUBJECTS: Record<SubjectId, SubjectDefinition> = {
  "csec-math": {
    name: "Mathematics",
    topics: [
      "Number Theory",
      "Algebra",
      "Linear Equations",
      "Quadratics",
      "Geometry",
      "Trigonometry",
      "Statistics",
    ],
    syllabus: {
      majorTopics: [
        "Number Theory & Computation",
        "Consumer Arithmetic",
        "Sets",
        "Measurement",
        "Algebra 1",
        "Graphs",
      ],
      goals: [
        "Build numerical confidence",
        "Handle real-life math (money, units, estimation)",
        "Understand basic algebra + graphs",
      ],
      skillWeighting: {
        algorithmic: 40,
        conceptual: 30,
        reasoning: 30,
      },
    },
  },
  "csec-chem": {
    name: "Chemistry",
    topics: [
      "Atomic Structure",
      "Bonding",
      "Chemical Reactions",
      "Stoichiometry",
      "Acids & Bases",
      "Periodic Trends",
    ],
  },
  "csec-eng": {
    name: "English",
    topics: [
      "Grammar",
      "Comprehension",
      "Summary",
      "Essay Writing",
      "Literary Devices",
    ],
  },
  "cape-puremath": {
    name: "Pure Mathematics",
    topics: [
      "Functions",
      "Limits & Continuity",
      "Differentiation",
      "Integration",
      "Sequences & Series",
      "Vectors",
      "Complex Numbers",
    ],
  },
  "cape-phys": {
    name: "Physics",
    topics: [
      "Kinematics",
      "Dynamics",
      "Work & Energy",
      "Waves",
      "Electricity & Magnetism",
      "Thermal Physics",
    ],
  },
  "cape-bio": {
    name: "Biology",
    topics: [
      "Cells",
      "Biological Molecules",
      "Genetics",
      "Human Physiology",
      "Ecology",
      "Evolution",
    ],
  },
};

// Default subject fallback (used if route param missing)
export const DEFAULT_SUBJECT: SubjectId = "csec-math";
