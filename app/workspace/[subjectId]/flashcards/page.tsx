"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  } catch (e: any) {
    setErr(e.message || "Something went wrong");
  } finally {
    setLoading(false);
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
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold">{c.front}</div>
                <div className="text-muted-foreground">{c.back}</div>
                <div className="text-xs mt-2">
                  Topic: {c.topic} • {c.difficulty}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
