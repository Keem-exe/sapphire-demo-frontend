"use client";

import { useEffect, useState } from "react";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import {
  fetchBackendTopics,
  hasAuthToken,
  resolveBackendSubject,
  type BackendTopic,
} from "@/lib/services/backend-subject-map";

export type TopicOption = { key: string; label: string };
export type TopicGroup = { moduleNumber: number | null; title: string | null; topics: TopicOption[] };

/**
 * Groups backend topics by module in syllabus order. Topics without a moduleNumber
 * (legacy subjects) come back as a single untitled group, i.e. a flat list.
 */
export function groupTopics(topics: BackendTopic[]): TopicGroup[] {
  const sorted = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups: TopicGroup[] = [];
  for (const t of sorted) {
    const moduleNumber = t.moduleNumber ?? null;
    let group = groups.find((g) => g.moduleNumber === moduleNumber);
    if (!group) {
      group = {
        moduleNumber,
        title: moduleNumber == null ? null : `Module ${moduleNumber}${t.moduleTitle ? `: ${t.moduleTitle}` : ""}`,
        topics: [],
      };
      groups.push(group);
    }
    group.topics.push({ key: String(t.id), label: t.name });
  }
  return groups.sort((a, b) => (a.moduleNumber ?? 0) - (b.moduleNumber ?? 0));
}

/**
 * Topics for a subject. Signed-in students get the backend's topics in syllabus order (the same
 * topics their mastery is tracked against), as names and grouped by module (keyed by id, since names
 * can repeat across modules); the demo account gets the offline list (keyed by name).
 */
export function useSubjectTopics(subjectKey: SubjectId) {
  const [state, setState] = useState<{
    names: string[];
    groups: TopicGroup[];
    topics: BackendTopic[];
    backendSubjectId: number | null;
    loading: boolean;
    error: string | null;
    isBackend: boolean;
  }>({ names: [], groups: [], topics: [], backendSubjectId: null, loading: true, error: null, isBackend: false });

  useEffect(() => {
    let cancelled = false;
    const offline = SUBJECTS[subjectKey]?.topics ?? [];

    if (!hasAuthToken()) {
      setState({
        names: offline,
        groups: [{ moduleNumber: null, title: null, topics: offline.map((t) => ({ key: t, label: t })) }],
        topics: [],
        backendSubjectId: null,
        loading: false,
        error: null,
        isBackend: false,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    resolveBackendSubject(subjectKey)
      .then(async (bs) => {
        const topics = await fetchBackendTopics(bs.subjectId);
        if (cancelled) return;
        const ordered = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setState({
          names: ordered.map((t) => t.name),
          groups: groupTopics(ordered),
          topics: ordered,
          backendSubjectId: bs.subjectId,
          loading: false,
          error: null,
          isBackend: true,
        });
      })
      .catch((e: any) => {
        if (cancelled) return;
        setState({
          names: [],
          groups: [],
          topics: [],
          backendSubjectId: null,
          loading: false,
          error: e?.message || "Couldn't load the topics for this subject.",
          isBackend: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [subjectKey]);

  return state;
}
