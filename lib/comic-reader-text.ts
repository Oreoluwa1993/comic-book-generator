import type { ComicPanelText } from "@/lib/comic"

/** Shared reader-facing line for speech and thought (matches comic preview). */
export const formatReaderSpeechLine = (t: ComicPanelText) => {
  if (t.kind !== "speech" && t.kind !== "thought") return t.text
  const speaker = t.speaker?.trim()
  if (!speaker) return t.text
  return `${speaker}: ${t.text}`
}

const MAX_LINE_CHARS = 280

export const truncateForPdf = (s: string, max = MAX_LINE_CHARS) => {
  const t = String(s ?? "").trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
