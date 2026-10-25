"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { normalizeSubjectId } from "@/lib/data/subjects"

// Both CAPE subjects Sapphire offers (Caribbean Studies, Communication Studies) are single-unit,
// so old /workspace/<subject>/unit-N links open the subject workspace.
export default function UnitRedirect() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/workspace/${normalizeSubjectId(String(params.subjectId || ""))}`)
  }, [params.subjectId, router])
  return null
}
