"use client";

import { useEffect, useState } from "react";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import {
  fetchBackendTopics,
  hasAuthToken,
  resolveBackendSubject,
  type BackendTopic,
} from "@/lib/services/backend-subject-map";

/**
 * Topic names for a subject. Signed-in students get the backend's topics in syllabus order (the
 * same topics their mastery is tracked against); the demo account gets the offline list.
 */
export function useSubjectTopics(subjectKey: SubjectId) {
  const [state, setState] = useState<{
    names: string[];
    topics: BackendTopic[];
    backendSubjectId: number | null;
    loading: boolean;
    error: string | null;
    isBackend: boolean;
  }>({ names: [], topics: [], backendSubjectId: null, loading: true, error: null, isBackend: false });

  useEffect(() => {
    let cancelled = false;
    const offline = SUBJECTS[subjectKey]?.topics ?? [];

    if (!hasAuthToken()) {
      setState({ names: offline, topics: [], backendSubjectId: null, loading: false, error: null, isBackend: false });
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
