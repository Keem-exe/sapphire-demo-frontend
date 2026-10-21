"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Columns3,
  Circle,
  Flame,
  Focus,
  Layers,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Target,
  Timer,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sapphy } from "@/components/sapphy"
import { cn } from "@/lib/utils"

type ItemId = "notebook" | "sapphy" | "flashcards" | "quiz" | "reels" | "assign" | "resources" | "syllabus"
type Place = "left" | "right" | "off"
type ViewId = "overview" | "notebook" | "syllabus"

// NOTE: everything below marked SAMPLE is placeholder content from the design.
// There is no backend data for it yet, so replace it with real values when available.
const DEFAULT_PLACE: Record<ItemId, Place> = {
  notebook: "left",
  resources: "left",
  syllabus: "left",
  sapphy: "right",
  quiz: "right",
  flashcards: "right",
  reels: "right",
  assign: "right",
}

type ItemDef = {
  id: ItemId
  name: string
  status: string // SAMPLE (except notebook, filled from real notes)
  icon: React.ComponentType<{ className?: string }>
  tint: string
  ink: string
}

const ITEM_DEFS: ItemDef[] = [
  { id: "notebook", name: "Notebook", status: "", icon: NotebookText, tint: "color-mix(in oklab, var(--primary) 12%, var(--card))", ink: "var(--primary-strong)" },
  { id: "sapphy", name: "Sapphy", status: "Ask anything", icon: Target, tint: "color-mix(in oklab, var(--accent) 16%, var(--card))", ink: "var(--primary-strong)" },
  { id: "flashcards", name: "Flashcards", status: "12 cards due today", icon: Layers, tint: "color-mix(in oklab, var(--tool-flashcards) 14%, var(--card))", ink: "var(--tool-flashcards)" },
  { id: "quiz", name: "Quiz", status: "Last score 80%", icon: Target, tint: "color-mix(in oklab, var(--tool-quiz) 12%, var(--card))", ink: "var(--tool-quiz)" },
  { id: "reels", name: "Study reels", status: "3 saved", icon: Video, tint: "color-mix(in oklab, var(--tool-reels) 12%, var(--card))", ink: "var(--tool-reels)" },
  { id: "assign", name: "Assignment", status: "1 in progress", icon: ClipboardList, tint: "color-mix(in oklab, var(--tool-assignment) 16%, var(--card))", ink: "#8a5a00" },
  { id: "resources", name: "Resources", status: "3 of 8 papers done", icon: BookOpen, tint: "color-mix(in oklab, #1b4db3 14%, var(--card))", ink: "#14398a" },
  { id: "syllabus", name: "Syllabus", status: "65% covered", icon: ListChecks, tint: "color-mix(in oklab, #1b4db3 14%, var(--card))", ink: "#14398a" },
]

const SAMPLE_PLAN = [
  { day: "Mon", task: "Write notes on the quadratic formula", meta: "Notebook · 15 min", state: "done", view: "notebook", cta: "" },
  { day: "Tue", task: "Algebra quiz sprint", meta: "Quiz · scored 80%", state: "done", view: "quiz", cta: "" },
  { day: "Wed", task: "12 flashcards on factorising", meta: "Flashcards · about 6 min · your weakest topic", state: "today", view: "flashcards", cta: "Start" },
  { day: "Thu", task: "Watch “Completing the square, fast”, then 3 questions", meta: "Reels + Quiz · 10 min", state: "next", view: "reels", cta: "Open" },
  { day: "Fri", task: "Past paper: January 2024, Paper 2, Q1–4", meta: "Resources · 35 min", state: "next", view: "resources", cta: "Open" },
  { day: "Sat", task: "Finish the quadratics assignment", meta: "Assignment · 20 min", state: "next", view: "assign", cta: "Open" },
  { day: "Sun", task: "Weekly check-in with Sapphy", meta: "Sapphy · 5 min · plans next week", state: "next", view: "sapphy", cta: "Open" },
] as const

const SAMPLE_WEEK_MINUTES = [45, 30, 20, 0, 0, 0, 0]
const SAMPLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SAMPLE_PCTS = [86, 72, 70, 64, 58, 51, 42, 38, 30]

// Tools that live on their own screen: clicking them in a column goes to that page
const PAGE_ROUTE: Partial<Record<ItemId, string>> = {
  flashcards: "flashcards",
  quiz: "quiz",
  reels: "reels",
  assign: "assignment",
  resources: "resources",
}

