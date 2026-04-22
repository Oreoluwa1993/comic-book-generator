"use server"

import OpenAI from "openai"
import { generateImageUrlWithFallbacks } from "@/lib/image-fallback"
import { randomUUID } from "crypto"
import {
  clampPanelCount,
  MAX_PANEL_COUNT,
  MAX_REFERENCE_FILES,
  type Comic,
  type ComicCharacter,
  type ComicPanel,
  type ComicPanelText,
  type ComicStyleProfile,
  type GenerateComicPanelImagesResult,
  type GenerateComicResult,
  type PanelLayoutIntent,
  type PanelLetteringLoad,
  type PanelStoryBeat,
} from "@/lib/comic"
import {
  buildScriptSystemPrompt,
  buildScriptUserText,
  CHARACTER_LOCK_END,
  CHARACTER_LOCK_START,
  getSystemStyleGuidance,
  normalizeStyleProfile,
} from "@/lib/comic-generation-skills"
import { normalizePanelPromptForImageRendering } from "@/lib/prompt-qa"
import { buildDraftImagePromptFromChoreography } from "@/lib/panel-choreography"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { buildLayoutReviewContext } from "@/lib/layout-review/build-context"
import { tryParseJsonObject, type LayoutReviewResult, type LayoutReviewUxOutput, type LayoutReviewDevOutput } from "@/lib/layout-review/schema"

const MAX_IMAGE_PROMPT_LENGTH = 3800
const MAX_REF_FILE_BYTES = 5 * 1024 * 1024

const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

const readPromptFile = async (relativePathFromRepoRoot: string) => {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), relativePathFromRepoRoot)
  const buf = await readFile(abs)
  return buf.toString("utf8")
}

const extractAssistantText = (raw: unknown) => {
  const text = String(raw ?? "").trim()
  return text
}

const runJsonChat = async ({
  client,
  model,
  system,
  user,
  temperature,
  max_completion_tokens,
}: {
  client: OpenAI
  model: string
  system: string
  user: string
  temperature: number
  max_completion_tokens: number
}) => {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_completion_tokens,
  })
  return extractAssistantText(completion.choices[0]?.message?.content)
}

export const reviewLayout = async (): Promise<LayoutReviewResult> => {
  const enabled = (process.env.NEXT_PUBLIC_LAYOUT_REVIEW_ENABLED ?? "").trim().toLowerCase()
  if (!["1", "true", "yes", "on"].includes(enabled)) {
    return { ok: false, error: "DISABLED" }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: "MISSING_OPENAI_API_KEY" }

  try {
    const client = new OpenAI({ apiKey })
    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini"

    const jsonGuard = await readPromptFile("lib/vvs-personas/json-guard.md")
    const uxPersona = await readPromptFile("lib/vvs-personas/comic-design-ux-ui.md")
    const devPersona = await readPromptFile("lib/vvs-personas/comic-fullstack-dev.md")

    const context = await buildLayoutReviewContext(process.cwd())
    const contextJson = JSON.stringify(context, null, 2)

    const uxUser = [
      "Task: Review this app's UI layout and propose improvements.",
      "You are the UX persona. Follow your strict JSON schema.",
      "Repository context (JSON):",
      contextJson,
    ].join("\n\n")

    const uxRaw = await runJsonChat({
      client,
      model,
      system: `${jsonGuard}\n\n${uxPersona}`,
      user: uxUser,
      temperature: 0.2,
      max_completion_tokens: 2200,
    })

    if (!uxRaw) return { ok: false, error: "CALL_FAILED" }

    const uxObj = tryParseJsonObject(uxRaw)
    if (!uxObj) return { ok: false, error: "PARSE_FAILED", rawText: uxRaw }

    if (uxObj.ok === false && typeof uxObj.error === "string") {
      return { ok: false, error: "INVALID_OUTPUT_FORMAT", rawText: uxRaw }
    }

    const ux = uxObj as unknown as LayoutReviewUxOutput

    const devUser = [
      "Task: Convert UX layout review into an implementable change list for this repo.",
      "You are the Developer persona. Follow your strict JSON schema.",
      "Repository context (JSON):",
      contextJson,
      "UX output (authoritative JSON):",
      JSON.stringify(ux, null, 2),
    ].join("\n\n")

    const devRaw = await runJsonChat({
      client,
      model,
      system: `${jsonGuard}\n\n${devPersona}`,
      user: devUser,
      temperature: 0.15,
      max_completion_tokens: 2400,
    })

    if (!devRaw) return { ok: false, error: "CALL_FAILED" }

    const devObj = tryParseJsonObject(devRaw)
    if (!devObj) return { ok: false, error: "PARSE_FAILED", rawText: devRaw }

    if (devObj.ok === false && typeof devObj.error === "string") {
      return { ok: false, error: "INVALID_OUTPUT_FORMAT", rawText: devRaw }
    }

    const dev = devObj as unknown as LayoutReviewDevOutput

    return {
      ok: true,
      createdAt: new Date().toISOString(),
      ux,
      dev,
    }
  } catch (err) {
    return { ok: false, error: "CALL_FAILED", rawText: err instanceof Error ? err.message : String(err) }
  }
}

const getImageTailStyleGuidance = (styleProfile: ComicStyleProfile) => {
  const noUiArtifacts =
    "No camera UI, viewfinder, recording overlays, timestamps, coordinate readouts, scan lines, or fake grid graphics."
  const noBrandsOrRealPeople =
    "No logos, trademarks, brand names, or recognizable corporate marks. No recognizable celebrities or real private individuals."

  if (styleProfile === "manga") {
    return [
      "Manga illustration, single panel, professional quality, crisp detail, strong value design, readable silhouettes, consistent anatomy.",
      "Optional speed lines / impact framing when appropriate.",
      noUiArtifacts,
      noBrandsOrRealPeople,
    ].join(" ")
  }

  if (styleProfile === "anime") {
    return [
      "Anime keyframe-style illustration, single panel, cinematic framing, natural light, lived-in environment, professional quality, crisp detail, consistent anatomy.",
      noUiArtifacts,
      noBrandsOrRealPeople,
    ].join(" ")
  }

  if (styleProfile === "hybrid") {
    return [
      "Hybrid comic+manga illustration, single panel, professional quality, crisp detail, strong composition, readable silhouettes, consistent anatomy.",
      "Blend comic ink clarity with manga pacing and anime cinematic lighting.",
      noUiArtifacts,
      noBrandsOrRealPeople,
    ].join(" ")
  }

  return [
    "Comic book illustration, single panel, professional quality, crisp detail, strong composition, readable silhouettes, consistent anatomy.",
    noUiArtifacts,
    noBrandsOrRealPeople,
  ].join(" ")
}

/** Placed early in the compiled prompt so budget truncation does not drop lettering space before scene/action detail. */
const buildOverlaySpaceGuidance = () =>
  [
    "TEXT OVERLAYS (high priority): Reserve large, low-busy negative space for UI captions/speech — clear top band, bottom band, or side margin; avoid busy textures or critical storytelling (faces, hands, props) behind those zones.",
    "Do not render dialogue, captions, SFX lettering, handwriting, or watermarks inside the artwork.",
  ].join(" ")

/** Prepended to every panel image prompt so DALL·E keeps one coherent look across the run. */
const buildSeriesVisualLockPrefix = ({
  comicTitle,
  styleProfile,
  panelIndex,
}: {
  comicTitle: string
  styleProfile: ComicStyleProfile
  panelIndex: number
}) => {
  const safeTitle = comicTitle.trim() || "this comic"
  return [
    `VISUAL SERIES LOCK (“${safeTitle}”): Panel ${panelIndex + 1} in ONE serialized comic — not a standalone illustration.`,
    "Use the same illustrated medium, line quality, brush/ink treatment, palette temperature, and lighting philosophy in every panel.",
    "Keep recurring characters visually identical (faces, hair, skin tones, body proportions, costumes, props).",
    `Locked art direction profile: ${styleProfile.toUpperCase()} — do not drift into unrelated styles (no photorealism mixed with toon, no collage of conflicting genres).`,
    "Scene content may change; rendering style must stay consistent.",
  ].join(" ")
}

