import { embed, cosine } from "./gemini"
import type { SubjectResource } from "@/lib/store"

export type Retrieved = { resource: SubjectResource; score: number }

export async function retrieveTopK(
  query: string,
  resources: SubjectResource[],
  k = 6
): Promise<Retrieved[]> {
  if (!resources.length || !query.trim()) return []
  const qvec = await embed(query.slice(0, 4000))
  const scored: Retrieved[] = []
  for (const r of resources) {
    let rvec = r.embedding
    if (!rvec) {
      // lightweight on-the-fly embed; swap with precomputed for speed
      rvec = await embed((r.title + "\n" + r.content).slice(0, 4000))
      // If you want to cache, persist rvec in your DB here.
    }
    scored.push({ resource: r, score: cosine(qvec, rvec) })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}

export function mkContextBlock(top: Retrieved[]): string {
  if (!top.length) return "No saved subject resources found."
  return top
    .map(
      (x, i) =>
        `# [${i + 1}] ${x.resource.title}\nTags: ${x.resource.tags?.join(", ") || "-"}\n${x.resource.content}`
    )
    .join("\n\n---\n\n")
}

export function styleDirective(style: string) {
  switch (style) {
    case "visual":
      return "Use diagrams-in-text (ASCII if needed), tables, and spatial analogies."
    case "auditory":
      return "Explain like spoken teaching: rhythm, mnemonics, 'hear it this way'."
    case "readwrite":
      return "Favor clear headings, bullet points, and succinct paragraphs."
    case "kinesthetic":
      return "Add hands-on steps, simple experiments, and real-world mini-activities."
    default:
      return "Blend visuals, concise prose, and quick examples."
  }
}
