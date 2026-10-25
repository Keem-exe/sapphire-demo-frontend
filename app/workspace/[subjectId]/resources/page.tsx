"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen, Download, FileText, FolderOpen, Play, Search, Bookmark, PenLine, Trash2 } from "lucide-react"
import { SUBJECTS, normalizeSubjectId } from "@/lib/data/subjects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SapphyFab } from "@/components/sapphy-fab"
import { cn } from "@/lib/utils"
import { hasAuthToken, resolveBackendSubject } from "@/lib/services/backend-subject-map"
import { meService, type PastPaper, type SavedResource } from "@/lib/services/me-service"

// The list of exam sittings below is a reading list, not data: no paper files are connected yet.
// Each student's attempts, scores, saved files and exam date are stored on their account.
type Paper = { name: string; desc: string }
type Sitting = { name: string; papers: Paper[] }

const PAPERS: Paper[] = [
  { name: "Paper 1", desc: "Multiple choice · with answer key" },
  { name: "Paper 2", desc: "Structured questions · with mark scheme" },
]
const SITTINGS: Sitting[] = ["May–June 2024", "January 2024", "May–June 2023"].map((name) => ({ name, papers: PAPERS }))
const OLDER_SITTINGS: Sitting[] = ["January 2023", "May–June 2022"].map((name) => ({ name, papers: PAPERS }))
const LISTED_PAPERS = [...SITTINGS, ...OLDER_SITTINGS].length * PAPERS.length

// SAMPLE (demo account only): scores and saved files from the design.
const DEMO_SCORES: Record<string, number> = {
  "May–June 2024 · Paper 1": 74,
  "January 2024 · Paper 1": 66,
  "May–June 2023 · Paper 1": 64,
}
const DEMO_SAVED = ["May–June 2024 · Paper 1", "January 2024 · Paper 1", "May–June 2023 · Paper 1", "May–June 2024 · Paper 2"]
const DEMO_GUIDES = [
  { kind: "Revision guide", name: "Algebra: quadratics and factorising", meta: "PDF · 12 pages" },
  { kind: "Formula sheet", name: "Formulas and tables you need to know", meta: "PDF · 2 pages" },
  { kind: "Your notes", name: "Quadratic equations", meta: "From your notebook · edited today" },
  { kind: "Saved reels", name: "4 saved study reels", meta: "Algebra, Statistics" },
]
const CATEGORIES = ["All", "Past papers", "Mark schemes", "Syllabus", "Revision guides", "From my teacher", "Saved"] as const