const buildFallbackComic = ({
  premise,
  tone,
  styleProfile,
  panelCount,
}: {
  premise: string
  tone: Comic["tone"]
  styleProfile: ComicStyleProfile
  panelCount: number
}): Comic => {
  const safePremise = premise.trim() || "A surprising day in a small town."
  const clampedPanelCount = clampPanelCount(panelCount)

  const panels: ComicPanel[] = Array.from({ length: clampedPanelCount }).map((_, idx) => {
    const panelNumber = idx + 1
    const description = `Visual: ${safePremise} (beat ${panelNumber}/${clampedPanelCount}).`
    const imagePromptBase =
      styleProfile === "manga"
        ? "Manga panel, dynamic framing, strong value control, expressive faces."
        : styleProfile === "anime"
          ? "Anime keyframe illustration, cinematic framing, natural light, lived-in environment."
          : styleProfile === "hybrid"
            ? "Hybrid comic+manga panel, clean readability, manga pacing beats, cinematic framing."
            : "Comic book panel, bold colors, clear composition, single scene."
    const imagePrompt = `${description} ${imagePromptBase} Leave clear negative space for text overlays. No text, no letters, no speech bubbles, no captions, no watermarks. No logos, trademarks, brand names, or recognizable corporate marks.`

    const texts: ComicPanelText[] =
      panelNumber === 1
        ? [
            { kind: "caption", text: "It starts like any other day…" },
            { kind: "speech", speaker: "Character", text: "Wait—what is that?" },
          ]
        : panelNumber === clampedPanelCount
          ? [
              { kind: "speech", speaker: "Character", text: "We did it!" },
              { kind: "caption", text: "And that’s how it ended—this time." },
            ]
          : [
              { kind: "speech", speaker: "Character", text: "This keeps getting weirder." },
              { kind: "speech", speaker: "Character", text: "Stay focused—one step at a time." },
            ]

    if (tone === "action") texts.push({ kind: "sfx", text: "WHOOSH!" })
    return {
      id: randomUUID(),
      title: `Panel ${panelNumber}`,
      description,
      texts,
      imagePrompt,
      imageReferenceNotes: undefined,
    }
  })

  return {
    title: "Untitled Comic",
    logline: safePremise,
    tone,
    styleProfile,
    sourceStory: premise,
    seriesStyleBlurb: `Single coherent ${styleProfile} look across all ${clampedPanelCount} panels — same palette, linework, and character rendering.`,
    panels,
  }
}

const parsePanelLayoutIntent = (raw: unknown): PanelLayoutIntent | undefined => {
  if (typeof raw !== "string") return undefined
  const v = raw.trim().toLowerCase().replaceAll("_", "-")
  const allowed = new Set<PanelLayoutIntent>(["full", "wide", "half", "pair-next", "auto"])
  return allowed.has(v as PanelLayoutIntent) ? (v as PanelLayoutIntent) : undefined
}

const parsePanelStoryBeat = (raw: unknown): PanelStoryBeat | undefined => {
  if (typeof raw !== "string") return undefined
  const v = raw.trim().toLowerCase().replaceAll("_", "-")
  const allowed = new Set<PanelStoryBeat>([
    "establish",
    "exchange",
    "escalation",
    "climax",
    "resolution",
    "beat",
  ])
  return allowed.has(v as PanelStoryBeat) ? (v as PanelStoryBeat) : undefined
}

const parsePanelLetteringLoad = (raw: unknown): PanelLetteringLoad | undefined => {
  if (typeof raw !== "string") return undefined
  const v = raw.trim().toLowerCase()
  const allowed = new Set<PanelLetteringLoad>(["light", "medium", "heavy"])
  return allowed.has(v as PanelLetteringLoad) ? (v as PanelLetteringLoad) : undefined
}

const tryParseComicJson = (raw: string): Omit<Comic, "sourceStory"> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const obj = parsed as Record<string, unknown>

    if (typeof obj.title !== "string") return null
    if (typeof obj.logline !== "string") return null
    if (typeof obj.tone !== "string") return null
    if (!Array.isArray(obj.panels)) return null

    const panels: ComicPanel[] = obj.panels
      .filter(Boolean)
      .map((p) => {
        if (!p || typeof p !== "object") return null
        const panel = p as Record<string, unknown>
        if (typeof panel.title !== "string") return null
        if (typeof panel.description !== "string") return null
        if (!Array.isArray(panel.texts) && !Array.isArray(panel.dialogue)) return null

        const texts: ComicPanelText[] = Array.isArray(panel.texts)
          ? panel.texts
              .filter(Boolean)
              .map((t) => {
                if (!t || typeof t !== "object") return null
                const obj = t as Record<string, unknown>
                const kind = typeof obj.kind === "string" ? obj.kind : null
                const text = typeof obj.text === "string" ? obj.text.trim() : ""
                const speaker = typeof obj.speaker === "string" ? obj.speaker.trim() : undefined
                const allowed = new Set(["caption", "speech", "thought", "sfx"])
                if (!kind || !allowed.has(kind)) return null
                if (!text) return null
                return { kind: kind as ComicPanelText["kind"], text, ...(speaker ? { speaker } : {}) } satisfies ComicPanelText
              })
              .filter((x): x is ComicPanelText => Boolean(x))
          : []

        const dialogue = Array.isArray(panel.dialogue) ? (panel.dialogue.filter((d) => typeof d === "string") as string[]) : []
        for (const line of dialogue) {
          const cleaned = String(line).trim()
          if (!cleaned) continue
          const match = cleaned.match(/^\(([^)]+)\)\s*(.+)$/)
          if (match) {
            const label = match[1].trim()
            const content = match[2].trim()
            if (!content) continue
            if (/narrat/i.test(label)) texts.push({ kind: "caption", text: content })
            else if (/sfx/i.test(label)) texts.push({ kind: "sfx", text: content })
            else texts.push({ kind: "speech", speaker: label, text: content })
            continue
          }
          texts.push({ kind: "speech", text: cleaned })
        }

        const sfx = Array.isArray(panel.sfx) ? (panel.sfx.filter((s) => typeof s === "string") as string[]) : undefined
        for (const s of sfx ?? []) {
          const cleaned = s.trim()
          if (cleaned) texts.push({ kind: "sfx", text: cleaned })
        }

        const normalizedTexts = texts.slice(0, 10)
        if (normalizedTexts.length === 0) normalizedTexts.push({ kind: "caption", text: "…" })
        const imagePrompt =
          typeof panel.imagePrompt === "string" && panel.imagePrompt.trim().length > 0
            ? panel.imagePrompt.trim()
            : `${panel.description} Comic book panel, bold colors, clear composition, single scene. Leave clear negative space for text overlays. No text, no letters, no speech bubbles, no captions, no watermarks.`
        const imageReferenceNotes =
          typeof panel.imageReferenceNotes === "string" && panel.imageReferenceNotes.trim().length > 0
            ? panel.imageReferenceNotes.trim()
            : undefined
        const stageNotes = typeof panel.stageNotes === "string" && panel.stageNotes.trim().length > 0 ? panel.stageNotes.trim() : undefined
        const microBeats = Array.isArray(panel.microBeats)
          ? (panel.microBeats.filter((b) => typeof b === "string").map((b) => b.trim()).filter(Boolean).slice(0, 8) as string[])
          : undefined
        const draftImagePrompt =
          typeof panel.draftImagePrompt === "string" && panel.draftImagePrompt.trim().length > 0
            ? panel.draftImagePrompt.trim()
            : undefined

        const layoutIntent = parsePanelLayoutIntent(panel.layoutIntent)
        const storyBeat = parsePanelStoryBeat(panel.storyBeat)
        const letteringLoad = parsePanelLetteringLoad(panel.letteringLoad)

        return {
          id: typeof panel.id === "string" ? panel.id : randomUUID(),
          title: panel.title,
          description: panel.description,
          texts: normalizedTexts,
          imagePrompt,
          ...(stageNotes ? { stageNotes } : {}),
          ...(microBeats && microBeats.length > 0 ? { microBeats } : {}),
          ...(draftImagePrompt ? { draftImagePrompt } : {}),
          ...(imageReferenceNotes ? { imageReferenceNotes } : {}),
          ...(layoutIntent ? { layoutIntent } : {}),
          ...(storyBeat ? { storyBeat } : {}),
          ...(letteringLoad ? { letteringLoad } : {}),
        } satisfies ComicPanel
      })
      .filter((p): p is ComicPanel => Boolean(p))

    if (panels.length === 0) return null

    return {
      title: obj.title,
      logline: obj.logline,
      tone: obj.tone as Comic["tone"],
      panels,
    } satisfies Omit<Comic, "sourceStory">
  } catch {
    return null
  }
}

