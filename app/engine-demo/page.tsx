"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LearningEngineDemo } from "@/components/learning-engine-demo"

// Admin-only: an experimental, browser-side engine running on a fixed demo profile, not the
// student's real data. Everyone else is sent back to their dashboard.
export default function EngineDemoPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const isAdmin = user?.accountType === "admin"

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace("/")
    else if (!isAdmin) router.replace("/dashboard")
  }, [isLoading, user, isAdmin, router])

  if (!isAdmin) return null
  return <LearningEngineDemo />
}
