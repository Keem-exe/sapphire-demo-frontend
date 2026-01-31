// app/quiz/take/page.tsx
import dynamic from "next/dynamic"

export const metadata = {
  title: "Take Quiz",
}

// dynamic to keep it client-only
const QuizRunner = dynamic(() => import("@/components/quiz/quiz-runner"), { ssr: false })

export default function Page() {
  return <QuizRunner />
}
