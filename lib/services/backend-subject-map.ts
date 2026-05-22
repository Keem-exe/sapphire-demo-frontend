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
  const response: any = await api.get("/api/subjects");
  const subjects: BackendSubject[] = response?.data?.subjects || response?.subjects || [];

  const subjectName = SUBJECTS[subjectKey]?.name;

  const match = subjects.find(
    (s) =>
      s.subjectCode === subjectKey ||
      (subjectName && s.subjectName?.toLowerCase() === subjectName.toLowerCase())
  );

  if (!match) {
    throw new Error("Subject not found in your enrolled subjects.");
  }

  return match;
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
