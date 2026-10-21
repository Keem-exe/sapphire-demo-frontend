"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen, Download, FileText, FolderOpen, Play, Search, Bookmark } from "lucide-react"
import { SUBJECTS, type SubjectId } from "@/lib/data/subjects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SapphyFab } from "@/components/sapphy-fab"
import { cn } from "@/lib/utils"

// SAMPLE: past papers, guides and the progress figures are placeholders from the design.
// There is no resources backend yet, so nothing here opens a real file.
type Paper = { name: string; desc: string; score?: number }
type Sitting = { name: string; papers: Paper[] }

const SITTINGS: Sitting[] = [
  { name: "May–June 2024", papers: [{ name: "Paper 1", desc: "Multiple choice · with answer key", score: 74 }, { name: "Paper 2", desc: "Structured questions · with mark scheme" }] },
  { name: "January 2024", papers: [{ name: "Paper 1", desc: "Multiple choice · with answer key", score: 66 }, { name: "Paper 2", desc: "Structured questions · with mark scheme" }] },
  { name: "May–June 2023", papers: [{ name: "Paper 1", desc: "Multiple choice · with answer key", score: 64 }, { name: "Paper 2", desc: "Structured questions · with mark scheme" }] },
]
const OLDER_SITTINGS: Sitting[] = [
  { name: "January 2023", papers: [{ name: "Paper 1", desc: "Multiple choice · with answer key" }, { name: "Paper 2", desc: "Structured questions · with mark scheme" }] },
  { name: "May–June 2022", papers: [{ name: "Paper 1", desc: "Multiple choice · with answer key" }, { name: "Paper 2", desc: "Structured questions · with mark scheme" }] },
]
const GUIDES = [
  { kind: "Revision guide", name: "Algebra: quadratics and factorising", meta: "PDF · 12 pages" },
  { kind: "Formula sheet", name: "Formulas and tables you need to know", meta: "PDF · 2 pages" },
  { kind: "Your notes", name: "Quadratic equations", meta: "From your notebook · edited today" },
  { kind: "Saved reels", name: "4 saved study reels", meta: "Algebra, Statistics" },
]
const CATEGORIES = ["All", "Past papers", "Mark schemes", "Syllabus", "Revision guides", "From my teacher", "Saved"] as const