type LoadedRefImage = { mime: string; base64: string }

type ChoreographyPanelOut = {
  id: string
  stageNotes: string
  microBeats: string[]
}

const tryParseChoreographyJson = (raw: string): { panels: ChoreographyPanelOut[] } | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.panels)) return null
    const panels = obj.panels
      .filter(Boolean)
      .map((p) => {
        if (!p || typeof p !== "object") return null
        const panel = p as Record<string, unknown>
        const id = typeof panel.id === "string" ? panel.id.trim() : ""
        const stageNotes = typeof panel.stageNotes === "string" ? panel.stageNotes.trim() : ""
        const microBeats = Array.isArray(panel.microBeats)
          ? panel.microBeats
              .filter((b) => typeof b === "string")
              .map((b) => String(b).trim())
              .filter(Boolean)
              .slice(0, 8)
          : []
        if (!id) return null
        if (!stageNotes && microBeats.length === 0) return null
        return { id, stageNotes, microBeats } satisfies ChoreographyPanelOut
      })
      .filter((x): x is ChoreographyPanelOut => Boolean(x))
    if (panels.length === 0) return null
    return { panels }
  } catch {
    return null
  }
}

const loadReferenceFromUrl = async (url: string): Promise<LoadedRefImage | null> => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_REF_FILE_BYTES) return null
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"
    if (!ALLOWED_IMAGE_MIME.has(mime)) return null
    return { mime, base64: buf.toString("base64") }
  } catch {
    return null
  }
}

const loadReferenceFiles = async (files: File[]): Promise<LoadedRefImage[]> => {
  const out: LoadedRefImage[] = []
  for (const file of files.slice(0, MAX_REFERENCE_FILES)) {
    if (!(file instanceof File) || file.size === 0) continue
    if (file.size > MAX_REF_FILE_BYTES) continue
    const mime = file.type || "image/png"
    if (!ALLOWED_IMAGE_MIME.has(mime)) continue
    const buf = Buffer.from(await file.arrayBuffer())
    out.push({ mime, base64: buf.toString("base64") })
  }
  return out
}

const sanitizeImagePrompt = (prompt: string) => prompt.replaceAll(/\s+/g, " ").trim()

type PromptSectionKey =
  | "seriesLock"
  | "characterLock"
  | "overlaySpace"
  | "styleNotes"
  | "mustRender"
  | "framing"
  | "sceneFidelity"
  | "panelDetail"
  | "tone"
  | "tail"

type PromptCompileSection = {
  key: PromptSectionKey
  label: string
  content: string
  priority: number
  minKeepChars: number
  maxChars?: number
}

type CompiledPromptDebug = {
  beforeChars: number
  afterChars: number
  truncated: boolean
  droppedSections: PromptSectionKey[]
  clippedSections: PromptSectionKey[]
  sections: Array<{ key: PromptSectionKey; beforeChars: number; afterChars: number }>
}

const getPromptDebugEnabled = () => {
  const raw = String(process.env.PROMPT_DEBUG ?? "").trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(raw)
}

const getPromptDistillEnabled = () => {
  const raw = String(process.env.OPENAI_IMAGE_PROMPT_DISTILL ?? "").trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(raw)
}

const clipToBudget = (raw: string, maxChars: number) => {
  const cleaned = sanitizeImagePrompt(raw)
  if (cleaned.length <= maxChars) return cleaned
  return cleaned.slice(0, maxChars).trim()
}

const tryExtractStructuredFields = (raw: string) => {
  const cleaned = String(raw ?? "").trim()
  if (!cleaned) return null

  const getField = (name: string) => {
    const re = new RegExp(String.raw`(?:^|\n)\s*${name}\s*:\s*([^\n]+)`, "i")
    const match = re.exec(cleaned)
    return match?.[1]?.trim() ?? null
  }

  const subjects = getField("Subjects")
  const action = getField("Action/Acting") ?? getField("Action")
  const setting = getField("Setting")
  const continuity = getField("Continuity")

  if (!subjects && !action && !setting && !continuity) return null
  return { subjects, action, setting, continuity }
}

const buildMustRenderBlock = (rawPanelPrompt: string) => {
  const extracted = tryExtractStructuredFields(rawPanelPrompt)
  if (extracted) {
    const lines = [
      extracted.subjects ? `Subjects: ${extracted.subjects}` : null,
      extracted.continuity ? `Continuity: ${extracted.continuity}` : null,
      extracted.setting ? `Setting: ${extracted.setting}` : null,
      extracted.action ? `Action: ${extracted.action}` : null,
    ].filter(Boolean)
    const compact = lines.join(" | ").trim()
    if (compact.length > 0) return compact
  }

  // Fallback: keep the first chunk (usually where the author puts key specifics).
  const cleaned = sanitizeImagePrompt(rawPanelPrompt)
  if (!cleaned) return ""
  return clipToBudget(cleaned, 700)
}

const compileBudgetedImagePrompt = (sections: PromptCompileSection[], budgetChars: number) => {
  const debug: CompiledPromptDebug = {
    beforeChars: 0,
    afterChars: 0,
    truncated: false,
    droppedSections: [],
    clippedSections: [],
    sections: [],
  }

  const normalized = sections
    .map((s) => ({
      ...s,
      content: sanitizeImagePrompt(s.content),
    }))
    .filter((s) => s.content.length > 0)
    .sort((a, b) => a.priority - b.priority)

  debug.beforeChars = normalized.reduce((sum, s) => sum + s.content.length + 1, 0)

  // First pass: reserve minimum keep for all sections.
  const kept = normalized.map((s) => {
    const beforeChars = s.content.length
    const reserved = Math.min(beforeChars, Math.max(0, s.minKeepChars))
    const minKept = reserved > 0 ? s.content.slice(0, reserved).trim() : ""
    const afterChars = minKept.length
    debug.sections.push({ key: s.key, beforeChars, afterChars })
    return { ...s, content: minKept }
  })

  let joined = kept.map((s) => s.content).filter(Boolean).join(" ").trim()
  if (joined.length <= budgetChars) {
    debug.afterChars = joined.length
    return { prompt: joined, debug }
  }

  // Second pass: drop lowest priority sections entirely until within budget.
  const byDropOrder = [...kept].sort((a, b) => b.priority - a.priority)
  const remainingKeys = new Set(kept.map((s) => s.key))
  const minKeepKeys = new Set(kept.filter((s) => s.minKeepChars > 0).map((s) => s.key))

  for (const candidate of byDropOrder) {
    if (joined.length <= budgetChars) break
    if (!remainingKeys.has(candidate.key)) continue
    if (minKeepKeys.has(candidate.key)) continue
    remainingKeys.delete(candidate.key)
    debug.droppedSections.push(candidate.key)
    joined = kept
      .filter((s) => remainingKeys.has(s.key))
      .map((s) => s.content)
      .filter(Boolean)
      .join(" ")
      .trim()
  }

  if (joined.length <= budgetChars) {
    debug.afterChars = joined.length
    debug.truncated = true
    return { prompt: joined, debug }
  }

  // Final pass: hard clip the *lowest priority kept text* while protecting mustRender.
  const protectedKeys = new Set<PromptSectionKey>(["mustRender", "characterLock", "seriesLock", "overlaySpace"])
  const keysInOrder = kept.map((s) => s.key).filter((k) => remainingKeys.has(k))
  const clipCandidates = [...keysInOrder].reverse().filter((k) => !protectedKeys.has(k))

  let final = joined
  if (final.length > budgetChars) {
    const clipped = final.slice(0, budgetChars).trim()
    final = clipped
    if (clipCandidates.length > 0) debug.clippedSections.push(clipCandidates[0])
    debug.truncated = true
  }

  debug.afterChars = final.length
  return { prompt: final, debug }
}

