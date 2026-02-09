"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { learningIntelligenceService } from "@/lib/services/learning-intelligence-service";
import { useToast } from "@/hooks/use-toast";

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

  if (!subject) return <div className="p-6">Unknown subject.</div>;

  const toggle = (t: string) =>
    setTopics((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const onGenerate = async () => {
  try {
    setErr(null);
    setLoading(true);
    setCards([]);

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
    try { json = JSON.parse(text); }
    catch { throw new Error(`Server returned invalid JSON (status ${res.status})`); }

    if (!res.ok) throw new Error(json.error || `Failed with ${res.status}`);

    setCards(Array.isArray(json.flashcards) ? json.flashcards : []);
    if (!json.flashcards?.length) setErr("No flashcards returned. Try different topics or increase count.");
    
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
  if (mastered) {
    setMasteredCards(prev => new Set(prev).add(cardId));
  }
};

const handleEndSession = async () => {
  if (!user || !sessionStartTime || reviewedCards.size === 0) return;
  
  try {
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const masteryRate = masteredCards.size / reviewedCards.size;
    
    // Record flashcard session
    await learningIntelligenceService.recordInteraction({
      userId: user.user_id,
      subjectId: parseInt(canonicalId.split('-')[1]) || 1,
      topicId: null,
      interactionType: 'flashcard',
      referenceId: null,
      durationSeconds,
      accuracy: masteryRate,
      difficulty: 'medium',
      metadata: {
        cardsStudied: reviewedCards.size,
        cardsMastered: masteredCards.size,
        topics: topics.length > 0 ? topics : subject.topics.slice(0, 3),
        totalCards: cards.length
      }
    });
    
    toast({
      title: "Session Recorded",
      description: `Reviewed ${reviewedCards.size} cards, mastered ${masteredCards.size}!`,
    });
    
    // Reset session
    setCards([]);
    setSessionStartTime(null);
    setMasteredCards(new Set());
    setReviewedCards(new Set());
  } catch (error) {
    console.error('Failed to record flashcard session:', error);
    toast({
      title: "Note",
      description: "Session not saved to your profile. Please check your connection.",
      variant: "destructive"
    });
  }
};


  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Flashcards — {subject.name}</h1>

      <div className="space-y-3">
        <Label className="font-medium">Select topics</Label>
        <div className="grid grid-cols-2 gap-4 text-lg">
          {subject.topics.map((t) => (
            <label key={t} className="flex items-center gap-3">
              <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(t)} />
              <span>{t}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Label htmlFor="count">Count</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value || "20", 10))}
            className="w-28"
          />
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      {!!cards.length && (
        <>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-semibold">Session Progress:</span> {reviewedCards.size}/{cards.length} reviewed • {masteredCards.size} mastered
            </div>
            <Button onClick={handleEndSession} variant="default" disabled={reviewedCards.size === 0}>
              End Session & Save
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c) => {
              const isReviewed = reviewedCards.has(c.id);
              const isMastered = masteredCards.has(c.id);
              
              return (
                <Card key={c.id} className={isReviewed ? (isMastered ? "border-green-500" : "border-yellow-500") : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-semibold">{c.front}</div>
                    <div className="text-muted-foreground">{c.back}</div>
                    <div className="text-xs mt-2">
                      Topic: {c.topic} • {c.difficulty}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant={isMastered ? "default" : "outline"}
                        onClick={() => handleCardReview(c.id, true)}
                        disabled={isReviewed}
                      >
                        ✓ Mastered
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isReviewed && !isMastered ? "secondary" : "outline"}
                        onClick={() => handleCardReview(c.id, false)}
                        disabled={isReviewed}
                      >
                        ↻ Review Later
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