function Bar({ pct, thin }: { pct: number; thin?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-sky/35", thin ? "h-1.5" : "h-2")}>
      <span
        className="block h-full rounded-full"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #1058C9, #3FA6EE)" }}
      />
    </div>
  )
}

function ItemIcon({ id, className }: { id: ItemId; className?: string }) {
  if (id === "sapphy") return <Sapphy className={cn("size-5", className)} />
  const Icon = ITEM_DEFS.find((i) => i.id === id)!.icon
  return <Icon className={cn("size-4", className)} />
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(v)))

interface WorkspaceShellProps {
  subjectId: string
  subjectName: string
  subjectEmoji: string
  levelLabel: string
  topics: string[]
  noteTitles: string[]
  onBack: () => void
  notebook: React.ReactNode // real notebook sidebar + editor
  chat: (opts: { fullScreen: boolean }) => React.ReactNode // real AI coach
}

export function WorkspaceShell({
  subjectId,
  subjectName,
  subjectEmoji,
  levelLabel,
  topics,
  noteTitles,
  onBack,
  notebook,
  chat,
}: WorkspaceShellProps) {
  const router = useRouter()
  const [place, setPlace] = useState<Record<ItemId, Place>>(DEFAULT_PLACE)
  const [openL, setOpenL] = useState(false)
  const [openR, setOpenR] = useState(false)
  const [left, setLeft] = useState(300)
  const [right, setRight] = useState(360)
  const [drag, setDrag] = useState<"L" | "R" | null>(null)
  const [origin, setOrigin] = useState({ x: 0, w: 0 })
  const [view, setView] = useState<ViewId>("overview")
  const [custom, setCustom] = useState(false)
  const [customising, setCustomising] = useState(false)
  const [full, setFull] = useState(false)
  const [sapphy, setSapphy] = useState(true)
  const [focus, setFocus] = useState(false)

  const items = ITEM_DEFS.map((it) =>
    it.id === "notebook" ? { ...it, status: `${noteTitles.length} ${noteTitles.length === 1 ? "note" : "notes"}` } : it,
  )
  const leftItems = items.filter((i) => i.id !== "sapphy" && place[i.id] === "left")
  const rightTools = items.filter((i) => i.id !== "sapphy" && place[i.id] === "right")
  const rightItems = [items.find((i) => i.id === "sapphy")!, ...rightTools]
  const current = items.find((i) => i.id === (view as ItemId))
  const viewName = current ? current.name : "Overview"

  const syllabusRows = topics.map((name, i) => ({ name, pct: SAMPLE_PCTS[i % SAMPLE_PCTS.length] }))
  const weakest = [...syllabusRows].sort((a, b) => a.pct - b.pct)[0]

  const openItem = (id: ItemId) => {
    if (id === "sapphy") {
      setOpenR(true)
      setSapphy(true)
    } else if (PAGE_ROUTE[id]) {
      router.push(`/workspace/${subjectId}/${PAGE_ROUTE[id]}`)
    } else {
      setView(id as ViewId)
    }
  }
  const putItem = (id: ItemId, where: Place) => {
    setPlace((p) => ({ ...p, [id]: where }))
    setCustom(true)
  }
  const resetSimple = () => {
    setPlace(DEFAULT_PLACE)
    setOpenL(false)
    setOpenR(false)
    setCustom(false)
    setCustomising(false)
  }
  const showLRail = !focus && leftItems.length > 0 && !openL
  const showLPanel = !focus && leftItems.length > 0 && openL
  const showRRail = !focus && rightItems.length > 0 && !openR
  const showRPanel = openR && (!focus || sapphy)


  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const dx = e.clientX - origin.x
    if (drag === "L") setLeft(clamp(origin.w + dx, 220, 440))
    else setRight(clamp(origin.w - dx, 280, 520))
  }
  const startDrag = (side: "L" | "R") => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    setDrag(side)
    setOrigin({ x: e.clientX, w: side === "L" ? left : right })
  }

  const resizer = (side: "L" | "R") => {
    const width = side === "L" ? left : right
    return (
      <button
        className={cn("rz", drag === side && "on")}
        aria-label={`Resize ${side === "L" ? "left" : "right"} column, now ${width} pixels. Drag, or use the left and right arrow keys.`}
        onPointerDown={startDrag(side)}
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" ? 20 : e.key === "ArrowLeft" ? -20 : 0
          if (!step) return
          e.preventDefault()
          if (side === "L") setLeft((w) => clamp(w + step, 220, 440))
          else setRight((w) => clamp(w - step, 280, 520))
        }}
      >
        <span className="rz-grip" />
        {drag === side && <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md border bg-primary px-2 py-0.5 text-xs tabular-nums text-primary-foreground">{width} px</span>}
      </button>
    )
  }

  const itemCard = (it: (typeof items)[number], extra?: React.ReactNode) => {
    const active = it.id === "sapphy" ? openR && sapphy : view === it.id
    return (
      <section key={it.id} className={cn("overflow-hidden rounded-2xl border bg-card", active ? "border-primary" : "border-transparent")} style={{ borderWidth: 2 }}>
        <button
          onClick={() => openItem(it.id)}
          className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left"
        >
          <span className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px]" style={{ background: it.tint, color: it.ink }}>
            <ItemIcon id={it.id} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{it.name}</span>
            <span className="text-xs text-muted-foreground">{it.status}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
        {extra}
      </section>
    )
  }

  const itemExtra = (id: ItemId) => {
    if (id === "notebook")
      return (
        <div className="flex flex-col gap-1 px-3 pb-3">
          {noteTitles.slice(0, 3).map((n) => (
            <p key={n} className="flex items-center gap-1.5 text-xs">
              <span className="size-1 rounded-full bg-primary" />
              {n}
            </p>
          ))}
        </div>
      )
    if (id === "syllabus")
      return (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {syllabusRows.slice(0, 3).map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-xs">
                <span>{s.name}</span>
                <span className="tabular-nums text-muted-foreground">{s.pct}%</span>
              </div>
              <Bar pct={s.pct} thin />
            </div>
          ))}
        </div>
      )
    if (id === "sapphy")
      return (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <button className="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-[13px]" onClick={() => openItem("sapphy")}>
            <Target className="size-3.5 text-primary" aria-hidden="true" />
            Explain my weakest topic
          </button>
          <button className="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-[13px]" onClick={() => setFull(true)}>
            <Maximize2 className="size-3.5 text-primary" aria-hidden="true" />
            Open full screen
          </button>
        </div>
      )
    return null
  }

  const railButtons = (list: typeof items) =>
    list.map((it) => {
      const active = it.id === "sapphy" ? openR && sapphy : view === it.id
      return (
        <button
          key={it.id}
          onClick={() => openItem(it.id)}
          aria-label={`Open ${it.name}`}
          title={it.name}
          className={cn("inline-flex size-11 items-center justify-center rounded-xl border-2", active ? "border-primary" : "border-transparent")}
          style={{ background: active ? "color-mix(in oklab, var(--primary) 10%, var(--card))" : it.tint, color: it.ink }}
        >
          <ItemIcon id={it.id} />
        </button>
      )
    })

  const overview = (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-[22px] px-7 pb-12 pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject overview</p>
          <h1 className="text-[30px] font-bold leading-9">
            <span aria-hidden="true">{subjectEmoji}</span> {subjectName}
          </h1>
          <p className="text-muted-foreground">
            {levelLabel} · {topics.length} topics · Last studied 2 hours ago
          </p>
        </div>
        <Button variant="outline" className="min-h-11 rounded-xl shadow-none" onClick={() => openItem("sapphy")}>
          <Timer className="size-4" aria-hidden="true" />
          Set exam date
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Studied this week</p>
          <p className="text-[26px] font-bold leading-8 tabular-nums">3h 20m</p>
          <p className="text-xs text-status-success">+40m on last week</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Study streak</p>
          <p className="flex items-center gap-1.5 text-[26px] font-bold leading-8 tabular-nums text-streak">
            <Flame className="size-5" aria-hidden="true" />6 days
          </p>
          <p className="text-xs text-muted-foreground">Best: 11 days</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Syllabus covered</p>
          <p className="text-[26px] font-bold leading-8 tabular-nums">65%</p>
          <div className="mt-1">
            <Bar pct={65} thin />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Topics mastered</p>
          <p className="text-[26px] font-bold leading-8 tabular-nums">
            9 <span className="text-base font-medium text-muted-foreground">of {topics.length > 9 ? topics.length : 24}</span>
          </p>
          <p className="text-xs text-muted-foreground">2 close to mastery</p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <section className="flex min-w-0 flex-[999_1_420px] flex-col gap-3.5 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">This week's learning plan</h2>
              <p className="text-xs text-muted-foreground">Built by Sapphy from your weak topics · 2 of 7 done</p>
            </div>
            <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => openItem("sapphy")}>
              Adjust with Sapphy
            </Button>
          </div>
          <Bar pct={28} thin />
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {SAMPLE_PLAN.map((p) => {
              const Icon = p.state === "done" ? CheckCircle2 : p.state === "today" ? CircleDot : Circle
              return (
                <li
                  key={p.day}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    p.state === "today" ? "border-primary/35 bg-primary/[0.07]" : "border-border",
                  )}
                >
                  <span className={cn("w-[34px] shrink-0 text-xs font-semibold tabular-nums", p.state === "today" ? "text-primary-strong" : "text-muted-foreground")}>{p.day}</span>
                  <Icon
                    className={cn("size-4 shrink-0", p.state === "done" ? "text-status-success" : p.state === "today" ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("font-medium", p.state === "done" && "line-through")}>{p.task}</span>
                    <span className="text-xs text-muted-foreground">{p.meta}</span>
                  </span>
                  {p.state === "today" && (
                    <Button size="sm" className="min-h-11 shadow-none" onClick={() => openItem(p.view as ItemId)}>
                      {p.cta}
                    </Button>
                  )}
                  {p.state === "next" && (
                    <Button size="sm" variant="ghost" className="min-h-11 shadow-none" onClick={() => openItem(p.view as ItemId)}>
                      {p.cta}
                    </Button>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        <div className="flex flex-[1_1_300px] flex-col gap-[18px]">
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Study time</h2>
              <span className="text-xs text-muted-foreground">This week, minutes</span>
            </div>
            <div
              role="img"
              aria-label="Minutes studied each day this week: Monday 45, Tuesday 30, Wednesday 20 so far, Thursday to Sunday not yet."
              className="flex h-[120px] items-end gap-2 border-b"
            >
              {SAMPLE_WEEK_MINUTES.map((m, i) => (
                <span
                  key={i}
                  className="min-h-[3px] flex-1 rounded-t"
                  style={{
                    height: `${Math.max(2, Math.round((m / 60) * 100))}%`,
                    background: i === 2 ? "var(--primary)" : m ? "color-mix(in oklab, var(--primary) 45%, var(--card))" : "var(--muted)",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {SAMPLE_DAYS.map((d, i) => (
                <span key={d} className={cn("flex-1 text-center text-xs text-muted-foreground", i === 2 && "font-semibold")}>
                  {d}
                </span>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Topic mastery</h2>
              <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={() => setView("syllabus")}>
                All topics
              </Button>
            </div>
            {syllabusRows.slice(0, 5).map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs">
                  <span>{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">{s.pct}%</span>
                </div>
                <Bar pct={s.pct} thin />
              </div>
            ))}
            {weakest && (
              <div className="flex gap-2.5 rounded-xl border border-status-warning/40 bg-status-warning-subtle p-3 text-[13px]">
                <Target className="size-4 shrink-0 text-status-warning" aria-hidden="true" />
                {weakest.name} ({weakest.pct}%) is your weakest topic.
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Jump in</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => openItem(it.id)}
              className="flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5 text-left shadow-sm transition-colors hover:border-primary/50"
            >
              <span className="inline-flex size-[38px] items-center justify-center rounded-[10px]" style={{ background: it.tint, color: it.ink }}>
                <ItemIcon id={it.id} />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{it.name}</span>
                <span className="text-xs text-muted-foreground">{it.status}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )

  const syllabus = (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-3.5 p-6">
      <p className="text-muted-foreground">
        Every {levelLabel} {subjectName} topic, with how confident you are in each.
      </p>
      {syllabusRows.map((s) => (
        <div key={s.name} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{s.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{s.pct}%</span>
          </div>
          <div className="mt-2">
            <Bar pct={s.pct} thin />
          </div>
        </div>
      ))}
    </div>
  )

  const centre: Record<ViewId, React.ReactNode> = {
    overview,
    notebook: <div className="flex min-h-0 flex-1 flex-wrap bg-card">{notebook}</div>,
    syllabus,
  }

  return (
    <div
      className="ws-root flex h-screen flex-col bg-background"
      style={{ userSelect: drag ? "none" : "auto" }}
      onPointerMove={onPointerMove}
      onPointerUp={() => drag && setDrag(null)}
    >
      {!focus && (
        <header className="border-b bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={onBack} aria-label="Sapphire OS home" className="inline-flex">
                <Image src="/sapphire-logo.png" alt="Sapphire OS" width={89} height={30} className="block h-[30px] w-auto" />
              </button>
              <span className="h-6 w-px bg-border" />
              <Button variant="ghost" size="sm" className="min-h-11 shadow-none" onClick={onBack}>
                Dashboard
              </Button>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              <Button variant="ghost" size="sm" className="min-h-11 text-[15px] font-semibold shadow-none" onClick={() => setView("overview")}>
                <span aria-hidden="true">{subjectEmoji}</span>
                {subjectName}
              </Button>
              <Badge variant="outline">{levelLabel}</Badge>
              {view !== "overview" && (
                <>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-[15px] font-semibold" aria-current="page">
                    {viewName}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {view !== "overview" && (
                <>
                  <Button size="sm" className="min-h-11 shadow-none" onClick={() => setFocus(true)}>
                    <Focus className="size-4" aria-hidden="true" />
                    Focus mode
                  </Button>
                  <span className="mx-1 h-6 w-px bg-border" />
                </>
              )}
              <span className="text-xs text-muted-foreground">Layout</span>
              <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="group" aria-label="Layout">
                <button aria-pressed={!custom} onClick={resetSimple} className={cn("min-h-9 rounded-lg px-3.5 text-sm font-medium text-muted-foreground", !custom && "bg-card text-foreground shadow-xs")}>
                  Simple
                </button>
                <button aria-pressed={custom} onClick={() => { setCustomising(true); setCustom(true) }} className={cn("min-h-9 rounded-lg px-3.5 text-sm font-medium text-muted-foreground", custom && "bg-card text-foreground shadow-xs")}>
                  Custom
                </button>
              </div>
              <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => { setCustomising(true); setCustom(true) }}>
                <Columns3 className="size-4" aria-hidden="true" />
                Customise columns
              </Button>
            </div>
          </div>
        </header>
      )}

      {focus && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Badge className="border-transparent bg-primary/15 text-primary-strong">
              <Focus className="size-3" aria-hidden="true" />
              Focus mode
            </Badge>
            <span className="font-semibold">{viewName}</span>
            <span className="text-xs text-muted-foreground">{subjectName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
              <Timer className="size-3.5" aria-hidden="true" />
              18:42 left in this 25-minute session
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" />
              Notifications paused
            </span>
            <Button variant="outline" size="sm" className="min-h-11 shadow-none" onClick={() => setFocus(false)}>
              <X className="size-4" aria-hidden="true" />
              Exit focus
            </Button>
          </div>
        </div>
      )}

      <div className="ws-body flex min-h-0 flex-1">
        {showLRail && (
          <aside aria-label="Left column, collapsed" className="ws-rail flex w-[60px] shrink-0 flex-col items-center gap-2 border-r bg-card py-3">
            <Button variant="ghost" size="icon" className="size-11 shadow-none" aria-label="Expand left column" onClick={() => setOpenL(true)}>
              <PanelLeftOpen className="size-4" />
            </Button>
            <span className="h-px w-7 bg-border" />
            {railButtons(leftItems)}
          </aside>
        )}
        {showLPanel && (
          <>
            <aside aria-label="Left column" className="ws-side flex shrink-0 flex-col overflow-y-auto border-r bg-card" style={{ flex: `0 0 ${left}px`, maxWidth: left }}>
              <div className="flex items-center justify-between py-3 pl-4 pr-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Left column</span>
                <Button variant="ghost" size="icon" className="size-11 shadow-none" aria-label="Collapse left column" onClick={() => setOpenL(false)}>
                  <PanelLeftClose className="size-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-2.5 px-3 pb-4">{leftItems.map((it) => itemCard(it, itemExtra(it.id)))}</div>
            </aside>
            {resizer("L")}
          </>
        )}

        <main className="flex min-w-[320px] flex-[1_1_0] flex-col overflow-y-auto bg-background">{centre[view]}</main>

        {showRPanel && (
          <>
            {resizer("R")}
            <aside aria-label="Right column" className="ws-side flex shrink-0 flex-col border-l bg-card" style={{ flex: `0 0 ${right}px`, maxWidth: right }}>
              <div className="flex items-center gap-1.5 border-b px-3 py-2.5">
                <Button variant="ghost" size="icon" className="size-11 shrink-0 shadow-none" aria-label="Collapse right column" onClick={() => setOpenR(false)}>
                  <PanelRightClose className="size-4" />
                </Button>
                <div className="flex flex-1 gap-0.5 rounded-xl bg-muted p-[3px]" role="tablist" aria-label="Right column">
                  <button role="tab" aria-selected={sapphy} onClick={() => setSapphy(true)} className={cn("flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground", sapphy && "bg-card text-foreground shadow-xs")}>
                    <Sapphy className="size-4" />
                    Sapphy
                  </button>
                  <button role="tab" aria-selected={!sapphy} onClick={() => setSapphy(false)} className={cn("min-h-9 flex-1 rounded-lg text-sm font-medium text-muted-foreground", !sapphy && "bg-card text-foreground shadow-xs")}>
                    Tools
                  </button>
                </div>
                <Button variant="ghost" size="icon" className="size-11 shrink-0 shadow-none" aria-label="Open Sapphy full screen" onClick={() => setFull(true)}>
                  <Maximize2 className="size-4" />
                </Button>
              </div>
              {sapphy ? (
                <div className="min-h-0 flex-1">{chat({ fullScreen: false })}</div>
              ) : (
                <div className="flex flex-col gap-2.5 overflow-y-auto px-3 pb-4 pt-3">{rightTools.map((it) => itemCard(it))}</div>
              )}
            </aside>
          </>
        )}
        {showRRail && (
          <aside aria-label="Right column, collapsed" className="ws-rail flex w-[60px] shrink-0 flex-col items-center gap-2 border-l bg-card py-3">
            <Button variant="ghost" size="icon" className="size-11 shadow-none" aria-label="Expand right column" onClick={() => setOpenR(true)}>
              <PanelRightOpen className="size-4" />
            </Button>
            <span className="h-px w-7 bg-border" />
            {railButtons(rightItems)}
          </aside>
        )}
      </div>

      {full && (
        <div role="dialog" aria-modal="true" aria-label="Sapphy, full screen" className="fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b bg-card px-5 py-3">
            <div className="flex items-center gap-3">
              <Sapphy className="size-8" />
              <div>
                <p className="text-[17px] font-semibold">Sapphy</p>
                <p className="text-xs text-muted-foreground">
                  {subjectName} · {levelLabel}
                </p>
              </div>
            </div>
            <Button variant="outline" className="min-h-11 shadow-none" onClick={() => setFull(false)}>
              <Minimize2 className="size-4" aria-hidden="true" />
              Exit full screen
            </Button>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-[760px] flex-1">{chat({ fullScreen: true })}</div>
        </div>
      )}

      <Dialog open={customising} onOpenChange={setCustomising}>
        <DialogContent className="max-w-[600px] gap-[18px] rounded-2xl p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Customise your workspace</DialogTitle>
            <DialogDescription>
              Choose which column each tool lives in. Click any tool, in either column, to open it in the centre.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between bg-muted px-3.5 py-2 text-xs font-medium text-muted-foreground">
              <span>Tool</span>
              <span>Show in</span>
            </div>
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 border-t px-3.5 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex size-[30px] items-center justify-center rounded-[10px]" style={{ background: it.tint, color: it.ink }}>
                    <ItemIcon id={it.id} />
                  </span>
                  <span className="font-medium">{it.name}</span>
                </span>
                {it.id === "sapphy" ? (
                  <span className="text-xs text-muted-foreground">Always in the right panel</span>
                ) : (
                  <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="radiogroup" aria-label={`Where to show ${it.name}`}>
                    {(["left", "right", "off"] as Place[]).map((w) => (
                      <button
                        key={w}
                        role="radio"
                        aria-checked={place[it.id] === w}
                        onClick={() => putItem(it.id, w)}
                        className={cn("min-h-9 rounded-lg px-3 text-sm font-medium capitalize text-muted-foreground", place[it.id] === w && "bg-card text-foreground shadow-xs")}
                      >
                        {w === "off" ? "Hidden" : w}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "Keep the left column open", on: openL, set: setOpenL },
              { label: "Keep the right column open", on: openR, set: setOpenR },
            ].map((o) => (
              <label key={o.label} className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-sm", o.on && "border-primary bg-primary/5")}>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={o.on}
                  onChange={() => {
                    o.set(!o.on)
                    setCustom(true)
                  }}
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="min-h-11 shadow-none" onClick={resetSimple}>
              Reset to Simple
            </Button>
            <Button className="min-h-11 shadow-none" onClick={() => setCustomising(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
