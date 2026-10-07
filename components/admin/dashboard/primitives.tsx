"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { Maximize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ErrorNote } from "@/components/admin/common"
import { cn } from "@/lib/utils"

/** null/undefined → "—" (never 0). */
export const num = (v?: number | null, digits = 0) =>
  v === null || v === undefined ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits })
export const pct = (v?: number | null, digits = 0) => (v === null || v === undefined ? "—" : `${num(v, digits)}%`)
export const mins = (v?: number | null) => (v === null || v === undefined ? "—" : `${num(v, 1)} min`)
export const secsToHours = (s?: number | null) => (s === null || s === undefined ? "—" : `${num(s / 3600, 1)} h`)
export const shortDate = (d?: string | null) => (d ? d.slice(5, 10) : "")

export const TOOLTIP_STYLE = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }

// ---- Student profile drawer context -------------------------------------------------

const ProfileCtx = createContext<{ open: (id: number) => void; openFeedback: (feature?: string) => void }>({
  open: () => {},
  openFeedback: () => {},
})
export const useProfileDrawer = () => useContext(ProfileCtx)
export const ProfileProvider = ProfileCtx.Provider

/** Any student name in any drawer: click opens the profile drawer. */
export function StudentName({ id, name, className }: { id: number; name?: string | null; className?: string }) {
  const { open } = useProfileDrawer()
  return (
    <button type="button" onClick={() => open(id)} className={cn("font-medium hover:underline text-left", className)}>
      {name || `Student #${id}`}
    </button>
  )
}

// ---- Cards & drawers ----------------------------------------------------------------

export function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function DashCard({
  title,
  icon: Icon,
  loading,
  error,
  onExpand,
  expandLabel = "Expand",
  disabled,
  badge,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  error?: string
  onExpand?: () => void
  expandLabel?: string
  disabled?: boolean
  badge?: string
  children?: React.ReactNode
}) {
  return (
    <Card className={cn("flex flex-col", disabled && "opacity-60")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" /> {title}
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </CardTitle>
        {onExpand && (
          <Button variant="ghost" size="sm" onClick={onExpand} disabled={disabled}>
            <Maximize2 className="size-3.5" /> {expandLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {error ? <ErrorNote message={error} /> : loading ? <CardSkeleton /> : children}
      </CardContent>
    </Card>
  )
}

export const CardSkeleton = () => (
  <div className="grid grid-cols-2 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
)

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  wide,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-full overflow-y-auto sm:max-w-3xl", wide && "sm:max-w-5xl")}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** For data the backend does not record yet. Never show a number here. */
export function NotTracked({ what }: { what: string }) {
  return (
    <div className="rounded-md border border-dashed px-4 py-6 text-center">
      <p className="text-sm font-medium">Not tracked yet</p>
      <p className="text-xs text-muted-foreground">{what} isn&apos;t recorded by the backend yet.</p>
    </div>
  )
}

export function NoData({ text = "No data yet" }: { text?: string }) {
  return <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>
}

/** Lazy-open pattern: tracks open state so the details query only runs once opened. */
export function useDisclosure() {
  const [isOpen, setOpen] = useState(false)
  return { isOpen, setOpen, open: useCallback(() => setOpen(true), []) }
}

/** Simple horizontal bar list: label / bar / value. */
export function BarList({ rows, format = (n: number) => num(n, 1) }: { rows: { key: string | number; label: React.ReactNode; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <NoData />
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="tabular-nums text-muted-foreground">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}