function yearOf(sitting: string) {
  const m = sitting.match(/(19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

export default function ResourcesPage() {
  const params = useParams()
  const subjectId = normalizeSubjectId(String(params.subjectId || ""))
  const subject = SUBJECTS[subjectId]
  const level = subject?.level === "cape" ? "CAPE" : "CSEC"

  const [live, setLive] = useState(false)
  const [backendSubjectId, setBackendSubjectId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<PastPaper[]>([])
  const [average, setAverage] = useState<number | null>(null)
  const [saved, setSaved] = useState<Map<string, number | null>>(new Map())
  const [savedReels, setSavedReels] = useState(0)
  const [noteCount, setNoteCount] = useState(0)

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All")
  const [paperFilter, setPaperFilter] = useState<"All papers" | "Paper 1" | "Paper 2">("All papers")
  const [showOlder, setShowOlder] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  const [examOpen, setExamOpen] = useState(false)
  const [examDate, setExamDate] = useState("")
  const [draftDate, setDraftDate] = useState("")
  const [recording, setRecording] = useState<string | null>(null) // "sitting · paper" being scored
  const [draftScore, setDraftScore] = useState("")
  const [draftMax, setDraftMax] = useState("100")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const keyFor = (title: string) => `${subjectId}:${title}`.replace(/[^A-Za-z0-9_.:/-]+/g, "-").slice(0, 120)

  const load = useCallback(async () => {
    if (!subject) return
    try {
      setNoteCount(JSON.parse(localStorage.getItem(`sapphire_notes_${subjectId}`) || "[]").length)
    } catch {}
    if (!hasAuthToken()) {
      setLive(false)
      setSaved(new Map(DEMO_SAVED.map((k) => [k, null])))
      try {
        setExamDate(localStorage.getItem(`sapphire_exam_date_${subjectId}`) || "")
      } catch {}
      return
    }
    setLive(true)
    try {
      const bs = await resolveBackendSubject(subjectId)
      setBackendSubjectId(bs.subjectId)
      setExamDate(bs.examDate || "")
      const [papers, savedList, overview] = await Promise.all([
        meService.pastPapers(bs.subjectId),
        meService.savedResources(bs.subjectId),
        meService.subjectOverview(bs.subjectId).catch(() => null),
      ])
      setAttempts(papers.papers)
      setAverage(papers.average)
      setSaved(new Map(savedList.filter((r: SavedResource) => r.kind === "paper").map((r) => [r.title, r.id])))
      setSavedReels(overview?.tools.savedReels ?? 0)
      if (overview) setExamDate(overview.examDate || "")
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e?.message || "Couldn't load your resources.")
    }
  }, [subject, subjectId])

  useEffect(() => {
    load()
  }, [load])

  // Latest attempt per paper title
  const latest = useMemo(() => {
    const m = new Map<string, PastPaper>()
    for (const a of attempts) if (!m.has(a.title)) m.set(a.title, a) // newest first from the backend
    return m
  }, [attempts])
  const scoreFor = (title: string): number | undefined =>
    live ? (latest.has(title) ? Math.round(latest.get(title)!.percentage) : undefined) : DEMO_SCORES[title]

  const sittings = useMemo(() => {
    const all = showOlder ? [...SITTINGS, ...OLDER_SITTINGS] : SITTINGS
    const q = query.trim().toLowerCase()
    return all
      .map((s) => ({
        ...s,
        papers: s.papers.filter(
          (p) =>
            (paperFilter === "All papers" || p.name === paperFilter) &&
            (!q || `${s.name} ${p.name} ${p.desc}`.toLowerCase().includes(q)) &&
            (category !== "Saved" || saved.has(`${s.name} · ${p.name}`)),
        ),
      }))
      .filter((s) => s.papers.length > 0)
  }, [query, paperFilter, showOlder, category, saved])

  if (!subject) return <div className="p-6">Unknown subject.</div>

  const showPapers = category === "All" || category === "Past papers" || category === "Mark schemes" || category === "Saved"
  const showGuides = category === "All" || category === "Revision guides" || category === "Saved"

  const attemptedCount = live ? latest.size : Object.keys(DEMO_SCORES).length
  const avg = live ? average : Math.round(Object.values(DEMO_SCORES).reduce((a, b) => a + b, 0) / Object.keys(DEMO_SCORES).length)
  const lowest = live
    ? [...latest.values()].sort((a, b) => a.percentage - b.percentage)[0] ?? null
    : null

  const toggleSaved = async (title: string) => {
    if (!live || !backendSubjectId) {
      setSaved((prev) => {
        const next = new Map(prev)
        if (next.has(title)) next.delete(title)
        else next.set(title, null)
        return next
      })
      return
    }
    const id = saved.get(title)
    try {
      if (saved.has(title) && id) {
        await meService.unsaveResource(id)
        setSaved((prev) => {
          const next = new Map(prev)
          next.delete(title)
          return next
        })
      } else {
        const r = await meService.saveResource({ subjectId: backendSubjectId, key: keyFor(title), title, kind: "paper" })
        setSaved((prev) => new Map(prev).set(title, r.id))
      }
    } catch (e: any) {
      setLoadError(e?.message || "Couldn't update your saved files.")
    }
  }

  const saveExamDate = async () => {
    setFormError(null)
    if (live && backendSubjectId) {
      setSaving(true)
      try {
        await meService.setExamDate(backendSubjectId, draftDate || null)
        setExamDate(draftDate)
        setExamOpen(false)
      } catch (e: any) {
        setFormError(e?.message || "Couldn't save your exam date.")
      } finally {
        setSaving(false)
      }
      return
    }
    setExamDate(draftDate)
    try {
      if (draftDate) localStorage.setItem(`sapphire_exam_date_${subjectId}`, draftDate)
      else localStorage.removeItem(`sapphire_exam_date_${subjectId}`)
    } catch {}
    setExamOpen(false)
  }

  const openRecord = (title: string) => {
    setRecording(title)
    setDraftScore("")
    setDraftMax(title.endsWith("Paper 1") ? "60" : "100")
    setFormError(null)
  }

  const saveScore = async () => {
    if (!recording || !backendSubjectId) return
    const score = Number(draftScore)
    const max = Number(draftMax)
    if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || score < 0 || score > max) {
      setFormError("Enter a score between 0 and the total marks.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const sitting = recording.split(" · ")[0]
      await meService.addPastPaper({
        subjectId: backendSubjectId,
        title: recording,
        year: yearOf(sitting),
        paperNo: recording.split(" · ")[1] ?? null,
        score,
        maxScore: max,
      })
      setRecording(null)
      await load()
    } catch (e: any) {
      setFormError(e?.message || "Couldn't save your score.")
    } finally {
      setSaving(false)
    }
  }

  const removeAttempt = async (attempt: PastPaper) => {
    try {
      await meService.deletePastPaper(attempt.id)
      await load()
    } catch (e: any) {
      setLoadError(e?.message || "Couldn't remove that score.")
    }
  }

  const guides = live
    ? [
        { kind: "Your notes", name: `${noteCount} ${noteCount === 1 ? "note" : "notes"} for ${subject.name}`, meta: "From your notebook", href: `/workspace/${subjectId}` },
        { kind: "Saved reels", name: `${savedReels} saved study ${savedReels === 1 ? "reel" : "reels"}`, meta: "Watch them again any time", href: `/workspace/${subjectId}/reels` },
      ]
    : DEMO_GUIDES.map((g) => ({ ...g, href: "" }))

  return (
    <div className="min-h-screen bg-background">
      <SapphyFab
        activity="resources"
        subjectId={subjectId}
        startOpen={false}
        content={
          live
            ? {
                summary: attemptedCount
                  ? `You've recorded ${attemptedCount} ${attemptedCount === 1 ? "paper" : "papers"}${avg != null ? `, averaging ${Math.round(avg)}%` : ""}.${
                      lowest ? ` Your lowest was ${lowest.title} (${Math.round(lowest.percentage)}%). Try it again.` : ""
                    }`
                  : "After you do a past paper, record your score here and I'll track your progress.",
              }
            : undefined
        }
      />
      <header className="hdr">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="min-h-11 shadow-none">
              <Link href={`/workspace/${subjectId}`}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                {subject.name}
              </Link>
            </Button>
            <span className="h-6 w-px bg-border" />
            <span className="g-res inline-flex size-8 items-center justify-center rounded-lg text-white" aria-hidden="true">
              <BookOpen className="size-4" />
            </span>
            <h1 className="text-lg font-semibold">Resources</h1>
          </div>
          <Badge variant="outline">
            {level} {subject.name}
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-7 px-6 pb-16 pt-7">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <div className="space-y-1.5">
            <h2 className="text-[30px] font-bold leading-9">Past papers and materials</h2>
            <p className="text-base leading-6 text-muted-foreground">
              Track your past paper practice for {subject.name}: record each score and Sapphy keeps your average.
            </p>
          </div>
          {loadError && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-status-danger-subtle px-4 py-2 text-sm text-destructive">
              {loadError}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search resources"
                placeholder="Search papers, e.g. “2023 paper 2”"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 rounded-2xl bg-card pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={category === c ? "default" : "outline"}
                  onClick={() => setCategory(c)}
                  className="min-h-11 rounded-full shadow-none"
                >
                  {c === "Saved" && <Bookmark className="size-3.5" aria-hidden="true" />}
                  {c}
                </Button>
              ))}
            </div>
          </div>

          {showPapers && (
            <section className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-bold leading-8">Past papers</h3>
                <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="group" aria-label="Filter by paper">
                  {(["All papers", "Paper 1", "Paper 2"] as const).map((f) => (
                    <button
                      key={f}
                      aria-pressed={paperFilter === f}
                      onClick={() => setPaperFilter(f)}
                      className={cn("min-h-9 rounded-lg px-3.5 text-sm font-medium text-muted-foreground", paperFilter === f && "bg-card text-foreground shadow-xs")}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {sittings.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  {category === "Saved" ? "Nothing saved yet. Tap the download icon on a paper to save it." : "No papers match your search."}
                </p>
              )}
              {sittings.map((s) => (
                <Card key={s.name} className="gap-0 overflow-hidden rounded-2xl py-0">
                  <div className="flex items-center justify-between border-b bg-muted/50 px-5 py-3.5">
                    <h4 className="text-base font-semibold">{s.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {s.papers.length} {s.papers.length === 1 ? "paper" : "papers"}
                    </span>
                  </div>
                  {s.papers.map((p) => {
                    const key = `${s.name} · ${p.name}`
                    const isSaved = saved.has(key)
                    const score = scoreFor(key)
                    const attempt = live ? latest.get(key) : undefined
                    return (
                      <div key={key} className="flex flex-wrap items-center gap-3.5 border-b px-5 py-3.5 last:border-b-0">
                        <span className="inline-flex h-12 w-10 shrink-0 items-end justify-center rounded-md border bg-card pb-1.5 text-[10px] font-semibold leading-3 text-destructive">
                          PDF
                        </span>
                        <div className="min-w-[220px] flex-1">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            score === undefined
                              ? "border-border"
                              : score >= 70
                                ? "border-transparent bg-status-success text-white"
                                : "border-status-warning/40 bg-status-warning-subtle text-status-warning",
                          )}
                        >
                          {score === undefined ? "Not attempted" : `Attempted · ${score}%`}
                        </Badge>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => setSampleOpen(true)}>
                            Open
                          </Button>
                          {live && (
                            <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => openRecord(key)}>
                              <PenLine className="size-3.5" aria-hidden="true" />
                              {attempt ? "Record again" : "Record score"}
                            </Button>
                          )}
                          {attempt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove your latest score for ${key}`}
                              className="size-11 shadow-none"
                              onClick={() => removeAttempt(attempt)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                          <Button asChild size="sm" className="min-h-11 shadow-none">
                            <Link href={`/workspace/${subjectId}/quiz`}>
                              <Play className="size-3.5" aria-hidden="true" />
                              Practise timed
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={isSaved ? "Remove from saved" : "Save for later"}
                            aria-pressed={isSaved}
                            onClick={() => toggleSaved(key)}
                            className={cn("size-11 shadow-none", isSaved && "text-primary")}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              ))}
              {!showOlder && (
                <Button variant="outline" className="min-h-11 self-center rounded-xl shadow-none" onClick={() => setShowOlder(true)}>
                  Show older papers
                </Button>
              )}
            </section>
          )}

          {showGuides && (
            <section className="flex flex-col gap-3.5">
              <h3 className="text-2xl font-bold leading-8">Your notes and saved reels</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                {guides.map((g) =>
                  g.href ? (
                    <Link
                      key={g.name}
                      href={g.href}
                      className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50"
                    >
                      <Badge variant="secondary" className="w-fit">{g.kind}</Badge>
                      <span className="font-semibold">{g.name}</span>
                      <span className="text-xs text-muted-foreground">{g.meta}</span>
                    </Link>
                  ) : (
                    <button
                      key={g.name}
                      onClick={() => setSampleOpen(true)}
                      className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50"
                    >
                      <Badge variant="secondary" className="w-fit">{g.kind}</Badge>
                      <span className="font-semibold">{g.name}</span>
                      <span className="text-xs text-muted-foreground">{g.meta}</span>
                    </button>
                  ),
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-dashed p-4">
                <FolderOpen className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-muted-foreground">
                  No files from your teacher yet. When a teacher shares worksheets for {subject.name}, they'll appear here.
                </p>
              </div>
            </section>
          )}
          <p className="text-xs text-muted-foreground">Past paper files aren't connected yet; the list shows recent sittings so you can track the ones you do.</p>
        </div>

        <aside className="flex max-w-[360px] flex-[1_1_300px] flex-col gap-4">
          <Card className="gap-3 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <span className="g-res inline-flex size-10 items-center justify-center rounded-xl text-white" aria-hidden="true">
                <FileText className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-[22px]">Syllabus</h3>
                <p className="text-xs text-muted-foreground">
                  {level} {subject.name}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground">See every topic you'll be examined on, linked to your progress.</p>
            <Button asChild variant="outline" className="min-h-11 w-full rounded-xl shadow-none">
              <Link href={`/workspace/${subjectId}`}>Open syllabus</Link>
            </Button>
          </Card>

          <Card className="gap-3 rounded-2xl p-6">
            <h3 className="text-base font-semibold leading-[22px]">Past paper practice</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Papers attempted</span>
              <span className="font-semibold tabular-nums">
                {attemptedCount} of {LISTED_PAPERS}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sky/35">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round((attemptedCount / LISTED_PAPERS) * 100)}%`, background: "linear-gradient(90deg, #1058C9, #3FA6EE)" }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average score</span>
              <span className="font-semibold tabular-nums">{avg != null ? `${Math.round(avg)}%` : "–"}</span>
            </div>
            <div className="rounded-xl bg-primary/[0.08] px-3.5 py-3 text-[13px] font-medium text-primary-strong">
              {live
                ? lowest
                  ? `Your lowest score so far is ${lowest.title} (${Math.round(lowest.percentage)}%). Redo it once you've reviewed the mark scheme.`
                  : "Do a paper under timed conditions, then tap “Record score” to start tracking."
                : "Paper 2 questions on vectors cost you the most marks. Try January 2024, Paper 2."}
            </div>
          </Card>

          <Card className="gap-2.5 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-[22px]">Your exam</h3>
              <Badge className="border-transparent bg-primary/15 text-primary-strong">
                {examDate ? new Date(examDate + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Add your exam date and your dashboard will count down to it.</p>
            <Button
              className="min-h-11 w-full rounded-xl shadow-none"
              onClick={() => {
                setDraftDate(examDate)
                setFormError(null)
                setExamOpen(true)
              }}
            >
              {examDate ? "Change exam date" : "Set exam date"}
            </Button>
          </Card>

          <Card className="flex-row items-center gap-3 rounded-2xl p-4">
            <Download className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">
                {saved.size} {saved.size === 1 ? "paper" : "papers"} saved
              </p>
              <p className="text-xs text-muted-foreground">Your list to work through</p>
            </div>
            <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => setCategory("Saved")}>
              View
            </Button>
          </Card>
        </aside>
      </main>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Paper files coming soon</DialogTitle>
            <DialogDescription>
              Past paper and mark scheme files aren't connected yet. You can still record your score after doing a paper from your own copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="min-h-11 shadow-none" onClick={() => setSampleOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recording} onOpenChange={(o) => !o && setRecording(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record your score</DialogTitle>
            <DialogDescription>{recording}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="paper-score">Your marks</Label>
              <Input id="paper-score" type="number" min={0} inputMode="decimal" value={draftScore} onChange={(e) => setDraftScore(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paper-max">Out of</Label>
              <Input id="paper-max" type="number" min={1} inputMode="decimal" value={draftMax} onChange={(e) => setDraftMax(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="ghost" className="min-h-11 shadow-none" onClick={() => setRecording(null)}>
              Cancel
            </Button>
            <Button className="min-h-11 shadow-none" onClick={saveScore} disabled={saving || draftScore === ""}>
              Save score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Your exam date</DialogTitle>
            <DialogDescription>
              {live ? "Saved to your account, so the countdown follows you to any device." : "Saved on this device."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam date</Label>
            <Input id="exam-date" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className="h-11 rounded-xl" />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="ghost" className="min-h-11 shadow-none" onClick={() => setExamOpen(false)}>
              Cancel
            </Button>
            <Button className="min-h-11 shadow-none" onClick={saveExamDate} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
