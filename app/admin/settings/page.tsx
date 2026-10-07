"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/admin/api"
import { mutate } from "@/lib/admin/mutate"
import type { Setting } from "@/lib/admin/types"
import { useApi } from "@/lib/admin/use-api"
import { ConfirmDialog, ErrorNote, PageHeader, fmtDate } from "@/components/admin/common"

const LABELS: Record<string, string> = {
  maintenance_mode: "Maintenance mode",
  signup_enabled: "Signups enabled",
  ai_features_enabled: "AI features",
}

export default function SettingsPage() {
  const { data, loading, error } = useApi<{ settings: Setting[] }>("/api/admin/settings")
  const [pending, setPending] = useState<string | null>(null)
  const [confirmMaintenance, setConfirmMaintenance] = useState(false)

  const update = async (key: string, value: boolean) => {
    setPending(key)
    const r = await mutate(() => api.patch(`/api/admin/settings/${key}`, { value }), "Setting updated")
    setPending(null)
    return r.ok
  }

  // Only the three known keys are toggleable; the API rejects others.
  const settings = data?.settings.filter((s) => s.key in LABELS)

  return (
    <>
      <PageHeader title="Settings" description="Platform-wide toggles. Changes take effect immediately." />
      <ErrorNote message={error} />
      <div className="max-w-2xl space-y-3">
        {loading && !data && <Skeleton className="h-20 w-full" />}
        {settings?.map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {LABELS[s.key]}
                  {s.key === "ai_features_enabled" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger aria-label="More info"><Info className="size-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs">AI endpoints are also gated by whether the server has a Gemini API key configured. This toggle does not override a missing key.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                {s.updatedAt && <p className="mt-1 text-xs text-muted-foreground">Last changed {fmtDate(s.updatedAt)}</p>}
              </div>
              <Switch
                checked={s.value}
                disabled={pending === s.key}
                aria-label={LABELS[s.key]}
                onCheckedChange={(v) => (s.key === "maintenance_mode" && v ? setConfirmMaintenance(true) : update(s.key, v))}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        title="Turn on maintenance mode?"
        description="All non-admin API traffic will be blocked with a maintenance message until you turn this off."
        confirmLabel="Enable maintenance mode"
        onConfirm={() => update("maintenance_mode", true)}
      />
    </>
  )
}
