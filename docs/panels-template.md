## Comic panel template (consistent, high-impact panels)

This repo’s panel model is `ComicPanel` (see `lib/comic.ts`). Images are generated from **`panel.imagePrompt`** plus automatic global constraints (series visual lock, character lock, “no text in art”, negative space for overlays, framing rules).

### Core idea

Write panels like a storyboard artist:

- **One panel = one readable action** with a clear cause/effect.
- **One focal point** (what the eye reads first).
- **Reserve negative space** for captions/speech overlays (the app adds strong “no text” constraints automatically).
- **Continuity is sacred**: left/right positions, props-in-hand, wardrobe colors, lighting direction, and setting anchors should not drift unless the story calls for it.

---

## The panel object (copy/paste template)

Use this skeleton when hand-editing or generating panel JSON:

```json
{
  "id": "uuid-or-stable-id",
  "title": "Short beat name (what changes)",
  "description": "1–2 sentences. Visual-only. Camera + action + consequence.",
  "texts": [
    { "kind": "caption", "text": "Optional time/place or punchy narrator line." },
    { "kind": "speech", "speaker": "Name", "text": "Short, voicey line." },
    { "kind": "sfx", "text": "CRASH!" }
  ],
  "stageNotes": "Blocking + acting + camera. Include left/right, foreground/background, expression/gesture, and 2–4 continuity anchors.",
  "microBeats": [
    "Subject + physical action + visible effect.",
    "Subject + physical action + visible effect.",
    "Subject + physical action + visible effect."
  ],
  "imagePrompt": "Structured prompt (see format below).",
  "layoutIntent": "auto",
  "storyBeat": "beat",
  "letteringLoad": "medium"
}
```

### Panel field intent (how to use each well)

- **`title`**: what *changes* in this panel (not a label like “Panel 3”).
- **`description`**: the plain-English storyboard caption; keep it drawable.
- **`texts`**: what the reader will see overlaid (do not ask the image model to render text).
- **`stageNotes`**: your best “director note” version of the shot (blocking/camera/acting).
- **`microBeats`**: 3–6 tiny, drawable actions that create motion and clarity in a still image.
- **`imagePrompt`**: the final render spec. If you’re unsure, write strong `stageNotes` + `microBeats`, then use the UI’s “Regenerate draft” → “Accept draft → image prompt”.
- **`layoutIntent` / `storyBeat` / `letteringLoad`**: metadata used by the narrative layout rows. When in doubt: `layoutIntent: "auto"`.

---

## Image prompt format (recommended)

Your server code tries to preserve the **highest-salience fields** if prompts get clipped, and it can extract “MUST RENDER” details if you use labels. This format aligns with that:

```text
Subjects: <who is in frame; use exact character names>
Continuity: <wardrobe colors, props, marks; what must match previous panels>
Negative space for text: <top band / bottom band / side margin; keep low-detail>
Shot/Camera: <wide/medium/close; angle; lens feel>
Setting: <place + 2–4 anchors that persist across nearby panels>
Lighting/Palette: <mood lighting + palette temperature>
Composition/Focal point: <what reads first; silhouette clarity; depth>
Primary read: <one phrase — the clearest story takeaway>
Action/Acting: <physical intent; visible motion; facial acting; hand positions>
```

### Prompt rules (important in this repo)

- **Do not add boilerplate** like “no text / no watermark / professional quality” inside `imagePrompt`. The renderer appends those constraints and also normalizes them out.
- **Do not paste a character bible into every panel**. If you’re using `CHARACTER LOCK`, it belongs in **panel 1 only**; the app extracts it into a global lock.
- **Keep it drawable**: avoid abstract emotions without visible acting (“angry” → brows/eyes/mouth + shoulders/hands posture).

---

## Examples (high-signal, reusable patterns)

These examples intentionally show **how** to specify clarity, negative space, and continuity without relying on generic adjectives.

### Example A — Establishing shot (geography + mood)

