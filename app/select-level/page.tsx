"use client"

import type React from "react"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sapphy } from "@/components/sapphy"

export default function SelectLevelPage() {
  const router = useRouter()

  const handleSelectLevel = (level: "csec" | "cape") => {
    // Store the selected level in localStorage
    localStorage.setItem("selectedLevel", level)
    // Redirect to learning quiz
    router.push("/learning-quiz")
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
        </div>

        {/* Level Selection Cards */}
        <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
          {/* CSEC Card */}
          <button type="button" onClick={() => handleSelectLevel("csec")} className="lvl lvl-csec">
            <div className="lvl-art">
              <span className="lvl-shadow lvl-shadow-hop" />
              <Sapphy mood="happy" blush className="lvl-sap lvl-sap-hop relative z-[1] size-[170px]" />
              <p className="lvl-strip">Caribbean Secondary Education Certificate</p>
            </div>
            <div className="lvl-foot">
              <div className="lvl-l">
                <h2 className="lvl-t">CSEC</h2>
                <div className="lvl-pills">
                  <span className="lvl-pill">One syllabus per subject</span>
                  <span className="lvl-pill">Foundation for CAPE</span>
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
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </button>

          {/* CAPE Card */}
          <button type="button" onClick={() => handleSelectLevel("cape")} className="lvl lvl-cape">
            <div className="lvl-art">
              <span className="lvl-shadow lvl-shadow-bob" />
              <Sapphy mood="happy" className="lvl-sap lvl-sap-bob relative z-[1] size-[170px]" />
              <p className="lvl-strip">Caribbean Advanced Proficiency Examination</p>
            </div>
            <div className="lvl-foot">
              <div className="lvl-l">
                <h2 className="lvl-t">CAPE</h2>
                <div className="lvl-pills">
                  <span className="lvl-pill">Unit 1 and Unit 2 per subject</span>
                  <span className="lvl-pill">University preparation</span>
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
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  )
}
