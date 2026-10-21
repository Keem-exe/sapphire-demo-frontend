const STRIPES = ["g-quiz", "g-flash", "g-cape", "g-reels"] as const

/** Brand stripe class for a subject card, picked from the subject id so it stays stable. */
export function subjectStripe(id: string): (typeof STRIPES)[number] {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return STRIPES[hash % STRIPES.length]
}
