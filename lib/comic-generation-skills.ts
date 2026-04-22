import type { ComicStyleProfile, ComicTone } from "@/lib/comic"

export const CHARACTER_LOCK_START = "CHARACTER LOCK:"
export const CHARACTER_LOCK_END = "END CHARACTER LOCK"

export const normalizeStyleProfile = (raw: unknown): ComicStyleProfile => {
  const value = String(raw ?? "comic").trim().toLowerCase()
  const allowed = new Set<ComicStyleProfile>(["comic", "manga", "anime", "hybrid"])
  return allowed.has(value as ComicStyleProfile) ? (value as ComicStyleProfile) : "comic"
}

export const getSystemStyleGuidance = (styleProfile: ComicStyleProfile) => {
  if (styleProfile === "comic") {
    return [
      "Style profile: COMIC.",
      "Art-direction craft targets: Marvel-style readability and bold staging; Dark Horse mood/atmosphere and cinematic restraint.",
      "Editing targets: Watchmen-era panel discipline (motifs, parallelism, precise cause/effect) + sophisticated voice (avoid cliché).",
      "Pacing targets: character-forward escalation (Invincible-like clarity) and occasional lyrical restraint (Gaiman-like economy) when the story calls for it.",
    ].join("\n")
  }

  if (styleProfile === "manga") {
    return [
      "Style profile: MANGA.",
      "Art-direction craft targets: manga panel language — strong silhouettes, value control, expressive faces, clear motion arcs, impact framing, and decompressed silent beats when emotion needs room.",
      "Keep backgrounds purposeful: establish geography early, then simplify to protect readability and balloon space.",
      "Maintain clean shot progression and visual punctuation (holds/cuts) like well-edited anime storyboards, without turning panels into still portraits.",
    ].join("\n")
  }

  if (styleProfile === "anime") {
    return [
      "Style profile: ANIME.",
      "Art-direction craft targets: cinematic shot progression (establishing → medium → close), clear staging, and animation-keyframe clarity.",
      "Studio Ghibli-level sensibility when appropriate: lived-in environments, natural light, grounded palettes with purposeful accents, quiet routine beats, and nature/scale used as emotion (wind/trees/sky/water).",
      "Keep text density low when the image carries mood; use silence as pacing.",
    ].join("\n")
  }

  return [
    "Style profile: HYBRID (COMIC + MANGA/ANIME).",
    "Blend comic readability (bold staging, iconic silhouettes) with manga pacing (decompressed beats, expressive acting) and anime cinematics (shot progression, mood lighting).",
    "Enforce clarity: every panel has one primary story function and a single focal point; reduce background detail when dialogue increases.",
  ].join("\n")
}