export default function ResourcesPage() {
  const params = useParams()
  const subjectId = params.subjectId as SubjectId
  const subject = SUBJECTS[subjectId]
  const level = String(subjectId).startsWith("cape") ? "CAPE" : "CSEC"

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All")
  const [paperFilter, setPaperFilter] = useState<"All papers" | "Paper 1" | "Paper 2">("All papers")
  const [showOlder, setShowOlder] = useState(false)
  const [saved, setSaved] = useState<Set<string>>(new Set(["May–June 2024 · Paper 1", "January 2024 · Paper 1", "May–June 2023 · Paper 1", "May–June 2024 · Paper 2"]))
  const [sampleOpen, setSampleOpen] = useState(false)
  const [examOpen, setExamOpen] = useState(false)
  const [examDate, setExamDate] = useState("")
  const [draftDate, setDraftDate] = useState("")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`sapphire_exam_date_${subjectId}`)
      if (stored) setExamDate(stored)
    } catch {}
  }, [subjectId])

  const sittings = useMemo(() => {
    const all = showOlder ? [...SITTINGS, ...OLDER_SITTINGS] : SITTINGS
    const q = query.trim().toLowerCase()
    return all
      .map((s) => ({
        ...s,
        papers: s.papers.filter(
          (p) =>
            (paperFilter === "All papers" || p.name === paperFilter) &&
            (!q || `${s.name} ${p.name} ${p.desc}`.toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.papers.length > 0)
  }, [query, paperFilter, showOlder])

  if (!subject) return <div className="p-6">Unknown subject.</div>

  const showPapers = category === "All" || category === "Past papers" || category === "Mark schemes" || category === "Saved"
  const showGuides = category === "All" || category === "Revision guides" || category === "Saved"
  const attempted = SITTINGS.flatMap((s) => s.papers).filter((p) => p.score !== undefined)
  const average = Math.round(attempted.reduce((sum, p) => sum + (p.score ?? 0), 0) / attempted.length)
  const toggleSaved = (key: string) =>
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const saveExamDate = () => {
    setExamDate(draftDate)
    try {
      if (draftDate) localStorage.setItem(`sapphire_exam_date_${subjectId}`, draftDate)
      else localStorage.removeItem(`sapphire_exam_date_${subjectId}`)
    } catch {}
    setExamOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <SapphyFab activity="resources" subjectId={subjectId} startOpen={false} />
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
              Everything for {subject.name} in one place: past papers, mark schemes, the syllabus, revision guides and files from your teacher.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search resources"
                placeholder="Search papers, topics or questions, e.g. “quadratics 2023”"
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
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No papers match your search.</p>
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
                            p.score === undefined
                              ? "border-border"
                              : p.score >= 70
                                ? "border-transparent bg-status-success text-white"
                                : "border-status-warning/40 bg-status-warning-subtle text-status-warning",
                          )}
                        >
                          {p.score === undefined ? "Not started" : `Attempted · ${p.score}%`}
                        </Badge>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => setSampleOpen(true)}>
                            Open
                          </Button>
                          <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => setSampleOpen(true)}>
                            Mark scheme
                          </Button>
                          <Button asChild size="sm" className="min-h-11 shadow-none">
                            <Link href={`/workspace/${subjectId}/quiz`}>
                              <Play className="size-3.5" aria-hidden="true" />
                              Practise timed
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={isSaved ? "Remove from offline" : "Save for offline"}
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
              <h3 className="text-2xl font-bold leading-8">Revision guides and notes</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                {GUIDES.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setSampleOpen(true)}
                    className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50"
                  >
                    <Badge variant="secondary" className="w-fit">{g.kind}</Badge>
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.meta}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-dashed p-4">
                <FolderOpen className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-muted-foreground">
                  No files from your teacher yet. When a teacher shares worksheets for {subject.name}, they'll appear here.
                </p>
              </div>
            </section>
          )}
          <p className="text-xs text-muted-foreground">Past papers and mark schemes: sample listing, source and licence notice to be added.</p>
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
                  {level} {subject.name} · 2025
                </p>
              </div>
            </div>
            <p className="text-muted-foreground">See every topic and objective you'll be examined on, linked to your progress.</p>
            <Button asChild variant="outline" className="min-h-11 w-full rounded-xl shadow-none">
              <Link href={`/workspace/${subjectId}`}>Open syllabus</Link>
            </Button>
          </Card>

          <Card className="gap-3 rounded-2xl p-6">
            <h3 className="text-base font-semibold leading-[22px]">Past paper practice</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Papers attempted</span>
              <span className="font-semibold tabular-nums">3 of 8</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sky/35">
              <span className="block h-full rounded-full" style={{ width: "37.5%", background: "linear-gradient(90deg, #1058C9, #3FA6EE)" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average score</span>
              <span className="font-semibold tabular-nums">{average}%</span>
            </div>
            <div className="rounded-xl bg-primary/[0.08] px-3.5 py-3 text-[13px] font-medium text-primary-strong">
              Paper 2 questions on vectors cost you the most marks. Try January 2024, Paper 2.
            </div>
          </Card>

          <Card className="gap-2.5 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-[22px]">Your exam</h3>
              <Badge className="border-transparent bg-primary/15 text-primary-strong">
                {examDate ? new Date(examDate + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Add your exam date and Sapphy will plan which papers to do each week.</p>
            <Button
              className="min-h-11 w-full rounded-xl shadow-none"
              onClick={() => {
                setDraftDate(examDate)
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
                {saved.size} {saved.size === 1 ? "file" : "files"} saved for offline
              </p>
              <p className="text-xs text-muted-foreground">Study without using data</p>
            </div>
            <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => setSampleOpen(true)}>
              Manage
            </Button>
          </Card>
        </aside>
      </main>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sample resource</DialogTitle>
            <DialogDescription>
              This listing is sample data for now. Real past papers, mark schemes and guides will open here once they are connected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="min-h-11 shadow-none" onClick={() => setSampleOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Your exam date</DialogTitle>
            <DialogDescription>Sapphy uses this to plan which papers to do each week. It's saved on this device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam date</Label>
            <Input id="exam-date" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="min-h-11 shadow-none" onClick={() => setExamOpen(false)}>
              Cancel
            </Button>
            <Button className="min-h-11 shadow-none" onClick={saveExamDate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