/**
 * Extract a reusable character consistency block from a prompt authored by the script model.
 * We keep this small and prepend it to every panel prompt during image rendering.
 */
const extractCharacterLock = (rawPrompt: string | undefined) => {
  const prompt = String(rawPrompt ?? "").trim()
  if (!prompt) return null

  const startIdx = prompt.indexOf(CHARACTER_LOCK_START)
  if (startIdx < 0) return null

  const afterStart = prompt.slice(startIdx + CHARACTER_LOCK_START.length).trim()
  if (!afterStart) return null

  const endIdx = afterStart.indexOf(CHARACTER_LOCK_END)
  const block = (endIdx >= 0 ? afterStart.slice(0, endIdx) : afterStart).trim()
  if (!block) return null

  // Keep the lock compact so it doesn't crowd out per-panel scene specifics.
  const maxChars = 900
  const compact = block.replaceAll(/\s+/g, " ").trim()
  if (compact.length <= maxChars) return compact
  return compact.slice(0, maxChars).trim()
}

const buildCharacterLockFromCharacters = (characters: ComicCharacter[] | undefined) => {
  if (!characters || characters.length === 0) return null
  const lines = characters
    .map((c) => {
      const name = c.name.trim()
      const desc = c.description.trim()
      if (!name || !desc) return null
      return `${name}: ${desc}`
    })
    .filter(Boolean)
  if (lines.length === 0) return null
  return lines.join(" ")
}

const parseCharacterLockLines = (lockBlock: string) => {
  const lines = String(lockBlock ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  return lines
    .map((line) => {
      const match = /^(.+?):\s*(.+)$/.exec(line)
      if (!match) return null
      const name = match[1]?.trim() ?? ""
      const notes = match[2]?.trim() ?? ""
      if (!name || !notes) return null
      return { name, notes }
    })
    .filter((x): x is { name: string; notes: string } => Boolean(x))
}

const buildCharacterLockFromLines = (lines: Array<{ name: string; description: string }>) => {
  const out = lines
    .map((l) => {
      const name = l.name.trim()
      const desc = l.description.trim()
      if (!name || !desc) return null
      return `${name}: ${desc}`
    })
    .filter(Boolean)
  return out.length > 0 ? out.join(" ") : null
}

export type DescribeCharacterFromReferencesInput = {
  name: string
  notes?: string
  referenceUrls?: string[]
  referenceImages?: Array<{ mime: string; base64: string }>
}

export type DescribeCharacterFromReferencesResult =
  | { ok: true; description: string }
  | { ok: false; error: string }

export const describeCharacterFromReferences = async (
  input: DescribeCharacterFromReferencesInput
): Promise<DescribeCharacterFromReferencesResult> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    const fallback = String(input.notes ?? "").trim()
    if (!fallback) return { ok: false, error: "Missing OPENAI_API_KEY and no notes provided." }
    return { ok: true, description: fallback }
  }

  const name = String(input.name ?? "").trim() || "Character"
  const notes = String(input.notes ?? "").trim()
  const urls = Array.isArray(input.referenceUrls) ? input.referenceUrls.filter((u) => typeof u === "string").slice(0, 5) : []
  const imgs = Array.isArray(input.referenceImages) ? input.referenceImages.slice(0, 5) : []

  const loadedFromUrls = await Promise.all(urls.map((u) => loadReferenceFromUrl(u)))
  const loadedRefs: LoadedRefImage[] = [
    ...loadedFromUrls.filter((x): x is LoadedRefImage => Boolean(x)),
    ...imgs
      .filter((i) => i && typeof i.mime === "string" && typeof i.base64 === "string" && i.base64.length > 0)
      .map((i) => ({ mime: i.mime, base64: i.base64 })),
  ].slice(0, 6)

  const client = new OpenAI({ apiKey })
  const visionModel = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini"

  const userParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    {
      type: "text",
      text: [
        `Character name: ${name}`,
        notes ? `User notes (authoritative): ${notes}` : null,
        "Task: Describe this character's consistent visual design in 1–2 sentences, suitable for image generation.",
        "Include stable identifiers only: face/hair, skin tone, age range, body type, wardrobe colors, distinctive props/marks.",
        "Avoid story beats, poses, camera, or scene details.",
        "Return plain text only.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ]
  for (const ref of loadedRefs) {
    userParts.push({
      type: "image_url",
      image_url: { url: `data:${ref.mime};base64,${ref.base64}` },
    })
  }

  try {
    const completion = await client.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content:
            "You are a character designer for comics. Produce a concise, consistent visual identity line for an image prompt. No markdown.",
        },
        { role: "user", content: userParts },
      ],
      temperature: 0.2,
      max_completion_tokens: 400,
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return { ok: false, error: "No description returned." }
    return { ok: true, description: text.replaceAll(/\s+/g, " ").trim() }
  } catch {
    return { ok: false, error: "Failed to analyze reference images." }
  }
}

const describeSeriesStyleFromReferences = async ({
  client,
  styleProfile,
  referenceStyleNotes,
  loadedRefs,
}: {
  client: OpenAI
  styleProfile: ComicStyleProfile
  referenceStyleNotes: string
  loadedRefs: LoadedRefImage[]
}) => {
  if (loadedRefs.length === 0) return null

  const visionModel = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini"
  const userParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    {
      type: "text",
      text: [
        `Target style profile: ${styleProfile}`,
        referenceStyleNotes.trim().length > 0 ? `User style notes (authoritative): ${referenceStyleNotes.trim()}` : null,
        "Task: Describe the VISUAL STYLE of the reference images in one compact style recipe for an image generator.",
        "Focus on: linework/inking, shading method, color palette temperature, rendering texture, lighting philosophy, lens/film feel if present, and overall era/genre.",
        "Do NOT describe specific subjects/characters/scenes. Do NOT mention logos/watermarks.",
        "Return plain text only, max 2 sentences.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ]

  for (const ref of loadedRefs.slice(0, 8)) {
    userParts.push({
      type: "image_url",
      image_url: { url: `data:${ref.mime};base64,${ref.base64}` },
    })
  }

  try {
    const completion = await client.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content: "You are an art director. Produce a compact style recipe for consistent comic panels. No markdown.",
        },
        { role: "user", content: userParts },
      ],
      temperature: 0.2,
      max_completion_tokens: 250,
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return null
    const cleaned = text.replaceAll(/\s+/g, " ").trim()
    return cleaned.length > 0 ? cleaned : null
  } catch {
    return null
  }
}

