"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sapphy } from "@/components/sapphy"
import { LearningStyleDialog } from "@/components/onboarding/learning-style-dialog"
import { useAuth, type Level } from "@/contexts/auth-context"

export default function SelectLevelPage() {
  const router = useRouter()
  const { user, isLoading, isDemo, updateUserLevel } = useAuth()
  const [saving, setSaving] = useState<Level | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push("/")
  }, [isLoading, user, router])

  // ?change=1 comes from the dashboard's level switch: no quiz, straight back.
  const changingLevel = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("change")

  const handleSelectLevel = async (level: Level) => {
    setError(null)
    setSaving(level)
    try {
      // Saved on the account, so the student never has to pick it again on login or another device.
      await updateUserLevel(level)
    } catch (e: any) {
      setError(e?.message || "Couldn't save your level. Please try again.")
      setSaving(null)
      return
    }
    setSaving(null)
    if (changingLevel() || (!isDemo && user?.learning_style)) {
      router.push("/dashboard")
    } else {
      setQuizOpen(true) // the learning-style quiz pops up right after the level
    }
  }

  return (
    <main className="wash-soft flex min-h-screen items-center justify-center px-4 py-14">
      <div className="doodles doodles-blue" style={{ "--dx": "-30px", "--dy": "-30px" } as React.CSSProperties} aria-hidden="true" />
      <div className="flex w-full max-w-[880px] flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Image src="/sapphire-logo.png" alt="Sapphire OS" width={166} height={56} priority className="mb-2 h-14 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 of 2</p>
          <h1 className="text-4xl font-bold leading-10">Choose your level</h1>
          <p className="text-base text-muted-foreground">Pick the exam you're preparing for. You can change it later.</p>
          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-status-danger-subtle px-4 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Level Selection Cards */}
        <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
          {/* CSEC Card */}
          <button type="button" onClick={() => handleSelectLevel("csec")} disabled={!!saving} aria-busy={saving === "csec"} className="lvl lvl-csec">
            <div className="lvl-art">
              <span className="lvl-shadow lvl-shadow-hop" />
              <Sapphy mood="happy" blush className="lvl-sap lvl-sap-hop relative z-[1] size-[170px]" />
              <p className="lvl-strip">Caribbean Secondary Education Certificate</p>
            </div>
            <div className="lvl-foot">
              <div className="lvl-l">
                <h2 className="lvl-t">CSEC</h2>
                <div className="lvl-pills">
                  <span className="lvl-pill">Mathematics</span>
                  <span className="lvl-pill">English A</span>
                </div>
              </div>
              <span className="lvl-div" />
              <div className="lvl-r">
                <div>
                  <p className="lvl-big">Forms 4–5</p>
                  <p className="lvl-cap">Secondary level</p>
                </div>
                <span className="lvl-cta lvl-cta-a">
                  Choose CSEC
                  {saving === "csec" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <ArrowUpRight className="size-3.5" aria-hidden="true" />}
                </span>
              </div>
            </div>
          </button>

          {/* CAPE Card */}
          <button type="button" onClick={() => handleSelectLevel("cape")} disabled={!!saving} aria-busy={saving === "cape"} className="lvl lvl-cape">
            <div className="lvl-art">
              <span className="lvl-shadow lvl-shadow-bob" />
              <Sapphy mood="happy" className="lvl-sap lvl-sap-bob relative z-[1] size-[170px]" />
              <p className="lvl-strip">Caribbean Advanced Proficiency Examination</p>
            </div>
            <div className="lvl-foot">
              <div className="lvl-l">
                <h2 className="lvl-t">CAPE</h2>
                <div className="lvl-pills">
                  <span className="lvl-pill">Caribbean Studies</span>
                  <span className="lvl-pill">Communication Studies</span>
                </div>
              </div>
              <span className="lvl-div" />
              <div className="lvl-r">
                <div>
                  <p className="lvl-big">Sixth Form</p>
                  <p className="lvl-cap">Lower and Upper Sixth</p>
                </div>
                <span className="lvl-cta lvl-cta-b">
                  Choose CAPE
                  {saving === "cape" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <ArrowUpRight className="size-3.5" aria-hidden="true" />}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
      <LearningStyleDialog open={quizOpen} onDone={() => router.push("/dashboard")} />
    </main>
  )
}
