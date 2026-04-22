export type ComicTone = "funny" | "serious" | "wholesome" | "mystery" | "action"

export type ComicStyleProfile = "comic" | "manga" | "anime" | "hybrid"

export type ComicPanelTextKind = "caption" | "speech" | "thought" | "sfx"

export type ComicPanelText = {
  kind: ComicPanelTextKind
  text: string
  speaker?: string
}

/** How this panel should sit in asymmetric / tiered page rows (preview + PDF). */
export type PanelLayoutIntent = "full" | "wide" | "half" | "pair-next" | "auto"

/** Narrative role for layout rhythm (establishing shot vs rapid exchange, etc.). */
export type PanelStoryBeat =
  | "establish"
  | "exchange"
  | "escalation"
  | "climax"
  | "resolution"
  | "beat"

/** Expected on-panel text density — nudges solo rows for lettering room. */
export type PanelLetteringLoad = "light" | "medium" | "heavy"

export type ComicPanel = {
  id: string
  title: string
  description: string
  /**
   * Text that appears "inside the panel" in the storyboard preview/PDF.
   * Images should NOT render text; we overlay this text in the UI.
   */
  texts: ComicPanelText[]
  /**
   * Editable choreography notes used to translate story intent into drawable panel staging.
   * This is the preferred place to edit "what should be visible" (blocking, pose, expression, camera).
   */
  stageNotes?: string
  /**
   * 3–6 micro-beats per panel. Each beat must be drawable and describe a physical action + visible effect.
   * Used to keep motion, causality, and emotion readable.
   */
  microBeats?: string[]
  /** Detailed prompt for image generation (DALL·E / image API). */
  imagePrompt: string
  /**
   * Optional draft prompt generated from stageNotes + microBeats.
   * UI shows this separately so manual imagePrompt edits are never overwritten accidentally.
   */
  draftImagePrompt?: string
  /** How this panel relates to user reference images or style notes (optional). */
  imageReferenceNotes?: string
  /** Populated after running image generation. */
  imageUrl?: string
  /** Optional: drives narrative-aware row pairing when enabled in the UI. */
  layoutIntent?: PanelLayoutIntent
  storyBeat?: PanelStoryBeat
  letteringLoad?: PanelLetteringLoad
}

export type ComicCharacterReferenceImage = {
  mime: string
  base64: string
}

export type ComicCharacter = {
  id: string
  name: string
  /**
   * Short, stable visual identifiers used to keep this character consistent across panels.
   * Example: face/hair, skin tone, age range, body type, wardrobe colors, distinctive props/marks.
   */
  description: string
  /**
   * Optional URLs the user wants the model to learn from (style/look cues).
   * These are not used directly by the image generator; they can be analyzed into text descriptors.
   */
  referenceUrls?: string[]
  /** Optional uploaded reference images (base64). */
  referenceImages?: ComicCharacterReferenceImage[]
}

export type Comic = {
  title: string
  logline: string
  tone: ComicTone
  /** Controls art-direction prompt guidance (comic vs manga/anime). */
  styleProfile?: ComicStyleProfile
  /**
   * One line of series-wide visual direction (same intent for every panel).
   * Set when generating the script so previews do not show conflicting per-panel “Reference” lines.
   */
  seriesStyleBlurb?: string
  /**
   * The exact story/premise text the user provided.
   * This is canonical input and must not be rewritten by the generator.
   */
  sourceStory: string
  /**
   * Optional user-edited character lock text that should be applied to every panel image prompt.
   * If provided, it overrides any extracted character lock from panel 1.
   */
  characterLock?: string
  /** Optional structured character designs used to build the character lock. */
  characters?: ComicCharacter[]
  panels: ComicPanel[]
}

export type GenerateComicResult =
  | { ok: true; comic: Comic }
  | { ok: false; error: string }

export type GenerateComicPanelImagesResult =
  | { ok: true; comic: Comic }
  | { ok: false; error: string }

export const MAX_PANEL_COUNT = 200

export const clampPanelCount = (panelCount: number) => {
  if (!Number.isFinite(panelCount)) return 6
  return Math.max(1, Math.min(MAX_PANEL_COUNT, Math.trunc(panelCount)))
}

/** Max reference image URLs plus uploaded files accepted per generation request. */
export const MAX_REFERENCE_FILES = 10
