// Define all subject IDs used across the app
export type SubjectId =
  | "csec-math"
  | "csec-chem"
  | "csec-eng"
  | "cape-puremath"
  | "cape-phys"
  | "cape-bio";

// Map of subjects with display names and core topic arrays
export const SUBJECTS: Record<SubjectId, { name: string; topics: string[] }> = {
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