```json
{
  "id": "example-establish-01",
  "title": "The world feels too quiet",
  "description": "Wide establishing shot of a rainy street at dusk; the protagonist pauses under a flickering streetlamp, clutching a tote bag as headlights smear reflections across wet pavement.",
  "texts": [
    { "kind": "caption", "text": "Dusk. The city holds its breath." },
    { "kind": "speech", "speaker": "Mara", "text": "…Did it always sound like that?" }
  ],
  "stageNotes": "Wide shot, slight high angle. Mara is mid-left foreground under the streetlamp; rain streaks diagonally; background storefronts recede in perspective. Show her tote bag tight to her chest, shoulders slightly hunched, eyes scanning off-frame right. Keep a clean top band for caption.",
  "microBeats": [
    "Mara stops short, one foot half-lifted, rain splashing around her shoe.",
    "She tightens her grip on the tote strap; knuckles pale against the fabric.",
    "Her gaze snaps to the right; the streetlamp flicker throws a brief shadow across her face."
  ],
  "imagePrompt": "Subjects: Mara (shy librarian) alone in frame | Continuity: Mara’s round glasses, teal hoodie, red canvas tote with enamel pins; rain-slick street; flickering streetlamp | Negative space for text: clean top band, low-detail sky | Shot/Camera: wide establishing, slight high angle, cinematic street perspective | Setting: rainy city block at dusk, wet asphalt reflections, streetlamp, distant bookstore window glow | Lighting/Palette: cool blue-gray rain, warm amber lamp halo, soft bloom on reflections | Composition/Focal point: streetlamp halo frames Mara; strong silhouette; leading lines to her face | Primary read: “She senses something wrong” | Action/Acting: Mara freezes mid-step and scans off-frame right, tense shoulders, lips parted as if hearing a whisper.",
  "layoutIntent": "full",
  "storyBeat": "establish",
  "letteringLoad": "medium"
}
```

### Example B — Exchange (pair-next dialogue rhythm)

```json
{
  "id": "example-exchange-02",
  "title": "A skeptical counterpoint",
  "description": "Medium two-shot at a cluttered workbench: the bookbinder leans in, unimpressed, while the protagonist offers the strange object with hesitant hope.",
  "texts": [
    { "kind": "speech", "speaker": "Jules", "text": "That’s not a bookmark. That’s a problem." },
    { "kind": "speech", "speaker": "Mara", "text": "It told me what happens next." }
  ],
  "stageNotes": "Medium shot across the workbench. Jules on frame-right, arms braced on the table, eyebrow raised; Mara on frame-left, half-extended hand offering the bookmark. Keep clean negative space along the upper-left for speech.",
  "microBeats": [
    "Mara extends the bookmark, stopping just short of Jules’s reach.",
    "Jules tilts his head and narrows his eyes, refusing to touch it.",
    "A loose page on the bench lifts slightly as if stirred by a whisper of air."
  ],
  "imagePrompt": "Subjects: Mara and Jules facing each other across a workbench | Continuity: Mara’s glasses/teal hoodie/red tote strap visible; Jules with ink-stained fingers, rolled sleeves; bookmark is the only “mystical” object | Negative space for text: clear upper-left and upper-right corners, uncluttered | Shot/Camera: medium two-shot, eye level, slight table-depth perspective | Setting: bookbinder’s workshop—workbench, paper scraps, thread spools, press tool, lamp | Lighting/Palette: warm task-lamp pool on hands/object; cooler shadowed background | Composition/Focal point: bookmark centered between their hands; faces readable; hands in clear silhouette | Primary read: “He refuses; she insists” | Action/Acting: Mara offers the bookmark with a cautious half-smile; Jules leans in, unimpressed, eyebrow raised, keeping his hands back.",
  "layoutIntent": "pair-next",
  "storyBeat": "exchange",
  "letteringLoad": "heavy"
}
```

### Example C — Escalation (visible consequence)

