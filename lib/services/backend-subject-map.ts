"use client";

import { ApiClient } from "@/lib/api-client";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";

export type BackendSubject = {
  subjectId: number;
  subjectName?: string;
  subjectCode?: string;
  progressPercentage?: number;
  lastStudiedAt?: string | null;
  examDate?: string | null;
  topicCount?: number;
  level?: "csec" | "cape" | null;
  unitCount?: number;
};

export type BackendTopic = {
  id: number;
  name: string;
  subjectId?: number;
  /** Real CXC syllabus structure; null for legacy topics (flat list) */
  moduleNumber?: number | null;
  moduleTitle?: string | null;
  order?: number;
  isArchived?: boolean;
};

const api = new ApiClient();

export function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("authToken");
}

// One lookup per subject per page load: several components on a page resolve the same subject.
const resolved = new Map<SubjectId, Promise<BackendSubject>>();

/** Forget cached subject lookups (call on sign-in/sign-out so accounts never share them). */
export function clearBackendSubjectCache() {
  resolved.clear();
}

async function findEnrolled(subjectName: string): Promise<BackendSubject | undefined> {
  const response: any = await api.get("/api/subjects");
  const subjects: BackendSubject[] = response?.data?.subjects || response?.subjects || [];
  return subjects.find((s) => s.subjectName?.toLowerCase() === subjectName.toLowerCase());
}

async function resolve(subjectKey: SubjectId): Promise<BackendSubject> {
  const subjectName = SUBJECTS[subjectKey]?.name;
  if (!subjectName) throw new Error("Unknown subject.");

  const existing = await findEnrolled(subjectName);
  if (existing) return existing;

  // Not enrolled yet: enroll in the catalog subject with this exact name.
  try {
    await api.post("/api/subject", { name: subjectName, icon: SUBJECTS[subjectKey].icon, color: "#3b82f6" });
  } catch (e: any) {
    if (e?.status === 404) throw new Error(`${subjectName} isn't available yet.`);
    if (e?.status !== 409) throw e; // 409 = already enrolled; fall through and re-fetch
  }

  const enrolled = await findEnrolled(subjectName);
  if (!enrolled) throw new Error("Couldn't enrol you in this subject. Please try again.");
  return enrolled;
}

export function resolveBackendSubject(subjectKey: SubjectId): Promise<BackendSubject> {
  let pending = resolved.get(subjectKey);
  if (!pending) {
    pending = resolve(subjectKey);
    pending.catch(() => resolved.delete(subjectKey)); // retry next time after a failure
    resolved.set(subjectKey, pending);
  }
  return pending;
}

export async function fetchBackendTopics(subjectId: number): Promise<BackendTopic[]> {
  const response: any = await api.get(`/api/subject/${subjectId}/topics`);
  return response?.data?.topics || response?.topics || [];
}

export async function resolveBackendTopics(subjectId: number, topicNames: string[]): Promise<number[]> {
  const topics = await fetchBackendTopics(subjectId);
  if (!topics.length) return [];

  const selected = topics.filter((t) => topicNames.includes(t.name)).map((t) => t.id);
  if (selected.length) return selected;

  const fallbackCount = Math.max(1, topicNames.length || 1);
  return topics.slice(0, fallbackCount).map((t) => t.id);
}

export async function resolveBackendSubjectContext(subjectKey: SubjectId, topicNames: string[]) {
  const subject = await resolveBackendSubject(subjectKey);
  const topicIds = await resolveBackendTopics(subject.subjectId, topicNames);
  return { subjectId: subject.subjectId, topicIds };
}
