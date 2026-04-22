/**
 * Presentation-only layout: maps panel indices into rows for comic-page previews.
 * Does not change generation — only how panels are arranged on screen.
 */

import type { ComicPanel } from "@/lib/comic"

export type PageLayoutPreset = "uniform-grid" | "manga-asymmetric" | "comic-tiers"

export type PanelPresentationRole =
  | "uniform"
  | "manga-bleed"
  | "manga-sidebar"
  | "manga-solo"
  | "tier-full"
  | "tier-half"

export const LAYOUT_PRESETS: Array<{
  value: PageLayoutPreset
  label: string
  description: string
}> = [
  {
    value: "uniform-grid",
    label: "Uniform grid",
    description: "Even columns — quick scan of every panel.",
  },
  {
    value: "manga-asymmetric",
    label: "Manga page",
    description: "Wide primary column + narrow framed column (pairs), like many manga spreads.",
  },
  {
    value: "comic-tiers",
    label: "Comic tiers / strip",
    description: "Horizontal bands: full-width rows and split rows, like a printed comic page.",
  },
]

/** One row = panel indices to show side-by-side or as one band. */
export const buildComicLayoutRows = (preset: PageLayoutPreset, panelCount: number): number[][] => {
  if (panelCount <= 0) return []
  if (preset === "uniform-grid") {
    return Array.from({ length: panelCount }, (_, i) => [i])
  }
  if (preset === "manga-asymmetric") {
    return buildMangaPairs(panelCount)
  }
  return buildComicTierRows(panelCount)
}

const buildMangaPairs = (n: number): number[][] => {
  const rows: number[][] = []
  for (let i = 0; i < n; i += 2) {
    if (i + 1 < n) rows.push([i, i + 1])
    else rows.push([i])
  }
  return rows
}

/**
 * Repeating “page” rhythm: full, full, split, full, full — then consume remainder sensibly.
 * Mirrors common tiered comics (wide establishing beats + one two-panel row).
 */
const buildComicTierRows = (n: number): number[][] => {
  const rows: number[][] = []
  let i = 0
  while (i < n) {
    const left = n - i
    // One "beat" is full, full, split, full, full → six consecutive indices (not five).
    if (left >= 6) {
      rows.push([i])
      i += 1
      rows.push([i])
      i += 1
      rows.push([i, i + 1])
      i += 2
      rows.push([i])
      i += 1
      rows.push([i])
      i += 1
      continue
    }
    if (left === 5) {
      rows.push([i])
      i += 1
      rows.push([i])
      i += 1
      rows.push([i, i + 1])
      i += 2
      rows.push([i])
      i += 1
      continue
    }
    if (left === 4) {
      rows.push([i])
      i += 1
      rows.push([i])
      i += 1
      rows.push([i, i + 1])
      i += 2
      continue
    }
    if (left === 3) {
      rows.push([i])
      i += 1
      rows.push([i, i + 1])
      i += 2
      continue
    }
    if (left === 2) {
      rows.push([i, i + 1])
      i += 2
      continue
    }
    rows.push([i])
    i += 1
  }
  return rows
}

export const hasNarrativeLayoutHints = (panels: ComicPanel[]): boolean =>
  panels.some((p) => p.layoutIntent != null || p.storyBeat != null || p.letteringLoad != null)

const wantsSoloRow = (panel: ComicPanel, index: number): boolean => {
  const intent = panel.layoutIntent
  if (intent === "full" || intent === "wide") return true
  if (intent === "half" || intent === "pair-next") return false

  const beat = panel.storyBeat
  if (beat === "climax" || beat === "resolution") return true
  if (beat === "establish" && index === 0) return true
  if (panel.letteringLoad === "heavy") return true
  return false
}

/**
 * Reading-order rows of panel indices. Pairs only appear when preset is manga-asymmetric or comic-tiers;
 * use {@link resolveComicLayoutRows} from the UI/PDF.
 */
export const buildNarrativeLayoutRows = (panels: ComicPanel[]): number[][] => {
  const n = panels.length
  const rows: number[][] = []
  let i = 0
  while (i < n) {
    if (wantsSoloRow(panels[i]!, i)) {
      rows.push([i])
      i += 1
      continue
    }
    if (
      i + 1 < n &&
      panels[i]!.layoutIntent === "pair-next" &&
      !wantsSoloRow(panels[i + 1]!, i + 1)
    ) {
      rows.push([i, i + 1])
      i += 2
      continue
    }
    if (i + 1 < n && !wantsSoloRow(panels[i + 1]!, i + 1)) {
      rows.push([i, i + 1])
      i += 2
      continue
    }
    rows.push([i])
    i += 1
  }
  return rows
}

/** Preview + PDF should call this so narrative hints and preset stay in sync. */
export const resolveComicLayoutRows = (
  preset: PageLayoutPreset,
  panels: ComicPanel[],
  useNarrativeLayout: boolean
): number[][] => {
  const n = panels.length
  if (n <= 0) return []
  if (preset === "uniform-grid") return buildComicLayoutRows(preset, n)
  if (!useNarrativeLayout || !hasNarrativeLayoutHints(panels)) {
    return buildComicLayoutRows(preset, n)
  }
  return buildNarrativeLayoutRows(panels)
}

export const getPanelRole = (
  preset: PageLayoutPreset,
  rowIndices: number[],
  globalIndex: number
): PanelPresentationRole => {
  if (preset === "uniform-grid") return "uniform"

  if (preset === "manga-asymmetric") {
    if (rowIndices.length === 1) return "manga-solo"
    const pos = rowIndices.indexOf(globalIndex)
    if (pos === 0) return "manga-bleed"
    return "manga-sidebar"
  }

  if (rowIndices.length === 1) return "tier-full"
  return "tier-half"
}
