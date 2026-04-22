import { CHARACTER_LOCK_END, CHARACTER_LOCK_START } from "@/lib/comic-generation-skills"

const collapseWhitespace = (input: string) => input.replaceAll(/\s+/g, " ").trim()

const stripCharacterLockBlock = (input: string) => {
  const raw = String(input ?? "")
  const startIdx = raw.indexOf(CHARACTER_LOCK_START)
  if (startIdx < 0) return raw.trim()

  const afterStartIdx = startIdx + CHARACTER_LOCK_START.length
  const endIdx = raw.indexOf(CHARACTER_LOCK_END, afterStartIdx)
  if (endIdx < 0) return raw.slice(0, startIdx).trim()

  const afterEndIdx = endIdx + CHARACTER_LOCK_END.length
  return `${raw.slice(0, startIdx)} ${raw.slice(afterEndIdx)}`.trim()
}

/**
 * Deterministic prompt QA:
 * - removes embedded CHARACTER LOCK blocks (we apply character locks separately)
 * - strips redundant "no text/watermark" boilerplate (renderer appends global constraints)
 * - compacts whitespace for token efficiency and consistency
 */
export const normalizePanelPromptForImageRendering = (rawPrompt: string) => {
  const withoutLock = stripCharacterLockBlock(rawPrompt)
  const withoutBoilerplate = withoutLock
    .replaceAll(/no\s+text[^.]*[.?!]?/gi, "")
    .replaceAll(/no\s+letters[^.]*[.?!]?/gi, "")
    .replaceAll(/no\s+speech\s+bubbles[^.]*[.?!]?/gi, "")
    .replaceAll(/no\s+captions[^.]*[.?!]?/gi, "")
    .replaceAll(/no\s+watermarks[^.]*[.?!]?/gi, "")
    .replaceAll(/professional\s+quality[^.]*[.?!]?/gi, "")
    .trim()

  return collapseWhitespace(withoutBoilerplate)
}

