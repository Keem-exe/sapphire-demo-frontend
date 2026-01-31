// app/quiz/take/page.tsx
"use client"

import dynamic from "next/dynamic"

// dynamic to keep it client-only
const QuizRunner = dynamic(() => import("@/components/quiz/quiz-runner"), { ssr: false })

export default function Page() {
  return <QuizRunner />
}
