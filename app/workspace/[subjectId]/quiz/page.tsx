"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { hasAuthToken, resolveBackendSubjectContext } from "@/lib/services/backend-subject-map";
import { CheckCircle2, XCircle, Trophy, AlertTriangle } from "lucide-react";

type Question = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  topic: string;
  difficulty: string;
  type?: string;
};

type BackendQuestionResult = {
  id: number;
  questionText: string;
  questionType: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  points: number;
};

type BackendQuizResult = {
  score: number;
  totalQuestions: number;
  correctQuestions: number;
  percentageScore: number;
  passed: boolean;
  durationSeconds: number;
  questionResults: BackendQuestionResult[];
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
  const [backendResult, setBackendResult] = useState<BackendQuizResult | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [backendQuizId, setBackendQuizId] = useState<number | null>(null);
  const [backendMode, setBackendMode] = useState(false);
  const [startTime] = useState(Date.now());

  // user inputs
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState<string[]>(["MCQ"]);

  useEffect(() => {
    if (subject && subject.topics.length > 0) {
      setTopics([subject.topics[0]]);
    }
  }, [subjectId]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const fetchQuiz = async () => {
    setErr(null);
    setLoading(true);
    setResult(null);
    setFeedback(null);
    setBackendResult(null);
    setAlreadySubmitted(false);
    setQuestions([]);
    setBackendQuizId(null);
    setBackendMode(false);

    try {
      if (hasAuthToken()) {
        const { subjectId: backendSubjectId, topicIds } = await resolveBackendSubjectContext(
          subjectId,
          topics.length ? topics : subject.topics.slice(0, 1)
        );

        const response: any = await apiClient.post("/api/ai/quiz", {
          subjectId: backendSubjectId,
          topics: topicIds,
          count,
          difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          questionTypes: types,
        });

        const data = response?.data || response;
        const backendQuestions = data?.questions || [];

        setBackendMode(true);
        setBackendQuizId(data?.quizId || null);

        const mapped = backendQuestions.map((q: any) => ({
          id: String(q.id),
          question: q.questionText || "",
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => opt?.text ?? opt?.label ?? String(opt))
            : [],
          answer: "",
          topic: (topics[0] || subject.topics[0] || "General"),
          difficulty: (data?.quiz?.difficulty || difficulty).toString(),
          type: q.questionType || "MCQ",
        }));

        setQuestions(mapped);
      } else {
        const res = await fetch("/api/quiz", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subjectId, topics, count, difficulty, types }),
        });

        const text = await res.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`Server returned non-JSON (status ${res.status})`);
        }

        if (!res.ok) throw new Error(json.error || `Failed with ${res.status}`);
        setQuestions(json.questions || []);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setErr(null);

    if (backendMode && backendQuizId) {
      try {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        const answersPayload: Record<string, string> = {};
        questions.forEach((q) => {
          if (answers[q.id] !== undefined) {
            answersPayload[q.id] = answers[q.id];
          }
        });

        const response: any = await apiClient.post(`/api/quiz/${backendQuizId}/submit`, {
          answers: answersPayload,
          durationSeconds,
        });

        const data: BackendQuizResult = response?.data || response;
        setBackendResult(data);
        setResult(data.correctQuestions ?? data.score);

        const pct = data.percentageScore ?? 0;
        if (pct >= 90) setFeedback("Outstanding! You're mastering this material.");
        else if (pct >= 70) setFeedback("Good job! Strengthen your weak topics to hit perfection.");
        else if (pct >= 50) setFeedback("You're making progress. Review the questions you missed.");
        else setFeedback("Time to revisit fundamentals — try an easier difficulty next.");
      } catch (e: any) {
        if (e.status === 409) {
          setAlreadySubmitted(true);
        } else {
          setErr(e.message || "Failed to submit quiz.");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Local grading fallback
    let score = 0;
    for (const q of questions) {
      if (answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()) score++;
    }
    setResult(score);

    const percent = (score / questions.length) * 100;
    let feedbackText = "";
    if (percent >= 90) feedbackText = "Outstanding! You're mastering this material.";
    else if (percent >= 70) feedbackText = "Good job! Strengthen your weak topics to hit perfection.";
    else if (percent >= 50) feedbackText = "You're making progress. Review the questions you missed.";
    else feedbackText = "Time to revisit fundamentals — try an easier difficulty next.";

    const weakTopics = questions.filter((q) => answers[q.id] !== q.answer).map((q) => q.topic);
    if (weakTopics.length) feedbackText += ` Focus on: ${[...new Set(weakTopics)].join(", ")}.`;

    setFeedback(feedbackText);
    localStorage.setItem(
      `quiz-${subjectId}`,
      JSON.stringify({ score, total: questions.length, weakTopics, date: Date.now() })
    );
    setSubmitting(false);
  };

  if (!subject) return <div className="p-6">Unknown subject.</div>;

  // Already-submitted banner (409)
  if (alreadySubmitted) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">You've already completed this quiz</p>
              <p className="text-sm text-yellow-700 mt-1">View your previous results or generate a new quiz to continue practicing.</p>
              <Button className="mt-4" onClick={() => { setAlreadySubmitted(false); setQuestions([]); }}>
                Start a New Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Setup form (no questions yet)
  if (!questions.length) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-6 text-center">
        <h1 className="text-3xl font-bold">Quiz — {subject.name}</h1>

        <div className="space-y-2 text-left">
          <Label>Topics</Label>
          <div className="grid grid-cols-2 gap-2">
            {subject.topics.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(topics, setTopics, t)} />
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
  }

  // Backend results screen
  if (backendResult) {
    const pct = Math.round(backendResult.percentageScore ?? 0);
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Score badge */}
        <Card className={cn("border-2", backendResult.passed ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50")}>
          <CardContent className="p-6 flex items-center gap-4">
            <Trophy className={cn("w-10 h-10 flex-shrink-0", backendResult.passed ? "text-green-600" : "text-red-500")} />
            <div>
              <p className="text-3xl font-bold">{pct}%</p>
              <p className="text-sm text-muted-foreground">
                {backendResult.correctQuestions} / {backendResult.totalQuestions} correct
              </p>
              <Badge className={cn("mt-1", backendResult.passed ? "bg-green-600" : "bg-red-500")}>
                {backendResult.passed ? "Passed" : "Not passed"}
              </Badge>
            </div>
            {feedback && <p className="ml-auto text-sm text-muted-foreground max-w-xs text-right">{feedback}</p>}
          </CardContent>
        </Card>

        {/* Per-question results */}
        <div className="space-y-3">
          {backendResult.questionResults.map((r, i) => (
            <Card key={r.id} className={cn("border", r.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-start gap-2">
                  {r.isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <span>Q{i + 1}. {r.questionText}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Your answer: </span>
                  <span className={r.isCorrect ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                    {r.userAnswer || <em>No answer</em>}
                  </span>
                </p>
                {!r.isCorrect && (
                  <p>
                    <span className="text-muted-foreground">Correct answer: </span>
                    <span className="text-green-700 font-medium">{r.correctAnswer}</span>
                  </p>
                )}
                {r.explanation && (
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{r.explanation}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={() => { setQuestions([]); setBackendResult(null); setResult(null); setFeedback(null); }}>
          Try Another Quiz
        </Button>
      </div>
    );
  }

  // Local results (no backend)
  if (result !== null) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">
              {result} / {questions.length}
            </p>
            <p className="text-lg text-muted-foreground mt-1">
              {Math.round((result / questions.length) * 100)}%
            </p>
            {feedback && <p className="text-sm mt-3 text-muted-foreground">{feedback}</p>}
          </CardContent>
        </Card>
        <Button onClick={() => { setQuestions([]); setResult(null); setFeedback(null); }}>
          Try Another Quiz
        </Button>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Quiz — {subject.name}</h1>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardContent className="space-y-2 p-4">
            <div className="font-semibold">
              {idx + 1}. {q.question}
            </div>

            {q.type === "True/False" ? (
              <RadioGroup onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })} value={answers[q.id]}>
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
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            ) : (
              <RadioGroup onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })} value={answers[q.id]}>
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

      <Button onClick={submit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Quiz"}
      </Button>

      {err && <p className="text-red-600 text-sm">{err}</p>}
    </div>
  );
}