```json
{
  "id": "example-escalation-03",
  "title": "The page changes itself",
  "description": "Close-up of an open book as new ink blooms across the page; the characters’ hands recoil, casting sharp shadows as the letters crawl into place.",
  "texts": [
    { "kind": "sfx", "text": "SCRRITCH" },
    { "kind": "speech", "speaker": "Mara", "text": "It’s…writing." }
  ],
  "stageNotes": "Tight close-up on the book page; hands at the edges, recoiling. Emphasize fresh ink blooming and the physicality of the page. Keep a clean bottom band for speech overlay.",
  "microBeats": [
    "Black ink blooms outward in wet tendrils, forming a new sentence.",
    "Mara’s fingers jerk back, smearing a tiny dot of ink on the margin.",
    "Jules’s hand hovers above the paper, trembling but not touching."
  ],
  "imagePrompt": "Subjects: open book and two pairs of hands (Mara, Jules) | Continuity: same workshop surface; bookmark near the spine; ink-stained fingers for Jules | Negative space for text: clean bottom band, low-detail table edge | Shot/Camera: close-up, shallow depth of field | Setting: workbench with a few recognizable tools pushed out of focus | Lighting/Palette: warm lamp highlights on glossy wet ink; deep shadows from hands | Composition/Focal point: the forming sentence/ink bloom at center; hands framing without blocking | Primary read: “Reality is rewriting” | Action/Acting: ink actively blooms into legible lines while both recoil—hands tense, fingers splayed, visible hesitation.",
  "layoutIntent": "wide",
  "storyBeat": "escalation",
  "letteringLoad": "light"
}
```

### Example D — Climax (big, simple, unforgettable)

```json
{
  "id": "example-climax-04",
  "title": "Rewrite the ending",
  "description": "Full-width, high-contrast shot: the protagonist rips a page free as wind whips paper through the air; the bookbinder braces the table, eyes wide, as the room seems to tilt.",
  "texts": [
    { "kind": "speech", "speaker": "Mara", "text": "Then we change it." },
    { "kind": "sfx", "text": "RIPPP" }
  ],
  "stageNotes": "Dramatic wide shot, low angle. Mara center, arms pulling the page free; Jules frame-right bracing the table; papers spiral upward like a small storm. Keep top band clear for a bold speech balloon.",
  "microBeats": [
    "Mara tears the page; the rip line is visible and jagged.",
    "Paper bursts upward in a spiral; a lamp cord tugs as the table jolts.",
    "Jules slams his palm down to steady the book, eyes locked on Mara’s hands."
  ],
  "imagePrompt": "Subjects: Mara and Jules in a workshop, page tearing mid-action | Continuity: Mara’s glasses/hoodie/tote strap; Jules’s ink-stained hands; same workbench and lamp | Negative space for text: clear top band, avoid detail behind faces | Shot/Camera: dramatic wide, low angle, slight dutch tilt for intensity | Setting: workshop anchored by workbench, lamp, scattered paper | Lighting/Palette: warm lamp as hard key light; deep shadows; high contrast | Composition/Focal point: Mara’s hands tearing the page; paper spiral leads eye back to her face | Primary read: “She chooses to act” | Action/Acting: Mara commits—jaw set, shoulders engaged; Jules braces the table, startled but present; paper storm shows force and consequence.",
  "layoutIntent": "full",
  "storyBeat": "climax",
  "letteringLoad": "medium"
}
```

### Example E — Resolution (quiet payoff)

```json
{
  "id": "example-resolution-05",
  "title": "A new last line",
  "description": "Medium shot in calm morning light: the bookmark lies still on a closed book; the protagonist exhales, finally relaxed, while the bookbinder sets a fresh, clean cover on the workbench.",
  "texts": [
    { "kind": "caption", "text": "Morning. The ending holds." },
    { "kind": "speech", "speaker": "Jules", "text": "…I can live with that." }
  ],
  "stageNotes": "Medium shot, stable horizon. Mara seated frame-left, relaxed hands; Jules frame-right placing a new cover. Bookmark centered on the closed book. Keep bottom band clear for caption.",
  "microBeats": [
    "Mara exhales; shoulders drop and her hand unclenches on her lap.",
    "Jules slides the new cover into place, careful and precise.",
    "The bookmark lies perfectly still—no flutter, no wind, no ink bloom."
  ],
  "imagePrompt": "Subjects: Mara and Jules in a calm workshop moment | Continuity: same characters and props; bookmark present but inert; tidy workbench reset | Negative space for text: clean bottom band, uncluttered tabletop edge | Shot/Camera: medium, eye level, steady framing | Setting: workshop in morning light; fewer scattered papers; one or two familiar tools | Lighting/Palette: soft warm morning light, gentle shadows, calmer palette | Composition/Focal point: bookmark on closed book; faces readable; calm negative space | Primary read: “The threat is gone” | Action/Acting: Mara relaxes visibly; Jules places a new cover with quiet care; everything is still.",
  "layoutIntent": "full",
  "storyBeat": "resolution",
  "letteringLoad": "medium"
}
```

