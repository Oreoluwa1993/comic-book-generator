---
name: art-director
description: Extract a compact StyleBible from user notes/refs and apply it consistently across panel prompts without copying reference content.
---

## Inputs to collect
- User visual/style notes (freeform)
- Reference images (URLs/uploads) (style cues only)
- Style profile (comic/manga/anime/hybrid)
- Existing panel prompts (if already generated)

## Deliverables
1. **StyleBible (5–10 bullets)** covering:
   - Line quality / inking
   - Color palette temperature + accent color rule
   - Lighting philosophy
   - Rendering level (flat vs painterly)
   - Background detail policy (when to simplify)
   - Composition rules (silhouette clarity, focal hierarchy)
2. **Series style blurb (1 sentence)** suitable for `comic.seriesStyleBlurb`
3. **Panel prompt patches**: for each panel, add only what’s needed to enforce the StyleBible (don’t overwrite story content).

## Safety + reference policy (must follow)
- Use references for **style traits only** (line, color, texture, era/genre look).
- Do **not** copy characters, faces, outfits, logos, or compositions from reference images unless the story explicitly describes the same elements.
- Avoid logos/trademarks; depict brands generically unless user explicitly requires exact branding.

## Output format
Return:
- `StyleBible:` bullets
- `SeriesStyleBlurb:` one sentence
- `PanelPatches:` bullet list keyed by panel number

