---
name: panel-templates
description: Use a local reference image pack to enforce consistently high-quality comic panels (space, motion, clarity) via safe, style-only extraction + template-driven panel specs.
---

## When to use
- User provides (or points to) **panel reference images** and wants consistently high-quality panel staging.
- User wants a **repeatable template** for panels (stageNotes + microBeats + imagePrompt structure) that matches this repo’s generation pipeline.

## Prerequisites (must be true)
- Reference images must be accessible to the repo process.
  - If the user’s refs are in `~/Downloads` and you cannot read them, instruct the user to copy them into the repo at:
    - `references/panel-templates/` (preferred)
  - Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`.

## Non-negotiable safety rules (inherit reference-policy)
- Reference images influence **style and craft only**: spacing, negative space discipline, compositional hierarchy, shot progression, clarity of silhouettes, value control, and lettering-safe regions.
- Do **not** copy reference subjects: faces, characters, outfits, logos, distinctive props, or exact compositions.
- If a user wants a specific subject, it must be described in **text**; otherwise treat it as disallowed.

## What to extract from the reference pack (style-only “PanelCraftBible”)
Produce a compact craft bible (8–14 bullets) covering:
- Negative space patterns for lettering (top band vs side margin vs bottom band; how “quiet” those zones are)
- Shot progression rules (establish → medium → close; when to break it)
- Staging clarity rules (one focal point; silhouette-first; hand/face preservation)
- Motion readability patterns (windup → contact → follow-through; reaction cuts; object displacement)
- Background detail policy (when to simplify; when to anchor geography)
- Lighting/value discipline (high-contrast for impact beats; softer gradients for holds)
- Panel “primary read” discipline (one phrase per panel)

## Deliverables (always)
1. **PanelCraftBible:** 8–14 bullets (style-only, no subject copying).
2. **Template:** a copy/paste `ComicPanel` JSON skeleton tailored to this repo:
   - includes `title`, `description`, `texts`, `stageNotes`, `microBeats`, `imagePrompt`,
     plus `layoutIntent`, `storyBeat`, `letteringLoad`.
3. **Examples:** 3–6 example panels showing different beats:
   - establish, exchange (pair-next), escalation, climax, resolution.
   - Each example must explicitly show negative space placement + one primary read + drawable micro-beats.
4. **Prompt QA pass:** ensure examples avoid boilerplate (“no text”, “professional quality”) since the renderer appends constraints.

## How to apply to this repo (must align with pipeline)
- `imagePrompt` should use labeled fields where possible:
  - `Subjects:`, `Continuity:`, `Negative space for text:`, `Shot/Camera:`, `Setting:`, `Lighting/Palette:`,
    `Composition/Focal point:`, `Primary read:`, `Action/Acting:`
  - This improves “must render” extraction and survives prompt clipping.
- Favor strong `stageNotes` + `microBeats` for editable intent; the UI can regenerate a draft prompt from these.
- Respect metadata:
  - `layoutIntent`: `full|wide|half|pair-next|auto`
  - `storyBeat`: `establish|exchange|escalation|climax|resolution|beat`
  - `letteringLoad`: `light|medium|heavy`

## Output format (strict)
Return exactly:
- `PanelCraftBible:` bullets
- `Template:` one JSON block
- `Examples:` numbered list of JSON blocks

