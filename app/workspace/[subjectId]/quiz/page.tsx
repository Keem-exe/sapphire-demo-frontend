"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Question = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  topic: string;
  difficulty: string;
  type?: string;
};

const normalizeSubjectId = (id: string): SubjectId => {
  const map: Record<string, SubjectId> = {
    "csec-1": "csec-math",
    "csec-2": "csec-chem",
    "csec-3": "csec-eng",
    "cape-1": "cape-puremath",
    "cape-2": "cape-phys",
    "cape-3": "cape-bio",
  };
  return (map[id] || id) as SubjectId;
};

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = String(params.subjectId || "csec-math");
  const subjectId = useMemo(() => normalizeSubjectId(rawId), [rawId]);
  const subject = SUBJECTS[subjectId];

  // Canonicalize URL
  useEffect(() => {
    if (rawId && rawId !== subjectId) {
      router.replace(`/workspace/${subjectId}/quiz`);
    }
  }, [rawId, subjectId, router]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // user inputs
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState<string[]>(["MCQ"]);
  
  // Initialize topics when subject changes
  useEffect(() => {
    if (subject && subject.topics.length > 0) {
      setTopics([subject.topics[0]]);
    }
  }, [subjectId]);
  
  // toggle helpers
  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const fetchQuiz = async () => {
    setErr(null);
    setLoading(true);
    setResult(null);
    setFeedback(null);
    setQuestions([]);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topics,
          count,
          difficulty,
          types,
        }),
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (err) {
        console.error("Raw response:", text);
        throw new Error(`Server returned non-JSON (status ${res.status})`);
      }

      if (!res.ok) throw new Error(json.error || `Failed with ${res.status}`);

      setQuestions(json.questions || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    let score = 0;
    for (const q of questions) {
      if (answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()) score++;
    }
    setResult(score);

    // quick performance feedback (local)
    const percent = (score / questions.length) * 100;
    let feedbackText = "";
    if (percent >= 90) feedbackText = "Outstanding! You’re mastering this material.";
    else if (percent >= 70) feedbackText = "Good job! Strengthen your weak topics to hit perfection.";
    else if (percent >= 50) feedbackText = "You’re making progress. Review the questions you missed.";
    else feedbackText = "Time to revisit fundamentals — try an easier difficulty next.";

    // personalized advice
    const weakTopics = questions
      .filter((q) => answers[q.id] !== q.answer)
      .map((q) => q.topic);
    if (weakTopics.length)
      feedbackText += ` Focus on: ${[...new Set(weakTopics)].join(", ")}.`;

    setFeedback(feedbackText);

    // Save results for learning continuity
    localStorage.setItem(
      `quiz-${subjectId}`,
      JSON.stringify({ score, total: questions.length, weakTopics, date: Date.now() })
    );
  };

  // --- BEFORE GENERATION (Setup Form) ---
  if (!subject) return <div className="p-6">Unknown subject.</div>;
  
  if (!questions.length)
    return (
      <div className="p-6 max-w-xl mx-auto space-y-6 text-center">
        <h1 className="text-3xl font-bold">Quiz — {subject.name}</h1>

        <div className="space-y-2 text-left">
          <Label>Subject ID</Label>
          <Input value={subjectId} readOnly />
        </div>

        <div className="space-y-2 text-left">
          <Label>Topics</Label>
          <div className="grid grid-cols-2 gap-2">
            {subject.topics.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <Checkbox
                  checked={topics.includes(t)}
                  onCheckedChange={() => toggle(topics, setTopics, t)}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-left">
          <Label>Question Types</Label>
          <div className="grid grid-cols-2 gap-2">
            {["MCQ", "True/False", "Short Answer", "Fill in the Blank"].map((t) => (
              <label key={t} className="flex items-center gap-2">
                <Checkbox checked={types.includes(t)} onCheckedChange={() => toggle(types, setTypes, t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Label>Number of Questions</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <div className="space-y-2 text-left">
          <Label>Difficulty</Label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border rounded p-2 w-full"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <Button onClick={fetchQuiz} disabled={loading}>
          {loading ? "Generating..." : "Generate Quiz"}
        </Button>

        {err && <p className="text-red-600 mt-3">{err}</p>}
      </div>
    );

  // --- AFTER GENERATION (Show Quiz) ---
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Quiz — {subjectId}</h1>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardContent className="space-y-2 p-4">
            <div className="font-semibold">
              {idx + 1}. {q.question}
            </div>

            {q.type === "True/False" ? (
              <RadioGroup
                onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                value={answers[q.id]}
              >
                {["True", "False"].map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : q.type === "Short Answer" || q.type === "Fill in the Blank" ? (
              <Input
                placeholder="Your answer..."
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
              />
            ) : (
              <RadioGroup
                onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                value={answers[q.id]}
              >
                {q.options.map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={submit}>Submit</Button>

      {result !== null && (
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">
            Score: {result} / {questions.length} ({Math.round(
              (result / questions.length) * 100
            )}
            %)
          </p>
          <p className="text-lg text-gray-700">{feedback}</p>
        </div>
      )}
    </div>
  );
}
