"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// The learning-style quiz now pops up during onboarding (right after choosing a level) and on the
// dashboard for anyone who hasn't taken it, so this old standalone page just forwards there.
export default function LearningQuizRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard")
  }, [router])
  return null
}
