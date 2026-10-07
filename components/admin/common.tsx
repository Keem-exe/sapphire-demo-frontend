"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Pagination } from "@/lib/admin/api"
import type { RiskLevel } from "@/lib/admin/types"

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—")
export const fmtDay = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—")
export const fullName = (u: { firstName?: string; lastName?: string }) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"

export function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const RISK_STYLES: Record<RiskLevel, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  low: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
}
export const RISK_DOT: Record<RiskLevel, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge variant="outline" className={cn("capitalize", RISK_STYLES[level])}>
      {level}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const style =
    role === "admin"
      ? "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400"
      : role === "teacher"
        ? "bg-teal-500/15 text-teal-600 border-teal-500/30 dark:text-teal-400"
        : ""
  return (
    <Badge variant="outline" className={cn("capitalize", style)}>
      {role}
    </Badge>
  )
}

export function StatusBadge({ suspended }: { suspended: boolean }) {
  return suspended ? (
    <Badge variant="destructive">Suspended</Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      Active
    </Badge>
  )
}

export function UserLink({ id, name }: { id: number; name?: string }) {
  return (
    <Link href={`/admin/users/${id}`} className="font-medium hover:underline">
      {name || `User #${id}`}
    </Link>
  )
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="size-4 shrink-0" /> {message}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (p: number) => void }) {
  if (!pagination) return null
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {pagination.totalItems} total · page {pagination.page} of {Math.max(pagination.totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => onPage(pagination.page - 1)}>
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)}>
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  /** Return false to keep the dialog open */
  onConfirm: () => Promise<boolean | void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const ok = await onConfirm()
              setBusy(false)
              if (ok !== false) onOpenChange(false)
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Shared form-dialog shell: title, body, Cancel/Save with busy state. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  children,
  wide,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  /** Return false to keep the dialog open (e.g. validation error from the API) */
  onSubmit: () => Promise<boolean | void>
  children: React.ReactNode
  wide?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(wide && "sm:max-w-xl")}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            const ok = await onSubmit()
            setBusy(false)
            if (ok !== false) onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
