---
name: prompt-qa
description: Deterministically improve image prompts for renderability and consistency (no boilerplate, no contradictions, self-contained staging).
---

## What this skill does
- Removes embedded character-lock blocks from per-panel prompts (character locks should be applied globally during rendering).
- Removes redundant boilerplate like “no text / no watermark / professional quality”.
- Ensures each prompt remains self-contained and concrete (camera, subjects, action, setting, lighting, composition, negative space).

## QA checklist
- Prompt includes camera/shot language and a clear focal point
- Action is dynamic (not a posed portrait) unless the story calls for stillness
- Setting includes at least 1–2 anchoring objects for continuity
- Lighting/palette are stated
- Includes explicit negative space placement for text overlays
- Avoids brand names/logos and recognizable real people unless explicitly requested

## Output format
- `CleanedPrompt:` one line
- `Notes:` 2–5 bullets on what changed

