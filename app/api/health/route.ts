// app/api/health/route.ts
import { NextResponse } from "next/server"
export const runtime = "edge"
export async function GET() {
  console.log("[env] GEMINI:",
    process.env.GOOGLE_GEMINI_API_KEY ? "✅ loaded" : "❌ missing"
  )
  return NextResponse.json({ ok: true })
}
