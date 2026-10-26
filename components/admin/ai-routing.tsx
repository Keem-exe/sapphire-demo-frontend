"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import { invalidate, useApi } from "@/lib/admin/use-api"
import { ErrorNote } from "./common"
import { useAdmin } from "./admin-auth"

type Route = "gemini" | "local" | "auto"
type Setting = { route: Route; percent: number }
type Usage = { count: number; fallbacks: number }

interface RoutingState {
  features: { feature: string; route: Route; percent: number; source: "setting" | "env" | "default"; usage: { gemini?: Usage; local?: Usage } }[]
  localModel?: { configured: boolean; name?: string; breaker?: { open: boolean; consecutiveFailures: number; retryInSeconds: number } }
  geminiConfigured?: boolean
}

const FEATURE_LABELS: Record<string, string> = { chat: "Tutor chat", quiz: "Quizzes", flashcards: "Flashcards", assignment: "Assignments" }

/** Which AI model answers each feature. Everyone can read it; only a global admin can change it. */
export function AiRoutingCard() {
  const { isGlobalAdmin } = useAdmin()
  const { data, loading, error } = useApi<RoutingState>("/api/admin/ai/routing")
  const [edits, setEdits] = useState<Record<string, Setting>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const local = data?.localModel
  const localReady = local?.configured === true
  const breaker = local?.breaker
  const dirty = Object.keys(edits).length > 0

  const current = (f: RoutingState["features"][number]): Setting => edits[f.feature] ?? { route: f.route, percent: f.percent }
  const edit = (feature: string, base: Setting, patch: Partial<Setting>) => setEdits((e) => ({ ...e, [feature]: { ...base, ...patch } }))

  const save = async () => {
    if (!data) return
    // The API wants the whole object; features still on env/default stay omitted so they keep falling back.
    const value: Record<string, Setting | Route> = {}
    for (const f of data.features) {
      if (f.source !== "setting" && !edits[f.feature]) continue
      const c = current(f)
      value[f.feature] = c.route === "auto" ? c : c.route
    }
    setSaving(true)
    const r = await mutate(() => api.patch("/api/admin/settings/llm_routing", { value }), "AI routing updated")
    setSaving(false)
    if (r.ok) setEdits({})
  }

  const test = async () => {
    setTesting(true)
    try {
      const res = await api.post<{ ok: boolean; model?: string; reply?: string; durationMs?: number; error?: string }>("/api/admin/ai/routing/test")
      const d = res.data
      if (d.ok) toast.success(`${d.model ?? "Our model"} replied in ${d.durationMs ?? "?"} ms`)
      else toast.error(d.error || "Test failed")
    } catch (e) {
      toast.error((e as Error).message)
    }
    setTesting(false)
    invalidate() // a passing test closes the circuit breaker, so refresh the banner
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">AI routing</CardTitle>
          <CardDescription>
            Choose which model answers each feature. Gemini is the default; &ldquo;Auto&rdquo; tries our model first and falls back to Gemini if it fails.
            {!isGlobalAdmin && " Only a global admin can change this."}
          </CardDescription>
        </div>
        {isGlobalAdmin && (
          <Button variant="outline" size="sm" onClick={test} disabled={testing || !localReady}>
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Test connection
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorNote message={error} />
        {data && !localReady && <Banner>Our model isn&apos;t connected yet. Every feature is answered by Gemini.</Banner>}
        {data && localReady && breaker?.open && (
          <Banner>Our model is paused after repeated failures; retrying in {breaker.retryInSeconds} s.</Banner>
        )}
        {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}

        <ul className="divide-y">
          {data?.features.map((f) => {
            const c = current(f)
            const g = f.usage.gemini
            const l = f.usage.local
            return (
              <li key={f.feature} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{FEATURE_LABELS[f.feature] ?? f.feature}</p>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={c.route}
                    disabled={!isGlobalAdmin}
                    aria-label={`Model for ${f.feature}`}
                    onValueChange={(v) => v && edit(f.feature, c, { route: v as Route })}
                  >
                    <ToggleGroupItem value="gemini">Gemini</ToggleGroupItem>
                    <ToggleGroupItem value="local" disabled={!localReady}>Our model</ToggleGroupItem>
                    <ToggleGroupItem value="auto" disabled={!localReady}>Auto</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                {c.route === "auto" && (
                  <div className="flex items-center gap-3">
                    <Slider
                      className="max-w-xs"
                      min={0}
                      max={100}
                      step={5}
                      value={[c.percent]}
                      disabled={!isGlobalAdmin}
                      aria-label={`Percent of ${f.feature} requests that try our model first`}
                      onValueChange={([v]) => edit(f.feature, c, { percent: v })}
                    />
                    <span className="w-28 text-sm tabular-nums text-muted-foreground">{c.percent}% try our model first</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Last 30 days: Gemini {g?.count ?? 0}
                  {(g?.fallbacks ?? 0) > 0 && ` (${g!.fallbacks} fallbacks)`} · Our model {l?.count ?? 0}
                  {(l?.fallbacks ?? 0) > 0 && ` (${l!.fallbacks} fallbacks)`}
                  {f.source !== "setting" && ` · using ${f.source} value`}
                </p>
              </li>
            )
          })}
        </ul>

        {isGlobalAdmin && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={!dirty || saving} onClick={() => setEdits({})}>Discard</Button>
            <Button disabled={!dirty || saving} onClick={save}>{saving && <Loader2 className="size-4 animate-spin" />} Save routing</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="size-4 shrink-0" /> {children}
    </div>
  )
}
