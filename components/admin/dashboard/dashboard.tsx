"use client"

import { useState } from "react"
import {
  AiCard, AiDetails, DiagnosticsCard, DiagnosticsDetails, EngagementCard, EngagementDetails, FeaturesCard, FeaturesDetails,
  FeedbackCard, LeaderboardCard, ProgressCard, ProgressDetails, StreaksCard, StreaksDetails, StudyCard, StudyDetails, UsersCard,
} from "./cards"
import { FeedbackDrawer } from "./feedback-drawer"
import { ProfileProvider } from "./primitives"
import { StudentProfileDrawer } from "./student-profile-drawer"
import { StudentsDrawer } from "./students-drawer"

type Section = "students" | "engagement" | "streaks" | "study" | "ai" | "diagnostics" | "progress" | "features" | "feedback"

/** Cards load summaries on mount; each drawer fetches its /details only once opened. */
export function AdminDashboard() {
  const [section, setSection] = useState<Section | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [feedbackFeature, setFeedbackFeature] = useState<string | undefined>()
  const is = (s: Section) => section === s
  const onOpenChange = (s: Section) => (o: boolean) => !o && section === s && setSection(null)
  const expand = (s: Section) => () => setSection(s)

  return (
    <ProfileProvider
      value={{
        open: setProfileId,
        openFeedback: (feature) => { setFeedbackFeature(feature); setSection("feedback") },
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UsersCard onExpand={expand("students")} />
        <EngagementCard onExpand={expand("engagement")} />
        <StreaksCard onExpand={expand("streaks")} />
        <StudyCard onExpand={expand("study")} />
        <AiCard onExpand={expand("ai")} />
        <DiagnosticsCard onExpand={expand("diagnostics")} />
        <ProgressCard onExpand={expand("progress")} />
        <FeaturesCard onExpand={expand("features")} />
        <FeedbackCard onExpand={() => { setFeedbackFeature(undefined); setSection("feedback") }} />
        <LeaderboardCard />
      </div>

      <StudentsDrawer open={is("students")} onOpenChange={onOpenChange("students")} />
      <EngagementDetails open={is("engagement")} onOpenChange={onOpenChange("engagement")} />
      <StreaksDetails open={is("streaks")} onOpenChange={onOpenChange("streaks")} />
      <StudyDetails open={is("study")} onOpenChange={onOpenChange("study")} />
      <AiDetails open={is("ai")} onOpenChange={onOpenChange("ai")} />
      <DiagnosticsDetails open={is("diagnostics")} onOpenChange={onOpenChange("diagnostics")} />
      <ProgressDetails open={is("progress")} onOpenChange={onOpenChange("progress")} />
      <FeaturesDetails open={is("features")} onOpenChange={onOpenChange("features")} />
      <FeedbackDrawer open={is("feedback")} onOpenChange={onOpenChange("feedback")} initialFeature={feedbackFeature} />
      <StudentProfileDrawer id={profileId} onClose={() => setProfileId(null)} />
    </ProfileProvider>
  )
}
