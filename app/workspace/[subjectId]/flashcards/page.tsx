"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import { AiRating } from "@/components/feedback/ai-rating";
import { hasAuthToken, resolveBackendSubjectContext } from "@/lib/services/backend-subject-map";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Layers, Trophy } from "lucide-react";

// Map legacy/alias route IDs to canonical SUBJECTS keys
const normalizeSubjectId = (id: string): SubjectId => {
  const map: Record<string, SubjectId> = {
    "csec-1": "csec-math",
    "csec-2": "csec-chem",
    "csec-3": "csec-eng",
    "cape-1": "cape-puremath",
    "cape-2": "cape-phys",
    "cape-3": "cape-bio",
  } as const;
  return (map[id] || id) as SubjectId;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  topic: string;
  subjectId: string;
  difficulty: "easy" | "medium" | "hard";
};

export default function FlashcardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const rawId = String(params.subjectId || "");
  const canonicalId = useMemo(() => normalizeSubjectId(rawId), [rawId]);

  // Canonicalize URL once (so bookmarks use the right ID)
  useEffect(() => {
    if (rawId && rawId !== canonicalId) {
      router.replace(`/workspace/${canonicalId}/flashcards`);
    }
  }, [rawId, canonicalId, router]);

  const subject = SUBJECTS[canonicalId];
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState<number>(20);
  const [learningStyle] = useState<string>("mixed"); // replace if you store user profile elsewhere
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [reviewedCards, setReviewedCards] = useState<Set<string>>(new Set());
  const [backendSetId, setBackendSetId] = useState<number | null>(null);
  const [aiEventId, setAiEventId] = useState<number | string | null>(null);
  const [practiceResult, setPracticeResult] = useState<{
    cardsReviewed: number;
    cardsMastered: number;
    accuracy: number;
    percentageScore: number;
    passed: boolean;
    durationSeconds: number;
  } | null>(null);

  if (!subject) return <div className="p-6">Unknown subject.</div>;

  const header = (
    <header className="hdr">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-6">
        <Button asChild variant="ghost" size="sm" className="min-h-11 shadow-none">
          <Link href={`/workspace/${canonicalId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {subject.name}
          </Link>
        </Button>
        <span className="h-6 w-px bg-border" />
        <span className="g-flash inline-flex size-8 items-center justify-center rounded-lg text-white" aria-hidden="true">
          <Layers className="size-4" />
        </span>
        <h1 className="text-lg font-semibold">Flashcards</h1>
      </div>
    </header>
  );

  // Post-practice summary screen
  if (practiceResult) {
    const pct = Math.round(practiceResult.percentageScore ?? (practiceResult.accuracy * 100));
    return (
      <div className="min-h-screen bg-background">
        {header}
        <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 pb-16 pt-8">
          <section
            className={cn(
              "flex flex-wrap items-center gap-5 rounded-2xl border-2 p-5",
              practiceResult.passed
                ? "border-status-success bg-status-success-subtle"
                : "border-status-warning bg-status-warning-subtle",
            )}
          >
            <Trophy
              className={cn("size-10 shrink-0", practiceResult.passed ? "text-status-success" : "text-status-warning")}
              aria-hidden="true"
            />
            <div className="min-w-[200px] flex-1">
              <p className="text-3xl font-bold leading-9 tabular-nums">{pct}%</p>
              <p className="tabular-nums text-muted-foreground">
                {practiceResult.cardsMastered} / {practiceResult.cardsReviewed} cards mastered
              </p>
            </div>
            <Badge className={cn("text-white", practiceResult.passed ? "bg-status-success" : "bg-status-warning")}>
              {practiceResult.passed ? "Session complete!" : "Keep practising"}
            </Badge>
          </section>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Cards reviewed: <span className="font-semibold text-foreground">{practiceResult.cardsReviewed}</span>
            </p>
            <p>
              Cards mastered: <span className="font-semibold text-foreground">{practiceResult.cardsMastered}</span>
            </p>
            <p>
              Duration:{" "}
              <span className="font-semibold text-foreground">
                {Math.round(practiceResult.durationSeconds / 60)}m {practiceResult.durationSeconds % 60}s
              </span>
            </p>
          </div>
          <div>
            <Button
              className="h-11 rounded-xl px-6 font-semibold"
              onClick={() => {
                setPracticeResult(null);
                setCards([]);
              }}
            >
              Start a New Session
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const toggle = (t: string) =>
    setTopics((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const onGenerate = async () => {
    try {
      setErr(null);
      setLoading(true);
      setCards([]);
      setBackendSetId(null);
      setAiEventId(null);
      setPracticeResult(null);

      if (hasAuthToken()) {
        const selectedTopics = topics.length ? topics : subject.topics.slice(0, 3);
        const { subjectId: backendSubjectId, topicIds } = await resolveBackendSubjectContext(
          canonicalId,
          selectedTopics
        );

        if (!topicIds.length) {
          throw new Error("No topics are available for this subject yet. Please try again later or contact support.");
        }

        const response: any = await apiClient.post("/api/ai/flashcards", {
          subjectId: backendSubjectId,
          topics: topicIds,
          count,
        });

        const data = response?.data || response;
        const backendCards = data?.flashcards || [];
        const mapped = backendCards.map((c: any) => ({
          id: String(c.id),
          front: c.front || "",
          back: c.back || "",
          topic: selectedTopics[0] || "General",
          subjectId: String(backendSubjectId),
          difficulty: "medium",
        }));

        setBackendSetId(data?.setId || null);
        setAiEventId(data?.eventId ?? null);
        setCards(mapped);
      } else {
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            subjectId: canonicalId,
            topics: topics.length ? topics : subject.topics.slice(0, 3),
            count,
            learningStyle,
          }),
        });

        const text = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`Server returned invalid JSON (status ${res.status})`);
        }

        if (!res.ok) throw new Error(json.error || `Failed with ${res.status}`);

        setCards(Array.isArray(json.flashcards) ? json.flashcards : []);
        if (!json.flashcards?.length) setErr("No flashcards returned. Try different topics or increase count.");
      }

      // Start tracking flashcard session
      setSessionStartTime(Date.now());
      setMasteredCards(new Set());
      setReviewedCards(new Set());
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

const handleCardReview = (cardId: string, mastered: boolean) => {
  setReviewedCards(prev => new Set(prev).add(cardId));
  // Client-side guard: only mark mastered cards that have been reviewed
  if (mastered && reviewedCards.has(cardId) || mastered) {
    setMasteredCards(prev => {
      const next = new Set(prev);
      next.add(cardId);
      // Enforce: masteredCards cannot exceed reviewedCards
      const reviewed = new Set(reviewedCards);
      reviewed.add(cardId);
      if (next.size > reviewed.size) next.delete(cardId);
      return next;
    });
  }
};

const handleEndSession = async () => {
  if (!sessionStartTime || reviewedCards.size === 0) return;

  const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
  const cardsReviewed = reviewedCards.size;
  // Enforce: cardsMastered cannot exceed cardsReviewed
  const cardsMastered = Math.min(masteredCards.size, cardsReviewed);

  try {
    if (hasAuthToken() && backendSetId) {
      const response: any = await apiClient.post(`/api/flashcards/${backendSetId}/practice`, {
        cardsReviewed,
        cardsMastered,
        durationSeconds,
        topicId: null,
      });

      const summary = response?.data || response;
      setPracticeResult({
        cardsReviewed: summary.cardsReviewed ?? cardsReviewed,
        cardsMastered: summary.cardsMastered ?? cardsMastered,
        accuracy: summary.accuracy ?? (cardsReviewed > 0 ? cardsMastered / cardsReviewed : 0),
        percentageScore: summary.percentageScore ?? (cardsReviewed > 0 ? (cardsMastered / cardsReviewed) * 100 : 0),
        passed: summary.passed ?? cardsMastered >= cardsReviewed * 0.7,
        durationSeconds: summary.durationSeconds ?? durationSeconds,
      });
    } else {
      // No backend — show local summary
      setPracticeResult({
        cardsReviewed,
        cardsMastered,
        accuracy: cardsReviewed > 0 ? cardsMastered / cardsReviewed : 0,
        percentageScore: cardsReviewed > 0 ? (cardsMastered / cardsReviewed) * 100 : 0,
        passed: cardsMastered >= cardsReviewed * 0.7,
        durationSeconds,
      });
    }

    setSessionStartTime(null);
    setMasteredCards(new Set());
    setReviewedCards(new Set());
  } catch (error) {
    console.error('Failed to record flashcard session:', error);
    // Still show a local summary on error
    setPracticeResult({
      cardsReviewed,
      cardsMastered,
      accuracy: cardsReviewed > 0 ? cardsMastered / cardsReviewed : 0,
      percentageScore: cardsReviewed > 0 ? (cardsMastered / cardsReviewed) * 100 : 0,
      passed: cardsMastered >= cardsReviewed * 0.7,
      durationSeconds,
    });
    toast({
      title: "Note",
      description: "Session results shown but not saved to your profile. Please check your connection.",
      variant: "destructive"
    });
  }
};


  return (
    <div className="min-h-screen bg-background">
      {header}
      <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 pb-16 pt-8">
        <Card className="gap-[18px] rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">New set</h2>
            <span className="text-xs text-muted-foreground">Pick topics, then generate</span>
          </div>

          <fieldset>
            <legend className="sr-only">Select topics</legend>
            <div className="flex flex-wrap gap-2">
              {subject.topics.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-sm",
                    topics.includes(t) && "border-primary bg-primary/5",
                  )}
                >
                  <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(t)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="count">Cards</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "20", 10))}
              className="h-11 w-24 rounded-xl text-center"
            />
            <Button onClick={onGenerate} disabled={loading} className="h-11 rounded-xl px-6 font-semibold">
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>

          {err && (
            <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </div>
          )}
        </Card>

        {!!cards.length && (
          <>
            {aiEventId != null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                How are these flashcards? <AiRating key={aiEventId} eventId={aiEventId} />
              </div>
            )}
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/60 p-4">
              <div className="min-w-[260px] flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Session progress</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {reviewedCards.size} of {cards.length} reviewed · {masteredCards.size} mastered
                  </span>
                </div>
                <Progress value={(reviewedCards.size / cards.length) * 100} className="h-2" />
              </div>
              <Button
                onClick={handleEndSession}
                variant="outline"
                disabled={reviewedCards.size === 0}
                className="min-h-11 rounded-xl shadow-none"
              >
                End Session & Save
              </Button>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map((c) => {
                const isReviewed = reviewedCards.has(c.id);
                const isMastered = masteredCards.has(c.id);

                return (
                  <Card
                    key={c.id}
                    className={cn(
                      "gap-0 rounded-2xl p-5",
                      isReviewed && (isMastered ? "border-status-success border-2" : "border-status-warning border-2"),
                    )}
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question</p>
                      <p className="text-lg font-semibold leading-7">{c.front}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-status-success">Answer</p>
                      <p className="text-muted-foreground">{c.back}</p>
                      <p className="pt-1 text-xs text-muted-foreground">
                        {c.topic} · {c.difficulty}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant={isMastered ? "default" : "outline"}
                        onClick={() => handleCardReview(c.id, true)}
                        disabled={isReviewed}
                        className="min-h-11 flex-1 rounded-xl shadow-none"
                      >
                        ✓ Mastered
                      </Button>
                      <Button
                        size="sm"
                        variant={isReviewed && !isMastered ? "secondary" : "outline"}
                        onClick={() => handleCardReview(c.id, false)}
                        disabled={isReviewed}
                        className="min-h-11 flex-1 rounded-xl shadow-none"
                      >
                        ↻ Review Later
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