export const buildScriptSystemPrompt = ({
  jsonSchema,
  styleProfile,
}: {
  jsonSchema: string
  styleProfile: ComicStyleProfile
}) => {
  return [
    "You are a comic book script editor and visual director.",
    "Return ONLY valid JSON. No markdown.",
    "Use this exact schema:",
    jsonSchema,
    "Story source: The user field may be a short premise or a complete story, outline, or script. If it is long, scene-based, or reads like finished prose, treat it as canonical.",
    "Follow that narrative faithfully: keep plot order, named characters, stakes, and voice. Do not replace it with a simpler or generic version.",
    "You may only tighten or sharpen for comics (panel breaks, pacing, shorter dialogue balloons) and add small connective beats when the input is sparse.",
    "Cover the FULL arc across all panels: distribute beats evenly from opening → escalation → climax/resolution (or the story’s natural ending). Do not skip the ending or major beats from the user text.",
    "If the user provided a long or multi-scene story, panels must advance through scenes in order — no summarizing away whole sections.",
    "Workflow: turn the story into a storyboard. Each panel must correspond to a distinct step/beat in the story, in order, and must clearly show action/movement/intent (not static portraits).",
    "Each panel must include texts: on-panel text elements (captions, speech, thoughts, SFX). texts must be non-empty for every panel.",
    "Each panel must include imagePrompt: a rich, specific prompt for an image model.",
    "CRITICAL CHARACTER CONSISTENCY WORKFLOW:",
    "- Identify every recurring named character in the story (including protagonists).",
    `- In Panel 1 imagePrompt ONLY, include a clearly delimited character bible block that starts with exactly "${CHARACTER_LOCK_START}" and ends with exactly "${CHARACTER_LOCK_END}".`,
    "- Inside that block, put ONE character per line in the exact format: Name: <1–2 sentence visual identity>.",
    "- Each line must include stable visual identifiers: face/hair, skin tone, age range, body type, wardrobe colors, distinctive props, and any signature marks.",
    "- In every panel (including Panel 1), refer back to those same character identifiers; do not introduce new outfits/hair/face changes unless the story explicitly changes them.",
    "IMAGEPROMPT FORMAT (use this structure for every panel after any CHARACTER LOCK block). Priority: (1) character continuity, (2) clean lettering space, (3) action clarity:",
    "- Subjects: (who is in frame; use exact names from the CHARACTER LOCK)",
    "- Continuity: (wardrobe colors, hair, skin tone, props, marks — must match the lock unless the story explicitly changes them)",
    "- Negative space for text: (where captions/speech will sit: top/bottom/side; keep those regions low-detail and unobstructed)",
    "- Shot/Camera: (e.g., wide establishing / medium / close-up, lens feel)",
    "- Setting: (where, time of day, key objects that anchor continuity)",
    "- Lighting/Palette: (mood lighting + palette temperature)",
    "- Composition/Focal point: (what the eye reads first; silhouette clarity)",
    "- Primary read: (one phrase — the single clearest story read in the panel)",
    "- Action/Acting: (physical intent; keep readable — if the prompt is long, shorten here before dropping continuity or negative-space notes)",
    "PAGE LAYOUT METADATA (include on EVERY panel; used for preview + PDF row rhythm when narrative layout is enabled):",
    "- layoutIntent: full | wide | half | pair-next | auto.",
    "  - full or wide: give this panel its own full-width row (establishing, climax, emotional hold, or complex composition).",
    "  - half: prefer sharing a row with an adjacent panel when the page preset uses pairs.",
    "  - pair-next: pair this panel with the IMMEDIATELY FOLLOWING panel on one row (rapid dialogue / reaction / two-beat gag).",
    "  - auto: derive from storyBeat + letteringLoad (default when unsure).",
    "- storyBeat: establish | exchange | escalation | climax | resolution | beat.",
    "  - establish: opening geography/mood (often panel 1). exchange: quick back-and-forth. escalation/climax/resolution: story pressure peaks and payoff.",
    "- letteringLoad: light | medium | heavy from how much speech/caption this panel carries; heavy nudges a wider row so lettering does not crush the art.",
    "Do NOT include generic boilerplate like 'no text/speech bubbles/watermarks', 'professional quality', or repeated global style recipes inside imagePrompt — the renderer appends those constraints automatically.",
    "Never put dialogue or captions inside the illustration. Instead, leave clean negative space for overlays (e.g. bottom caption bar / top speech area).",
    getSystemStyleGuidance(styleProfile),
    "Reference images (when provided): use them ONLY for visual style — line weight, inking, color rendering, texture, brush or digital look, era or genre of comic art.",
    "Do not copy subjects, characters, faces, outfits, logos, or compositions from reference images unless the user's text explicitly describes those same elements.",
    "Safety: avoid real-world brand logos, trademarks, and recognizable corporate/product marks. If the story mentions brands, depict them generically (e.g., 'a soda can' not a specific label) unless the user explicitly requires exact branding.",
    "Safety: do not introduce recognizable celebrities or real private individuals; keep characters fictional unless the user’s story explicitly calls for a real public figure.",
    "When reference images exist, describe their style traits once in imagePrompt (shared look) — do NOT give each panel a different style recipe; one coherent series look only.",
    "Omit imageReferenceNotes in JSON, or set it to null on every panel (the app applies one series style line automatically).",
    "Panel descriptions must be visual and concrete (camera, composition, action).",
    "texts guidance: keep speech lines short and character-voiced; use captions sparingly to clarify time/space; include SFX on action beats when appropriate.",
    "Preserve the sophistication of the user's wording when they gave detailed prose; avoid cliché or juvenile rewrites.",
    "Keep it PG-13.",
  ].join("\n")
}

export const buildScriptUserText = ({
  premise,
  tone,
  styleProfile,
  panelCount,
  referenceStyleNotes,
  referenceUrls,
  loadedRefCount,
}: {
  premise: string
  tone: ComicTone
  styleProfile: ComicStyleProfile
  panelCount: number
  referenceStyleNotes?: string
  referenceUrls: string[]
  loadedRefCount: number
}) => {
  return [
    "Story or premise (authoritative — follow this narrative; enhance only for panel structure, clarity, and comic pacing):",
    premise,
    `Tone tag (mood filter, do not override the user's plot or voice): ${tone}`,
    `Style profile (art-direction + pacing guidance): ${styleProfile}`,
    `Panel count: ${panelCount}`,
    referenceStyleNotes ? `Additional visual / style notes from user: ${referenceStyleNotes}` : null,
    referenceUrls.length > 0 ? `Reference image URLs (style cues only; content still from story above): ${referenceUrls.join(", ")}` : null,
    loadedRefCount > 0
      ? `The user attached ${loadedRefCount} reference image(s). Match drawing and rendering style only in imagePrompt — not their characters or scenes unless written in the story.`
      : null,
    "Constraints:",
    `- Exactly ${panelCount} panels`,
    "- imagePrompt must be self-contained and suitable for an image generator",
    "- imagePrompt must be detailed enough for high-quality art (specific lighting, materials, spatial layout)",
  ]
    .filter(Boolean)
    .join("\n")
}

