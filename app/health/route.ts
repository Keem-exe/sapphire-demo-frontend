import { NextResponse } from "next/server"
export const runtime = "edge"
export async function GET() {
  return NextResponse.json({ ok: true, service: "api", runtime: "edge" })
}