export const generateComic = async (formData: FormData): Promise<GenerateComicResult> => {
  const premise = String(formData.get("premise") ?? "").trim()
  if (!premise) return { ok: false, error: "Please enter a premise." }

  const tone = String(formData.get("tone") ?? "funny") as Comic["tone"]
  const styleProfile = normalizeStyleProfile(formData.get("styleProfile"))
  const panelCount = clampPanelCount(Number(formData.get("panelCount") ?? 6))

  const referenceUrlsRaw = String(formData.get("referenceUrls") ?? "")
  const referenceUrls = referenceUrlsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_REFERENCE_FILES)

  const referenceStyleNotes = String(formData.get("referenceStyleNotes") ?? "").trim()

  const fileList = formData.getAll("referenceFiles")
  const referenceFiles = fileList.filter((f): f is File => f instanceof File)

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return { ok: true, comic: buildFallbackComic({ premise, tone, styleProfile, panelCount }) }
  }

  try {
    const client = new OpenAI({ apiKey })

    const refFromUrls = await Promise.all(referenceUrls.map((u) => loadReferenceFromUrl(u)))
    const refFromFiles = await loadReferenceFiles(referenceFiles)
    const loadedRefs = [...refFromUrls.filter((x): x is LoadedRefImage => Boolean(x)), ...refFromFiles]

    const jsonSchema = [
      `{ "title": string, "logline": string, "tone": string,`,
      `"panels": Array<{`,
      `"id": string, "title": string, "description": string,`,
      `"texts": Array<{ "kind": "caption"|"speech"|"thought"|"sfx", "text": string, "speaker"?: string }>,`,
      `"imagePrompt": string,`,
      `"layoutIntent"?: "full"|"wide"|"half"|"pair-next"|"auto",`,
      `"storyBeat"?: "establish"|"exchange"|"escalation"|"climax"|"resolution"|"beat",`,
      `"letteringLoad"?: "light"|"medium"|"heavy",`,
      `"imageReferenceNotes"?: string`,
      `}> }`,
    ].join(" ")

    const system = buildScriptSystemPrompt({ jsonSchema, styleProfile })

    const userTextParts = buildScriptUserText({
      premise,
      tone,
      styleProfile,
      panelCount,
      referenceStyleNotes: referenceStyleNotes || undefined,
      referenceUrls,
      loadedRefCount: loadedRefs.length,
    })

    const textModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini"
    const visionModel = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini"

    const useVision = loadedRefs.length > 0 ? visionModel : textModel

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: userTextParts }]
    for (const ref of loadedRefs) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${ref.mime};base64,${ref.base64}` },
      })
    }

    const completion = await client.chat.completions.create({
      model: useVision,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.45,
      max_completion_tokens: 16384,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return { ok: true, comic: buildFallbackComic({ premise, tone, styleProfile, panelCount }) }

    const parsed = tryParseComicJson(content)
    if (!parsed) return { ok: true, comic: buildFallbackComic({ premise, tone, styleProfile, panelCount }) }

    const normalizedPanels = parsed.panels.slice(0, panelCount)
    while (normalizedPanels.length < panelCount) {
      normalizedPanels.push({
        id: randomUUID(),
        title: `Panel ${normalizedPanels.length + 1}`,
        description: `Visual: Continue the story in a coherent way.`,
        texts: [{ kind: "caption", text: "…" }],
        imagePrompt: `Continue the story visually. ${getImageTailStyleGuidance(styleProfile)} Leave clear negative space for text overlays.`,
      })
    }

    const inferredSeriesStyle = await describeSeriesStyleFromReferences({
      client,
      styleProfile,
      referenceStyleNotes,
      loadedRefs,
    })

    const seriesStyleBlurb = [
      referenceStyleNotes ? referenceStyleNotes.trim() : null,
      inferredSeriesStyle,
      `Single coherent ${styleProfile} look across all ${panelCount} panels — same palette, linework, and character rendering.`,
    ]
      .filter(Boolean)
      .join(" ")

    const panelsWithoutConflictingRefs = normalizedPanels.map((p) => ({
      ...p,
      imageReferenceNotes: undefined,
    }))

    // If the user attached reference images, distill character identity (incl. skin tone) into a global lock.
    // This is necessary because the image model only receives text prompts during rendering.
    let characterLockFromRefs: string | null = null
    const lockBlock = extractCharacterLock(panelsWithoutConflictingRefs[0]?.imagePrompt)
    if (lockBlock && loadedRefs.length > 0) {
      const parsedLines = parseCharacterLockLines(lockBlock)
      // Heuristic: only apply refs to a small cast to avoid homogenizing many characters from a single ref set.
      if (parsedLines.length > 0 && parsedLines.length <= 2) {
        const described = await Promise.all(
          parsedLines.map(async (c) => {
            const res = await describeCharacterFromReferences({
              name: c.name,
              notes: c.notes,
              referenceImages: loadedRefs.slice(0, 6),
            })
            if (!res.ok) return { name: c.name, description: c.notes }
            return { name: c.name, description: res.description }
          })
        )
        characterLockFromRefs = buildCharacterLockFromLines(described)
      }
    }

    // Choreography pass: turn story intent into drawable staging notes + micro-beats per panel.
    // This produces an editable `stageNotes`/`microBeats` layer plus a draft prompt for the UI.
    let choreographedPanels = panelsWithoutConflictingRefs
    try {
      const choreographySchema = `{ "panels": Array<{ "id": string, "stageNotes": string, "microBeats": string[] }> }`
      const choreographySystem = [
        "You are a comic panel choreographer and storyboard artist.",
        "Return ONLY valid JSON. No markdown.",
        "Use this exact schema:",
        choreographySchema,
        "Your job: convert the user's story + each panel's intent into drawable staging.",
        "Do NOT write new plot. Do NOT add new characters or locations not supported by the story/panel.",
        "For each panel, output stageNotes + microBeats that make the action readable in a still image.",
        "",
        "Choreography requirements (per panel):",
        "- stageNotes: concise but specific. Include blocking (left/right/foreground), key pose, facial expression/gesture, camera/shot, and 2–4 continuity anchors in the setting.",
        "- microBeats: 3–6 bullets. Each bullet must be drawable and in the form: Subject + physical action + visible effect.",
        "- Make motion and causality visible (weight shift, contact, recoil, impact, gaze shift, hand position, object movement).",
        "- Emotion must be visible: brows/eyes/mouth + shoulders/hands posture (avoid vague 'angry/sad').",
        "- Prioritize silhouette clarity and one primary action per panel.",
        "- Maintain geography/continuity across adjacent panels (left/right, props-in-hand, lighting direction) unless the panel intentionally resets (then state it).",
        "- Keep negative space available for text overlays (top/bottom/side).",
        "",
        "Style guidance:",
        getSystemStyleGuidance(styleProfile),
      ].join("\n")

      const choreographyUser = [
        "Story (authoritative, unchanged):",
        premise,
        "",
        "Panels (authoritative intent; do not rewrite dialogue):",
        JSON.stringify(
          {
            title: parsed.title,
            tone,
            styleProfile,
            panels: panelsWithoutConflictingRefs.map((p, idx) => ({
              id: p.id,
              index: idx + 1,
              title: p.title,
              description: p.description,
              texts: p.texts,
              imagePrompt: p.imagePrompt,
            })),
          },
          null,
          2
        ),
        "",
        "Output stageNotes + microBeats for EVERY panel id above.",
      ].join("\n")

      const choreographyRaw = await runJsonChat({
        client,
        model: textModel,
        system: choreographySystem,
        user: choreographyUser,
        temperature: 0.25,
        max_completion_tokens: 2600,
      })

      const choreography = choreographyRaw ? tryParseChoreographyJson(choreographyRaw) : null
      if (choreography) {
        const byId = new Map(choreography.panels.map((p) => [p.id, p]))
        choreographedPanels = panelsWithoutConflictingRefs.map((p) => {
          const hit = byId.get(p.id)
          if (!hit) return p
          const draft = buildDraftImagePromptFromChoreography({
            stageNotes: hit.stageNotes,
            microBeats: hit.microBeats,
          })
          return {
            ...p,
            stageNotes: hit.stageNotes,
            microBeats: hit.microBeats,
            draftImagePrompt: draft.length > 0 ? draft : undefined,
          }
        })
      }
    } catch {
      // Non-fatal: keep the original panels if choreography fails.
    }

    return {
      ok: true,
      comic: {
        ...parsed,
        tone,
        styleProfile,
        sourceStory: premise,
        seriesStyleBlurb,
        ...(characterLockFromRefs ? { characterLock: characterLockFromRefs } : {}),
        panels: choreographedPanels,
      },
    }
  } catch {
    return {
      ok: true,
      comic: buildFallbackComic({ premise, tone, styleProfile, panelCount }),
    }
  }
}

export type ContinueComicResult =
  | { ok: true; comic: Comic }
  | { ok: false; error: string }

export const continueComic = async (input: {
  comic: Comic
  additionalPanelCount: number
  continuationPrompt?: string
}): Promise<ContinueComicResult> => {
  try {
    const existingComic = input.comic
    if (!existingComic || !Array.isArray(existingComic.panels) || existingComic.panels.length === 0) {
      return { ok: false, error: "Nothing to continue yet — generate a comic script first." }
    }

    const requested = Number(input.additionalPanelCount)
    if (!Number.isFinite(requested)) return { ok: false, error: "Additional panel count must be a number." }

    const remainingBudget = Math.max(0, MAX_PANEL_COUNT - existingComic.panels.length)
    const toAdd = Math.max(1, Math.min(remainingBudget, Math.trunc(requested)))
    if (toAdd <= 0) {
      return { ok: false, error: `Panel limit reached (${MAX_PANEL_COUNT}). Create a new project/issue to go longer.` }
    }

    const styleProfile = normalizeStyleProfile(existingComic.styleProfile)
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      const fallbackPanels: ComicPanel[] = Array.from({ length: toAdd }).map((_, idx) => {
        const panelNumber = existingComic.panels.length + idx + 1
        return {
          id: randomUUID(),
          title: `Panel ${panelNumber}`,
          description: "Visual: Continue the story in a coherent way from the previous panels.",
          texts: [{ kind: "caption", text: "…" }],
          imagePrompt: [
            `Panel ${panelNumber}: Continue the story coherently from previous panels.`,
            getImageTailStyleGuidance(styleProfile),
            "Leave clear negative space for text overlays.",
          ].join(" "),
        }
      })
      return { ok: true, comic: { ...existingComic, styleProfile, panels: [...existingComic.panels, ...fallbackPanels] } }
    }

    const client = new OpenAI({ apiKey })

    const jsonSchema = [
      `{ "panels": Array<{`,
      `"id": string, "title": string, "description": string,`,
      `"texts": Array<{ "kind": "caption"|"speech"|"thought"|"sfx", "text": string, "speaker"?: string }>,`,
      `"imagePrompt": string,`,
      `"layoutIntent"?: "full"|"wide"|"half"|"pair-next"|"auto",`,
      `"storyBeat"?: "establish"|"exchange"|"escalation"|"climax"|"resolution"|"beat",`,
      `"letteringLoad"?: "light"|"medium"|"heavy",`,
      `"imageReferenceNotes"?: string`,
      `}> }`,
    ].join(" ")

    const system = [
      "You are a comic book writer and panel director.",
      "Return ONLY valid JSON. No markdown.",
      "You must follow this schema exactly:",
      jsonSchema,
      "",
      "Task: Append NEW panels that continue the existing story and tone.",
      `You will generate exactly ${toAdd} new panels.`,
      "Do NOT rewrite earlier panels. Do NOT change existing characters' identities.",
      "Keep the story coherent and escalate/resolve naturally based on what came before.",
      "",
      "Image prompt rules:",
      "- The imagePrompt must be self-contained and drawable as a still frame.",
      "- Do not include dialogue text or lettering to be rendered.",
      "- Reserve negative space for overlays.",
      "",
      "Style guidance:",
      getSystemStyleGuidance(styleProfile),
    ].join("\n")

    const continuationText = String(input.continuationPrompt ?? "").trim()
    const recentCount = Math.min(8, existingComic.panels.length)
    const lastPanels = existingComic.panels.slice(-recentCount).map((p, idx) => ({
      index: existingComic.panels.length - recentCount + idx + 1,
      title: p.title,
      description: p.description,
      texts: p.texts,
      stageNotes: p.stageNotes ?? null,
      microBeats: p.microBeats ?? null,
    }))

    const user = [
      "Existing comic (authoritative context):",
      JSON.stringify(
        {
          title: existingComic.title,
          logline: existingComic.logline,
          tone: existingComic.tone,
          styleProfile,
          seriesStyleBlurb: existingComic.seriesStyleBlurb ?? null,
          characterLock: existingComic.characterLock ?? null,
          sourceStory: existingComic.sourceStory,
        },
        null,
        2
      ),
      "",
      "Most recent panels (authoritative; continue from here):",
      JSON.stringify({ panels: lastPanels }, null, 2),
      "",
      continuationText.length > 0 ? `User continuation note (authoritative): ${continuationText}` : null,
      "",
      `Output exactly ${toAdd} NEW panels in JSON.`,
    ]
      .filter(Boolean)
      .join("\n")

    const textModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini"
    const completion = await client.chat.completions.create({
      model: textModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      max_completion_tokens: 8192,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return { ok: false, error: "Continuation failed: empty model response." }

    const parsed = tryParseJsonObject(content) as { panels?: unknown } | null
    const rawPanels = parsed && Array.isArray(parsed.panels) ? (parsed.panels as unknown[]) : null
    if (!rawPanels) return { ok: false, error: "Continuation failed: could not parse panels JSON." }

    const nextPanels: ComicPanel[] = rawPanels.slice(0, toAdd).map((p, idx) => {
      const obj = (p ?? {}) as Record<string, unknown>
      const title = String(obj.title ?? "").trim() || `Panel ${existingComic.panels.length + idx + 1}`
      const description = String(obj.description ?? "").trim() || "Visual: Continue the story in a coherent way."
      const imagePrompt = String(obj.imagePrompt ?? "").trim() || `${description} ${getImageTailStyleGuidance(styleProfile)}`

      const textsRaw = Array.isArray(obj.texts) ? (obj.texts as unknown[]) : []
      const texts: ComicPanelText[] = textsRaw
        .map((t) => {
          if (!t || typeof t !== "object") return null
          const tt = t as Record<string, unknown>
          const kind = String(tt.kind ?? "").trim() as ComicPanelText["kind"]
          const text = String(tt.text ?? "").trim()
          const speaker = typeof tt.speaker === "string" ? tt.speaker.trim() : undefined
          const allowed = new Set<ComicPanelText["kind"]>(["caption", "speech", "thought", "sfx"])
          if (!allowed.has(kind) || !text) return null
          return speaker && speaker.length > 0 ? { kind, text, speaker } : { kind, text }
        })
        .filter(Boolean) as ComicPanelText[]

      const layoutIntentRaw = typeof obj.layoutIntent === "string" ? obj.layoutIntent.trim() : undefined
      const layoutIntentAllowed = new Set<PanelLayoutIntent>(["full", "wide", "half", "pair-next", "auto"])
      const layoutIntent = layoutIntentAllowed.has(layoutIntentRaw as PanelLayoutIntent)
        ? (layoutIntentRaw as PanelLayoutIntent)
        : undefined

      const storyBeatRaw = typeof obj.storyBeat === "string" ? obj.storyBeat.trim() : undefined
      const storyBeatAllowed = new Set<PanelStoryBeat>([
        "establish",
        "exchange",
        "escalation",
        "climax",
        "resolution",
        "beat",
      ])
      const storyBeat = storyBeatAllowed.has(storyBeatRaw as PanelStoryBeat) ? (storyBeatRaw as PanelStoryBeat) : undefined

      const letteringLoadRaw = typeof obj.letteringLoad === "string" ? obj.letteringLoad.trim() : undefined
      const letteringLoadAllowed = new Set<PanelLetteringLoad>(["light", "medium", "heavy"])
      const letteringLoad = letteringLoadAllowed.has(letteringLoadRaw as PanelLetteringLoad)
        ? (letteringLoadRaw as PanelLetteringLoad)
        : undefined

      const imageReferenceNotes =
        typeof obj.imageReferenceNotes === "string" && obj.imageReferenceNotes.trim().length > 0
          ? obj.imageReferenceNotes.trim()
          : undefined

      return {
        id: randomUUID(),
        title,
        description,
        texts,
        imagePrompt,
        layoutIntent,
        storyBeat,
        letteringLoad,
        imageReferenceNotes,
      }
    })

    return {
      ok: true,
      comic: {
        ...existingComic,
        styleProfile,
        panels: [...existingComic.panels, ...nextPanels],
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to continue comic." }
  }
}

const DALLE3_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"])

const resolveImageSize = (model: string, raw: string | undefined) => {
  const trimmed = typeof raw === "string" ? raw.trim() : ""
  const explicit = trimmed.length > 0 ? trimmed : undefined

  if (model.includes("gpt-image") || model.includes("chatgpt-image")) {
    const gptSizes = new Set(["auto", "1024x1024", "1536x1024", "1024x1536"])
    return gptSizes.has(explicit ?? "") ? (explicit as "auto" | "1024x1024" | "1536x1024" | "1024x1536") : "1024x1024"
  }
  const isDalle3 = model.includes("dall-e-3") || model.includes("dalle-3")
  if (isDalle3) {
    if (explicit && DALLE3_SIZES.has(explicit)) return explicit as "1024x1024" | "1792x1024" | "1024x1792"
    // Wide landscape matches comic panel previews better than square (less vertical cropping in UI).
    return "1792x1024"
  }
  if (explicit && DALLE3_SIZES.has(explicit)) return explicit as "1024x1024" | "1792x1024" | "1024x1792"
  return "1024x1024"
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const getImageRetryConfig = () => {
  const rawMax = Number(process.env.OPENAI_IMAGE_MAX_RETRIES ?? "4")
  const maxAttempts = Number.isFinite(rawMax) ? Math.max(1, Math.min(8, Math.floor(rawMax))) : 4
  const rawBase = Number(process.env.OPENAI_IMAGE_RETRY_BASE_MS ?? "900")
  const baseMs = Number.isFinite(rawBase) ? Math.max(200, Math.min(5000, rawBase)) : 900
  return { maxAttempts, baseMs }
}

const backoffMsForImageAttempt = (attemptIndex: number, baseMs: number, message: string) => {
  const isRateOrTimeout = /429|rate|timeout|timed out|overloaded|503|529/i.test(message)
  const exp = baseMs * Math.pow(2, attemptIndex)
  const capped = Math.min(isRateOrTimeout ? 25000 : 12000, exp)
  return capped
}

type OpenAiImageSize =
  | "1024x1024"
  | "1792x1024"
  | "1024x1792"
  | "auto"
  | "1536x1024"
  | "1024x1536"

const generatePanelImageUrl = async (input: {
  client: OpenAI
  imageModel: string
  size: OpenAiImageSize
  finalPrompt: string
}): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> => {
  const { maxAttempts, baseMs } = getImageRetryConfig()
  let lastMessage = "Image generation failed."

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await generateImageUrlWithFallbacks({
        openaiClient: input.client,
        openaiModel: input.imageModel,
        openaiSize: input.size,
        prompt: input.finalPrompt,
      })
      if (res.ok) return { ok: true, imageUrl: res.imageUrl }
      lastMessage = res.error
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err)
    }

    if (attempt < maxAttempts - 1) {
      await sleep(backoffMsForImageAttempt(attempt, baseMs, lastMessage))
    }
  }

  return {
    ok: false,
    error: `Image generation failed after ${maxAttempts} attempt(s). ${lastMessage}`,
  }
}

const buildPanelImagePrompt = (input: {
  comic: Comic
  styleProfile: ComicStyleProfile
  panelIdx: number
  globalCharacterLock: string | null | undefined
}) => {
  const panel = input.comic.panels[input.panelIdx]
  const basePrompt = sanitizeImagePrompt(normalizePanelPromptForImageRendering(panel.imagePrompt || panel.description))
  const seriesLock = buildSeriesVisualLockPrefix({
    comicTitle: input.comic.title,
    styleProfile: input.styleProfile,
    panelIndex: input.panelIdx,
  })
  const styleNotes =
    input.comic.seriesStyleBlurb && input.comic.seriesStyleBlurb.trim().length > 0
      ? `Series style (apply everywhere): ${input.comic.seriesStyleBlurb.trim()}`
      : null
  const characterLock =
    input.globalCharacterLock && input.globalCharacterLock.length > 0
      ? `AUTHORITATIVE CHARACTER LOCK (match exactly; do not deviate): ${input.globalCharacterLock}`
      : null

  const mustRender = buildMustRenderBlock(basePrompt)

  const sections: PromptCompileSection[] = [
    { key: "seriesLock", label: "seriesLock", content: seriesLock, priority: 10, minKeepChars: 220 },
    { key: "characterLock", label: "characterLock", content: characterLock ?? "", priority: 20, minKeepChars: 280, maxChars: 950 },
    { key: "overlaySpace", label: "overlaySpace", content: buildOverlaySpaceGuidance(), priority: 25, minKeepChars: 200, maxChars: 420 },
    { key: "styleNotes", label: "styleNotes", content: styleNotes ?? "", priority: 30, minKeepChars: 0, maxChars: 420 },
    {
      key: "framing",
      label: "framing",
      content:
        "Framing (must): Keep full heads, hair, and faces inside the frame — do not crop faces at the top or bottom edge. Leave comfortable headroom in medium/wide shots; pull the camera back slightly if the composition is tight.",
      priority: 35,
      minKeepChars: 120,
      maxChars: 320,
    },
    {
      key: "sceneFidelity",
      label: "sceneFidelity",
      content:
        "Scene fidelity: If a detail is not stated in MUST RENDER or Panel details, do not invent it. No unrelated objects, vehicles, or environments.",
      priority: 40,
      minKeepChars: 120,
      maxChars: 260,
    },
    {
      key: "mustRender",
      label: "mustRender",
      content: mustRender ? `MUST RENDER (scene & action): ${mustRender}` : "",
      priority: 50,
      minKeepChars: 400,
      maxChars: 900,
    },
    {
      key: "panelDetail",
      label: "panelDetail",
      content: basePrompt ? `Panel details: ${basePrompt}` : "",
      priority: 60,
      minKeepChars: 200,
      maxChars: 1500,
    },
    { key: "tone", label: "tone", content: `Tone: ${input.comic.tone}.`, priority: 70, minKeepChars: 0, maxChars: 60 },
    { key: "tail", label: "tail", content: getImageTailStyleGuidance(input.styleProfile), priority: 80, minKeepChars: 160, maxChars: 650 },
  ]

  const cappedSections = sections.map((s) => (s.maxChars ? { ...s, content: clipToBudget(s.content, s.maxChars) } : s))
  const compiled = compileBudgetedImagePrompt(cappedSections, MAX_IMAGE_PROMPT_LENGTH)

  if (getPromptDebugEnabled() && compiled.debug.truncated) {
    console.warn("[prompt-debug] image prompt truncated", {
      panelIdx: input.panelIdx,
      panelTitle: panel.title,
      beforeChars: compiled.debug.beforeChars,
      afterChars: compiled.debug.afterChars,
      droppedSections: compiled.debug.droppedSections,
      clippedSections: compiled.debug.clippedSections,
    })
  }

  return compiled.prompt
}

const distillPanelPromptForImage = async ({
  client,
  model,
  styleProfile,
  tone,
  panelTitle,
  panelDescription,
  rawPanelPrompt,
}: {
  client: OpenAI
  model: string
  styleProfile: ComicStyleProfile
  tone: Comic["tone"]
  panelTitle: string
  panelDescription: string
  rawPanelPrompt: string
}) => {
  const system = [
    "You are a prompt distiller for comic panel image generation.",
    "Goal: compress the panel prompt into a short, high-salience scene spec that preserves fidelity.",
    "Rules:",
    "- Keep ONLY concrete visual facts: subjects, continuity/wardrobe, negative space for text, setting, camera, lighting, then action.",
    "- Do NOT add new story elements. Do NOT invent objects/locations/characters.",
    "- Prefer specifics over adjectives. Avoid generic quality/style boilerplate.",
    "- If you must shorten, trim Action first, then Setting/Camera — never drop Continuity or NegativeSpace.",
    "- Output plain text only. Max 900 characters.",
    "Output format (single paragraph, keep labels):",
    "Subjects: ... | Continuity: ... | NegativeSpace: ... | Setting: ... | Camera: ... | Lighting: ... | Action: ...",
  ].join("\n")

  const user = [
    `Style profile: ${styleProfile}`,
    `Tone: ${tone}`,
    `Panel title: ${panelTitle}`,
    `Panel description: ${panelDescription}`,
    "Raw panel prompt (authoritative; distill, do not rewrite):",
    rawPanelPrompt,
  ].join("\n\n")

  const distilled = await runJsonChat({
    client,
    model,
    system,
    user,
    temperature: 0.15,
    max_completion_tokens: 260,
  })

  const cleaned = sanitizeImagePrompt(distilled)
  if (!cleaned) return null
  return clipToBudget(cleaned, 900)
}

export const generateComicPanelImages = async (comic: Comic): Promise<GenerateComicPanelImagesResult> => {
  if (!comic.panels.length) return { ok: false, error: "No panels to render." }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3"
  const size = resolveImageSize(imageModel, process.env.OPENAI_IMAGE_SIZE)

  if (!apiKey) {
    return { ok: false, error: "Missing OPENAI_API_KEY. Add it to your environment to generate panel images." }
  }

  const client = new OpenAI({ apiKey })

  const panelsOut: ComicPanel[] = Array.from({ length: comic.panels.length })
  const styleProfile = normalizeStyleProfile(comic.styleProfile)
  const overrideLock = String(comic.characterLock ?? "").trim()
  const lockFromCharacters = buildCharacterLockFromCharacters(comic.characters)
  const lockFromPanelOne = extractCharacterLock(comic.panels[0]?.imagePrompt)
  const globalCharacterLock = overrideLock || lockFromCharacters || lockFromPanelOne

  const rawConcurrency = Number(process.env.OPENAI_IMAGE_CONCURRENCY ?? "3")
  const maxConcurrency = Number.isFinite(rawConcurrency) ? Math.max(1, Math.min(3, Math.floor(rawConcurrency))) : 3

  const renderOnePanel = async (panelIdx: number): Promise<ComicPanel> => {
    const panel = comic.panels[panelIdx]
    const textModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini"

    let workingComic = comic
    const shouldDistill =
      Boolean(client) &&
      getPromptDistillEnabled() &&
      sanitizeImagePrompt(panel.imagePrompt || "").length > 1600

    if (client && shouldDistill) {
      try {
        const distilled = await distillPanelPromptForImage({
          client,
          model: textModel,
          styleProfile,
          tone: comic.tone,
          panelTitle: panel.title,
          panelDescription: panel.description,
          rawPanelPrompt: panel.imagePrompt || panel.description,
        })
        if (distilled) {
          workingComic = {
            ...comic,
            panels: comic.panels.map((p, idx) => (idx === panelIdx ? { ...p, imagePrompt: distilled } : p)),
          }
        }
      } catch {
        // If distillation fails, fall back to original prompt.
      }
    }

    const finalPrompt = buildPanelImagePrompt({
      comic: workingComic,
      styleProfile,
      panelIdx,
      globalCharacterLock,
    })

    const generated = await generatePanelImageUrl({
      client,
      imageModel,
      size: size as OpenAiImageSize,
      finalPrompt,
    })
    if (generated.ok) return { ...panel, imageUrl: generated.imageUrl }
    throw new Error(generated.error)
  }

  const batchStaggerRaw = Number(process.env.OPENAI_IMAGE_BATCH_STAGGER_MS ?? "0")
  const batchStaggerMs = Number.isFinite(batchStaggerRaw) ? Math.max(0, Math.min(15000, batchStaggerRaw)) : 0

  for (let startIdx = 0; startIdx < comic.panels.length; startIdx += maxConcurrency) {
    if (startIdx > 0 && batchStaggerMs > 0) {
      await sleep(batchStaggerMs)
    }
    const batch = Array.from({ length: Math.min(maxConcurrency, comic.panels.length - startIdx) }).map(
      (_, offset) => startIdx + offset
    )

    const batchResults = await Promise.allSettled(batch.map((idx) => renderOnePanel(idx)))
    for (let i = 0; i < batch.length; i++) {
      const idx = batch[i]!
      const res = batchResults[i]
      if (res.status !== "fulfilled") {
        return { ok: false, error: `Image generation failed for panel ${comic.panels[idx]!.id}.` }
      }
      panelsOut[idx] = res.value
    }
  }

  return { ok: true, comic: { ...comic, panels: panelsOut } }
}

export type GenerateSinglePanelImageResult =
  | { ok: true; panelId: string; imageUrl: string }
  | { ok: false; error: string }

export const generateComicSinglePanelImage = async (comic: Comic, panelId: string): Promise<GenerateSinglePanelImageResult> => {
  const targetPanelId = String(panelId ?? "").trim()
  if (!targetPanelId) return { ok: false, error: "Missing panel id." }

  const panelIdx = comic.panels.findIndex((p) => p.id === targetPanelId)
  if (panelIdx < 0) return { ok: false, error: "Panel not found." }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3"
  const size = resolveImageSize(imageModel, process.env.OPENAI_IMAGE_SIZE)

  if (!apiKey) {
    return { ok: false, error: "Missing OPENAI_API_KEY. Add it to your environment to generate panel images." }
  }

  const client = new OpenAI({ apiKey })

  const styleProfile = normalizeStyleProfile(comic.styleProfile)
  const overrideLock = String(comic.characterLock ?? "").trim()
  const lockFromCharacters = buildCharacterLockFromCharacters(comic.characters)
  const lockFromPanelOne = extractCharacterLock(comic.panels[0]?.imagePrompt)
  const globalCharacterLock = overrideLock || lockFromCharacters || lockFromPanelOne

  const panel = comic.panels[panelIdx]
  const textModel = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini"
  let workingComic = comic
  const shouldDistill =
    Boolean(client) &&
    getPromptDistillEnabled() &&
    sanitizeImagePrompt(panel.imagePrompt || "").length > 1600

  if (client && shouldDistill) {
    try {
      const distilled = await distillPanelPromptForImage({
        client,
        model: textModel,
        styleProfile,
        tone: comic.tone,
        panelTitle: panel.title,
        panelDescription: panel.description,
        rawPanelPrompt: panel.imagePrompt || panel.description,
      })
      if (distilled) {
        workingComic = {
          ...comic,
          panels: comic.panels.map((p, idx) => (idx === panelIdx ? { ...p, imagePrompt: distilled } : p)),
        }
      }
    } catch {
      // fall back to original
    }
  }

  const finalPrompt = buildPanelImagePrompt({
    comic: workingComic,
    styleProfile,
    panelIdx,
    globalCharacterLock,
  })

  const generated = await generatePanelImageUrl({
    client,
    imageModel,
    size: size as OpenAiImageSize,
    finalPrompt,
  })
  if (generated.ok) return { ok: true, panelId: targetPanelId, imageUrl: generated.imageUrl }
  return {
    ok: false,
    error: `${generated.error} Check OPENAI_API_KEY, rate limits, and OPENAI_IMAGE_MODEL; then retry.`,
  }
}

const isAllowedPdfImageEmbedHost = (hostname: string) => {
  if (hostname.endsWith(".blob.core.windows.net")) return true
  if (hostname.endsWith(".supabase.co")) return true
  return false
}

export type EmbedImageUrlForPdfResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string }

/**
 * Fetches a remote panel image on the server and returns a data URL for @react-pdf.
 * Browser fetch() to OpenAI blob URLs often fails CORS, which leaves remote URLs in state;
 * react-pdf then cannot embed them and images render blank in the PDF.
 */
export const embedImageUrlForPdf = async (imageUrl: string): Promise<EmbedImageUrlForPdfResult> => {
  const raw = String(imageUrl ?? "").trim()
  if (raw.startsWith("data:")) {
    return { ok: true, dataUrl: raw }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: "Invalid image URL." }
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Only HTTPS image URLs can be embedded for PDF export." }
  }

  if (!isAllowedPdfImageEmbedHost(url.hostname)) {
    return { ok: false, error: "PDF export does not allow this image host." }
  }

  try {
    const res = await fetch(raw, { cache: "no-store", redirect: "follow" })
    if (!res.ok) {
      return { ok: false, error: `Image fetch failed (${res.status}).` }
    }

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      return { ok: false, error: "Empty image response." }
    }

    const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim()
    const mime =
      headerMime && headerMime.startsWith("image/") ? headerMime : "image/png"
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    return { ok: true, dataUrl: `data:${mime};base64,${base64}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Image fetch failed.",
    }
  }
}

export type SupabasePingResult =
  | { ok: true; userId: string | null }
  | { ok: false; error: string }

export const supabasePing = async (): Promise<SupabasePingResult> => {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) return { ok: false, error: error.message }
    return { ok: true, userId: data.user?.id ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Supabase ping failed." }
  }
}
