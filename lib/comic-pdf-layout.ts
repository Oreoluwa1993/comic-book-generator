import { getPanelRole, type PageLayoutPreset, type PanelPresentationRole } from "@/lib/comic-layout"

export const inchesToPoints = (inches: number) => Math.round(inches * 72)

export type PdfPageSizePt = { width: number; height: number }

export type PdfPagePaddingPt = { top: number; bottom: number; horizontal: number }

const ROW_VERTICAL_GAP = 12

/** Target max height for stacked rows on one interior page (pt). */
const DEFAULT_PAGE_ROW_BUDGET = 688

export const ROW_CELL_GUTTER = 10

/**
 * Rough row block height for pagination (image band + dialogue band + spacing).
 */
export const estimateRowHeight = (row: number[], preset: PageLayoutPreset): number => {
  if (row.length === 1) {
    const idx = row[0]!
    const role = getPanelRole(preset, row, idx)
    if (role === "uniform" || role === "tier-full" || role === "manga-solo") {
      return 220 + 70 + ROW_VERTICAL_GAP
    }
  }
  return 168 + 64 + ROW_VERTICAL_GAP
}

/** Split layout rows into pages so stacked rows stay within the vertical budget. */
export const chunkRowsIntoPages = (
  rows: number[][],
  preset: PageLayoutPreset,
  opts?: { pageRowBudgetPt?: number }
): number[][][] => {
  const pageRowBudget = opts?.pageRowBudgetPt ?? DEFAULT_PAGE_ROW_BUDGET
  const pages: number[][][] = []
  let current: number[][] = []
  let used = 0

  for (const row of rows) {
    const h = estimateRowHeight(row, preset)
    if (current.length > 0 && used + h > pageRowBudget) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(row)
    used += h
  }

  if (current.length > 0) pages.push(current)
  return pages
}

export type PanelCellDimensions = {
  imageWidth: number
  imageHeight: number
}

export const getPdfContentWidth = (pageWidthPt: number, paddingHorizontalPt: number) =>
  pageWidthPt - paddingHorizontalPt * 2

export const getCellDimensions = (
  role: PanelPresentationRole,
  contentWidth: number
): PanelCellDimensions => {
  const g = ROW_CELL_GUTTER
  const inner = contentWidth - g

  switch (role) {
    case "tier-full":
    case "manga-solo":
    case "uniform":
      return { imageWidth: contentWidth, imageHeight: 220 }
    case "tier-half":
      return { imageWidth: inner / 2, imageHeight: 165 }
    case "manga-bleed": {
      const bleedW = Math.floor(inner * (7 / 10))
      return { imageWidth: bleedW, imageHeight: 200 }
    }
    case "manga-sidebar": {
      const bleedW = Math.floor(inner * (7 / 10))
      const sidebarW = contentWidth - bleedW - g
      return { imageWidth: sidebarW, imageHeight: 200 }
    }
    default:
      return { imageWidth: contentWidth, imageHeight: 220 }
  }
}
