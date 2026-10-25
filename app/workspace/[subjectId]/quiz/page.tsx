"use client";

import { useState, useEffect, useMemo } from "react";
import type React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SUBJECTS, normalizeSubjectId } from "@/lib/data/subjects";
import { useSubjectTopics } from "@/lib/services/subject-topics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { AiRating } from "@/components/feedback/ai-rating";
import { hasAuthToken, resolveBackendSubjectContext } from "@/lib/services/backend-subject-map";
import { SapphyFab } from "@/components/sapphy-fab"
import { ArrowLeft, Brain, CheckCircle2, XCircle, Trophy, AlertTriangle } from "lucide-react";

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


// SAMPLE: questions shown when there is no backend session and no Gemini key, so the quiz screens
// can still be tried. Real accounts always use the backend questions.
const SAMPLE_QUESTIONS: Question[] = [
  { id: "s1", question: "Solve 2x² − 8 = 0.", options: ["x = 4", "x = ±2", "x = ±4", "x = 2"], answer: "x = ±2", topic: "Algebra", difficulty: "medium", type: "MCQ" },
  { id: "s2", question: "The mean of 4, 7, 9 and x is 7. What is x?", options: ["6", "7", "8", "9"], answer: "8", topic: "Statistics", difficulty: "medium", type: "MCQ" },
  { id: "s3", question: "Factorise completely: 3x² − 12x.", options: ["3(x² − 4x)", "x(3x − 12)", "3x(x − 4)", "3x(x + 4)"], answer: "3x(x − 4)", topic: "Algebra", difficulty: "medium", type: "MCQ" },
  { id: "s4", question: "Which value is the median of 3, 8, 5, 12, 6?", options: ["5", "6", "8", "6.8"], answer: "6", topic: "Statistics", difficulty: "medium", type: "MCQ" },
]

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = String(params.subjectId || "csec-math");
  const subjectId = useMemo(() => normalizeSubjectId(rawId), [rawId]);
  const subject = SUBJECTS[subjectId];
  // Signed-in students pick from the backend's topics (the ones their mastery is tracked against).
  const subjectTopics = useSubjectTopics(subjectId);
  const topicNames = subjectTopics.names;

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
  const [aiEventId, setAiEventId] = useState<number | string | null>(null);
  const [backendMode, setBackendMode] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // user inputs
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState<string[]>(["MCQ"]);

  useEffect(() => {
    setTopics(topicNames.length > 0 ? [topicNames[0]] : []);
  }, [subjectId, topicNames.join("|")]);

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
    setAiEventId(null);
    setBackendMode(false);

    try {
      if (hasAuthToken()) {
        const { subjectId: backendSubjectId, topicIds } = await resolveBackendSubjectContext(
          subjectId,
          topics.length ? topics : topicNames.slice(0, 1)
        );

        if (!topicIds.length) {
          throw new Error("No topics are available for this subject yet. Please try again later or contact support.");
        }

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
        setAiEventId(data?.eventId ?? null);

        const mapped = backendQuestions.map((q: any) => ({
          id: String(q.id),
          question: q.questionText || "",
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => opt?.text ?? opt?.label ?? String(opt))
            : [],
          answer: "",
          topic: (topics[0] || topicNames[0] || "General"),
          difficulty: (data?.quiz?.difficulty || difficulty).toString(),
          type: q.questionType || "MCQ",
        }));

        setQuestions(mapped);
        setStartTime(Date.now()); // time the quiz itself, not the setup screen
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
      if (!hasAuthToken()) {
        // Demo account without an AI key: fall back to the sample questions
        setQuestions(SAMPLE_QUESTIONS);
        setErr(null);
      } else {
        setErr(e.message);
      }
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

  const chip = (on: boolean) =>
    cn(
      "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-sm",
      on && "border-primary bg-primary/5",
    );

  const header = (title: string, opts?: { tile?: boolean; right?: React.ReactNode; badge?: string }) => (
    <header className="hdr">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="min-h-11 shadow-none">
            <Link href={`/workspace/${subjectId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {subject.name}
            </Link>
          </Button>
          <span className="h-6 w-px bg-border" />
          {opts?.tile && (
            <span className="g-quiz inline-flex size-8 items-center justify-center rounded-lg text-white" aria-hidden="true">
              <Brain className="size-4" />
            </span>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
          {opts?.badge && <Badge variant="outline">{opts.badge}</Badge>}
        </div>
        {opts?.right}
      </div>
    </header>
  );

  // Already-submitted banner (409)
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <SapphyFab activity="quiz-setup" subjectId={subjectId} />
        {header("Quiz")}
        <div className="mx-auto max-w-xl p-6">
          <div className="flex items-start gap-3 rounded-xl border border-status-warning/40 bg-status-warning-subtle p-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-status-warning" aria-hidden="true" />
            <div>
              <p className="font-semibold">You've already completed this quiz</p>
              <p className="mt-1 text-sm text-muted-foreground">
                View your previous results or generate a new quiz to continue practicing.
              </p>
              <Button
                className="mt-4 rounded-xl"
                onClick={() => {
                  setAlreadySubmitted(false);
                  setQuestions([]);
                }}
              >
                Start a New Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Setup form (no questions yet)
  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background">
        <SapphyFab activity="quiz-setup" subjectId={subjectId} />
        {header("Quiz", { tile: true })}
        <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 pb-16 pt-10">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-bold leading-9">Build your quiz</h2>
            <p className="text-base text-muted-foreground">
              Choose topics and a difficulty. Sapphire writes fresh CSEC-style questions each time.
            </p>
          </div>

          <Card className="gap-6 rounded-2xl p-6">
            <fieldset className="space-y-2.5">
              <legend className="mb-2.5 text-sm font-medium">
                Topics <span className="font-normal text-muted-foreground">· {topics.length} selected</span>
              </legend>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {subjectTopics.loading && <p className="text-sm text-muted-foreground">Loading topics…</p>}
                {subjectTopics.error && <p className="text-sm text-destructive">{subjectTopics.error}</p>}
                {topicNames.map((t) => (
                  <label key={t} className={chip(topics.includes(t))}>
                    <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggle(topics, setTopics, t)} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2.5 text-sm font-medium">Question types</legend>
              <div className="flex flex-wrap gap-2">
                {["MCQ", "True/False", "Short Answer", "Fill in the Blank"].map((t) => (
                  <label key={t} className={chip(types.includes(t))}>
                    <Checkbox checked={types.includes(t)} onCheckedChange={() => toggle(types, setTypes, t)} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-6">
              <div className="min-w-[200px] flex-1 space-y-2">
                <span id="difficulty-label" className="text-sm font-medium">
                  Difficulty
                </span>
                <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="radiogroup" aria-labelledby="difficulty-label">
                  {["easy", "medium", "hard"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "min-h-11 flex-1 rounded-lg text-sm font-medium capitalize text-muted-foreground",
                        difficulty === d && "bg-card text-foreground shadow-xs",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-count">
                  Questions <span className="font-normal text-muted-foreground">(1–20)</span>
                </Label>
                <Input
                  id="question-count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="h-11 w-24 rounded-xl text-center"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <p className="text-xs text-muted-foreground">About {Math.max(1, Math.round(count))} minutes · Counts towards your streak</p>
              <Button onClick={fetchQuiz} disabled={loading} className="h-11 rounded-xl px-6 font-semibold">
                {loading ? "Generating..." : "Generate Quiz"}
              </Button>
            </div>
          </Card>

          {err && (
            <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Backend results screen
  if (backendResult) {
    const pct = Math.round(backendResult.percentageScore ?? 0);
    const secs = backendResult.durationSeconds || 0;
    const missed = backendResult.questionResults.filter((r) => !r.isCorrect);
    const short = (t: string) => (t.length > 70 ? `${t.slice(0, 67)}…` : t);
    return (
      <div className="min-h-screen bg-background">
        <SapphyFab
          activity="quiz-results"
          subjectId={subjectId}
          content={{
            score: `${pct}%`,
            verdict: backendResult.passed ? "Passed" : "Not passed yet",
            verdictTone: backendResult.passed ? "ok" : "warn",
            happy: backendResult.passed,
            summary: `{name}, you got ${backendResult.correctQuestions} of ${backendResult.totalQuestions} right${
              secs ? ` in ${Math.floor(secs / 60)}m ${secs % 60}s` : ""
            }.${missed.length ? " Let's fix the ones you missed." : " Every answer correct!"}`,
            good: backendResult.correctQuestions ? [`${backendResult.correctQuestions} correct ${backendResult.correctQuestions === 1 ? "answer" : "answers"}`] : [],
            work: missed.slice(0, 3).map((r) => short(r.questionText)),
          }}
        />
        {header("Quiz results")}
        <main className="mx-auto flex max-w-[760px] flex-col gap-4 px-6 pb-16 pt-8">
          {/* Score badge */}
          <section
            className={cn(
              "flex flex-wrap items-center gap-5 rounded-2xl border-2 p-6",
              backendResult.passed
                ? "border-status-success bg-status-success-subtle"
                : "border-destructive bg-status-danger-subtle",
            )}
          >
            <span
              className={cn(
                "inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-card",
                backendResult.passed ? "text-status-success" : "text-destructive",
              )}
            >
              <Trophy className="size-8" aria-hidden="true" />
            </span>
            <div className="min-w-[200px] flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-[40px] font-bold leading-[44px] tabular-nums">{pct}%</span>
                <Badge className={cn("text-white", backendResult.passed ? "bg-status-success" : "bg-destructive")}>
                  {backendResult.passed ? "Passed" : "Not passed"}
                </Badge>
              </div>
              <p className="tabular-nums text-muted-foreground">
                {backendResult.correctQuestions} of {backendResult.totalQuestions} correct
                {backendResult.durationSeconds ? ` · ${Math.floor(backendResult.durationSeconds / 60)}m ${backendResult.durationSeconds % 60}s` : ""}
              </p>
            </div>
            {feedback && <p className="min-w-[260px] flex-1 font-medium">{feedback}</p>}
          </section>

          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-xl px-6 font-semibold"
              onClick={() => {
                setQuestions([]);
                setBackendResult(null);
                setResult(null);
                setFeedback(null);
              }}
            >
              Try Another Quiz
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl px-6 shadow-none">
              <Link href={`/workspace/${subjectId}/flashcards`}>Drill with flashcards</Link>
            </Button>
          </div>

          <h2 className="mt-3 text-lg font-semibold">Review your answers</h2>
          {/* Per-question results */}
          {backendResult.questionResults.map((r, i) => (
            <article
              key={r.id}
              className={cn(
                "space-y-2 rounded-2xl border p-4",
                r.isCorrect ? "border-status-success/35 bg-card" : "border-destructive/35 bg-status-danger-subtle",
              )}
            >
              <p className="flex items-start gap-2.5 font-semibold">
                {r.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span>
                  Q{i + 1}. {r.questionText}
                </span>
              </p>
              <div className="space-y-1 pl-[26px] text-sm">
                <p>
                  <span className="text-muted-foreground">Your answer: </span>
                  <span className={cn("font-medium", r.isCorrect ? "text-status-success" : "text-destructive")}>
                    {r.userAnswer || <em>No answer</em>}
                  </span>
                </p>
                {!r.isCorrect && (
                  <p>
                    <span className="text-muted-foreground">Correct answer: </span>
                    <span className="font-medium text-status-success">{r.correctAnswer}</span>
                  </p>
                )}
                {r.explanation && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.explanation}</p>}
              </div>
            </article>
          ))}
        </main>
      </div>
    );
  }

  // Local results (no backend)
  if (result !== null) {
    return (
      <div className="min-h-screen bg-background">
        <SapphyFab activity="quiz-results" subjectId={subjectId} />
        {header("Quiz results")}
        <main className="mx-auto flex max-w-[760px] flex-col gap-4 px-6 pb-16 pt-8">
          <Card className="rounded-2xl">
            <div className="px-6 text-center">
              <p className="text-3xl font-bold tabular-nums">
                {result} / {questions.length}
              </p>
              <p className="mt-1 text-lg text-muted-foreground">{Math.round((result / questions.length) * 100)}%</p>
              {feedback && <p className="mt-3 text-sm text-muted-foreground">{feedback}</p>}
            </div>
          </Card>
          <div>
            <Button
              className="h-11 rounded-xl px-6 font-semibold"
              onClick={() => {
                setQuestions([]);
                setResult(null);
                setFeedback(null);
              }}
            >
              Try Another Quiz
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Active quiz
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  return (
    <div className="min-h-screen bg-background">
      <SapphyFab activity="quiz-active" subjectId={subjectId} />
      {header(`${subject.name} quiz`, {
        badge: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        right: (
          <div className="flex min-w-0 flex-[0_1_280px] items-center gap-3">
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {answered} of {questions.length} answered
            </span>
            <Progress value={(answered / questions.length) * 100} className="h-2 flex-1" />
          </div>
        ),
      })}
      <main className="mx-auto flex max-w-[760px] flex-col gap-4 px-6 pb-16 pt-8">
        {aiEventId != null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            How are these questions? <AiRating key={aiEventId} eventId={aiEventId} />
          </div>
        )}

        {questions.map((q, idx) => (
          <Card key={q.id} className="gap-3.5 rounded-2xl p-5">
            <div className="flex items-start gap-3 text-base font-semibold leading-6">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] tabular-nums">
                {idx + 1}
              </span>
              {q.question}
            </div>

            <div className="pl-10">
              {q.type === "True/False" ? (
                <RadioGroup
                  className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2"
                  onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                  value={answers[q.id]}
                >
                  {["True", "False"].map((opt) => (
                    <label key={opt} htmlFor={`${q.id}-${opt}`} className={chip(answers[q.id] === opt)}>
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      {opt}
                    </label>
                  ))}
                </RadioGroup>
              ) : q.type === "Short Answer" || q.type === "Fill in the Blank" ? (
                <Input
                  placeholder="Your answer..."
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="h-11 rounded-xl"
                />
              ) : (
                <RadioGroup
                  className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2"
                  onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                  value={answers[q.id]}
                >
                  {q.options.map((opt) => (
                    <label key={opt} htmlFor={`${q.id}-${opt}`} className={chip(answers[q.id] === opt)}>
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                      {opt}
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
          </Card>
        ))}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">You can change answers until you submit.</p>
          <Button onClick={submit} disabled={submitting} className="h-11 rounded-xl px-6 font-semibold">
            {submitting ? "Submitting…" : "Submit Quiz"}
          </Button>
        </div>

        {err && (
          <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </div>
        )}
      </main>
    </div>
  );
}
