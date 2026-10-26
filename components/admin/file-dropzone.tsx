"use client"

import { useRef, useState } from "react"
import { AlertTriangle, FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`
const extOf = (name: string) => name.slice(name.lastIndexOf(".")).toLowerCase()

/** Drag-and-drop / browse picker with client-side type, size and count checks. The server re-validates everything. */
export function FileDropzone({
  files,
  onChange,
  accept,
  maxFiles = 10,
  maxBytes = 20 * 1024 * 1024,
  typeHint,
  extraCheck,
  disabled,
}: {
  files: File[]
  onChange: (files: File[]) => void
  accept: string[]
  maxFiles?: number
  maxBytes?: number
  /** Extra sentence for an unsupported type, e.g. re-save advice */
  typeHint?: (ext: string) => string | undefined
  extraCheck?: (f: File) => string | null
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])

  const check = (f: File): string | null => {
    const ext = extOf(f.name)
    if (!accept.includes(ext)) return typeHint?.(ext) ?? `Unsupported type ${ext || "(none)"}. Use ${accept.join(", ")}.`
    if (f.size > maxBytes) return `Too large (${mb(f.size)}). Limit is ${Math.round(maxBytes / 1024 / 1024)} MB per file.`
    if (f.size === 0) return "File is empty."
    return extraCheck?.(f) ?? null
  }

  const add = (incoming: FileList | File[]) => {
    const bad: { name: string; reason: string }[] = []
    const next = [...files]
    for (const f of Array.from(incoming)) {
      const reason = check(f)
      if (reason) bad.push({ name: f.name, reason })
      else if (next.some((x) => x.name === f.name && x.size === f.size)) continue
      else if (next.length >= maxFiles) bad.push({ name: f.name, reason: `Only ${maxFiles} files per upload.` })
      else next.push(f)
    }
    setRejected(bad)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Choose files to upload"
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => !disabled && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) add(e.dataTransfer.files) }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
          dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <FileUp className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground">{accept.join(", ")} · up to {maxFiles} files, {Math.round(maxBytes / 1024 / 1024)} MB each</p>
        <input ref={input} type="file" multiple hidden accept={accept.join(",")} onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = "" }} />
      </div>

      {rejected.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive">
          {rejected.map((r, i) => (
            <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><b>{r.name}</b>: {r.reason}</span></li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="divide-y rounded-md border text-sm">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{mb(f.size)}</span>
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Remove ${f.name}`} disabled={disabled} onClick={() => onChange(files.filter((x) => x !== f))}>
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
