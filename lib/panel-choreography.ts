import { normalizePanelPromptForImageRendering } from "@/lib/prompt-qa"

export type PanelChoreographyInput = {
  stageNotes?: string
  microBeats?: string[]
}

const cleanLine = (raw: string) => String(raw ?? "").replaceAll(/\s+/g, " ").trim()

const toBulletBlock = (lines: string[], prefix: string) => {
  const cleaned = lines.map(cleanLine).filter(Boolean)
  if (cleaned.length === 0) return null
  return `${prefix}\n- ${cleaned.join("\n- ")}`
}

/**
 * Deterministic synthesis: converts editable choreography notes into a single image prompt draft.
 * This does not add any "global boilerplate" (no-text/watermark), because the renderer appends it.
 */
export const buildDraftImagePromptFromChoreography = (input: PanelChoreographyInput) => {
  const stageNotes = cleanLine(input.stageNotes ?? "")
  const microBeats = Array.isArray(input.microBeats) ? input.microBeats : []

  const beatsBlock = toBulletBlock(microBeats, "Micro-beats (drawable actions):")

  const combined = [stageNotes.length > 0 ? `Stage notes: ${stageNotes}` : null, beatsBlock]
    .filter(Boolean)
    .join("\n\n")
    .trim()

  if (!combined) return ""
  return normalizePanelPromptForImageRendering(combined)
}

