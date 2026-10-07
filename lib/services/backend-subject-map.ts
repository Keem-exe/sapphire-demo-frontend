"use client";

import { ApiClient } from "@/lib/api-client";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";

export type BackendSubject = {
  subjectId: number;
  subjectName?: string;
  subjectCode?: string;
};

export type BackendTopic = {
  id: number;
  name: string;
  subjectId?: number;
};

const api = new ApiClient();

export function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("authToken");
}

export async function resolveBackendSubject(subjectKey: SubjectId): Promise<BackendSubject> {
  const subjectName = SUBJECTS[subjectKey]?.name;

  const findMatch = async () => {
    const response: any = await api.get("/api/subjects");
    const subjects: BackendSubject[] = response?.data?.subjects || response?.subjects || [];
    return subjects.find(
      (s) =>
        s.subjectCode === subjectKey ||
        (subjectName && s.subjectName?.toLowerCase() === subjectName.toLowerCase())
    );
  };

  const existing = await findMatch();
  if (existing) return existing;

  // The backend enrolls by exact name (code = name.upper().replace(' ', '_'));
  // SUBJECTS names must match the curriculum seed so students land on subjects that have topics.
  if (!subjectName) throw new Error("Unknown subject.");
  try {
    await api.post("/api/subject", { name: subjectName, icon: subjectKey, color: "#3b82f6" });
  } catch (e: any) {
    if (e?.status !== 409) throw e; // 409 = already enrolled; fall through and re-fetch
  }

  const enrolled = await findMatch();
  if (!enrolled) throw new Error("Couldn't enrol you in this subject. Please try again.");
  return enrolled;
}

export async function fetchBackendTopics(subjectId: number): Promise<BackendTopic[]> {
  const response: any = await api.get(`/api/subject/${subjectId}/topics`);
  return response?.data?.topics || response?.topics || [];
}

export async function resolveBackendTopics(subjectId: number, topicNames: string[]): Promise<number[]> {
  const response: any = await api.get(`/api/subject/${subjectId}/topics`);
  const topics: BackendTopic[] = response?.data?.topics || response?.topics || [];

  if (!topics.length) return [];

  const selected = topics
    .filter((t) => topicNames.includes(t.name))
    .map((t) => t.id);

  if (selected.length) return selected;

  const fallbackCount = Math.max(1, topicNames.length || 1);
  return topics.slice(0, fallbackCount).map((t) => t.id);
}

export async function resolveBackendSubjectContext(subjectKey: SubjectId, topicNames: string[]) {
  const subject = await resolveBackendSubject(subjectKey);
  const topicIds = await resolveBackendTopics(subject.subjectId, topicNames);
  return { subjectId: subject.subjectId, topicIds };
}
