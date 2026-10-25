"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasAuthToken } from "@/lib/services/backend-subject-map";
import { meService, type DiagnosticStatus, type Overview, type ProfileStats, type SubjectOverview } from "@/lib/services/me-service";

type Loadable<T> = { data: T | null; loading: boolean; error: string | null; refresh: () => void };

/**
 * Load `fetcher` for a signed-in student and reload it when they come back to the tab, so a task
 * finished on another screen shows up as done. Returns data=null without a backend session (demo).
 */
function useLoad<T>(fetcher: (() => Promise<T>) | null, deps: unknown[]): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!fetcher);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const seq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const run = fetcherRef.current;
    if (!run || !hasAuthToken()) {
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const value = await run();
      if (id === seq.current) {
        setData(value);
        setError(null);
      }
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || "Couldn't load your data.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { data, loading, error, refresh: () => load(true) };
}

/** Dashboard data: streak, Sapphy's daily tasks, subjects with real progress, next exam. */
export function useOverview(enabled = true) {
  return useLoad<Overview>(enabled ? () => meService.overview() : null, [enabled]);
}

/** One subject's real stats for the workspace overview. */
export function useSubjectOverview(backendSubjectId: number | null) {
  return useLoad<SubjectOverview>(
    backendSubjectId ? () => meService.subjectOverview(backendSubjectId) : null,
    [backendSubjectId],
  );
}

/** The subject's diagnostic: taken or not, in progress, when a retake opens. */
export function useDiagnosticStatus(backendSubjectId: number | null) {
  return useLoad<DiagnosticStatus>(
    backendSubjectId ? () => meService.diagnosticStatus(backendSubjectId) : null,
    [backendSubjectId],
  );
}

/** Profile page numbers. */
export function useProfileStats(enabled = true) {
  return useLoad<ProfileStats>(enabled ? () => meService.stats() : null, [enabled]);
}
