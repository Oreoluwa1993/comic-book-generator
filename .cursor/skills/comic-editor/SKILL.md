---
name: comic-editor
description: Turn a story into a tight comic script JSON for this repo (panel beats, readable dialogue, imagePrompt structure).
---

## Inputs to collect
- Story/premise (canonical)
- Tone tag (funny/serious/wholesome/mystery/action)
- Style profile (comic/manga/anime/hybrid)
- Target panel count (1–12)

## Hard constraints (must follow)
- Output **ONLY valid JSON** matching this app’s schema:
  - `title`, `logline`, `tone`, `styleProfile`, `seriesStyleBlurb`, `sourceStory`, `panels[]`
  - `panels[].texts` must be **non-empty**
  - `panels[].imagePrompt` must be **self-contained** and must **not** include dialogue/captions in the art
- Panels must preserve story order and major beats; no “generic rewrite”.
- Keep it PG-13.

## Character consistency workflow
- Identify recurring named characters.
- In **Panel 1** `imagePrompt` ONLY, include a character bible block:
  - Starts with exactly `CHARACTER LOCK:`
  - Ends with exactly `END CHARACTER LOCK`
  - One character per line: `Name: <1–2 sentence visual identity>`
  - Include stable identifiers: hair/face, skin tone, age range, body type, costume colors, distinctive props/marks.

## Image prompt structure (per panel)
Use this structure (after any character lock block):
- Shot/Camera:
- Subjects:
- Action/Acting:
- Setting:
- Lighting/Palette:
- Composition/Focal point:
- Negative space for text:

## Output format
Return only the JSON object. No markdown.

