import { SUBJECTS, DEFAULT_SUBJECT, type SubjectId } from "@/lib/data/subjects";

export type LearningStyle = "visual" | "auditory" | "readwrite" | "kinesthetic" | "mixed";

export interface UserState {
  learningStyle: LearningStyle;
  subjectId: SubjectId;
}

export function getDefaultUserState(): UserState {
  return {
    learningStyle: "mixed",
    subjectId: DEFAULT_SUBJECT,
  };
}

export function getSubjectResources(subjectId: string) {
  const subject = SUBJECTS[subjectId as SubjectId];
  if (!subject) return null;

  return {
    id: subjectId,
    name: subject.name,
    topics: subject.topics,
  };
}

import { cookies } from "next/headers";

/**
 * Retrieve user info (id, learning style, subject) from cookies or fallback defaults.
 * Prevents crashes when no session data is available.
 */
export async function getUserFromRequest() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value || "guest";
    const userName = cookieStore.get("user_name")?.value || "Unknown";
    const learningStyle =
      (cookieStore.get("learning_style")?.value as LearningStyle) || "mixed";
    const subjectId =
      (cookieStore.get("subject_id")?.value as SubjectId) || DEFAULT_SUBJECT;

    return {
      id: userId,
      name: userName,
      learningStyle,
      subjectId,
    };
  } catch {
    // fallback for edge runtimes or missing headers
    return {
      id: "guest",
      name: "Unknown",
      learningStyle: "mixed" as LearningStyle,
      subjectId: DEFAULT_SUBJECT,
    };
  }
}
