import type { Comic } from "@/lib/comic"
import type { PageLayoutPreset } from "@/lib/comic-layout"
import { resolveComicLayoutRows } from "@/lib/comic-layout"
import { chunkRowsIntoPages, inchesToPoints, type PdfPagePaddingPt, type PdfPageSizePt } from "@/lib/comic-pdf-layout"

export type ComicBookPageRole =
  | "front_cover"
  | "credits"
  | "indicia"
  | "story"
  | "back_cover"

export type ComicBookGeometry = {
  /** Explicit page size in points (72 pt/in). This should include bleed for print-ready PDFs. */
  pageSizePt: PdfPageSizePt
  /** Content padding for interior pages (pt). */
  interiorPaddingPt: PdfPagePaddingPt
  /** Reserved band for folios/page number (pt). */
  folioBandHeightPt: number
  /**
   * Print-ish guides in inches. These are used for consistent interior composition (safe/trim rhythm),
   * even if the underlying PDF is LETTER for now.
   */
  trimIn: { width: number; height: number }
  bleedIn: number
  safeIn: number
}

export type ComicBookCredits = {
  title: string
  logline?: string
  subtitle?: string
  creditsLines: string[]
  metaLines: string[]
}

export type ComicBookIndicia = {
  heading: string
  paragraphs: string[]
}

export type ComicBookStoryPage = {
  storyPageNumber: number
  /** Layout rows for this page (each row contains global panel indices). */
  rows: number[][]
  /** Optional folio label (title/issue). */
  folioTitle?: string
}

export type ComicBookPage =
  | { role: "front_cover"; title: string; logline?: string; imageUrl?: string }
  | { role: "credits"; credits: ComicBookCredits }
  | { role: "indicia"; indicia: ComicBookIndicia }
  | { role: "story"; story: ComicBookStoryPage }
  | { role: "back_cover"; title: string; imageUrl?: string }

export type ComicBookManifest = {
  geometry: ComicBookGeometry
  pages: ComicBookPage[]
}

const formatToday = () => {
  try {
    return new Date().toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

/**
 * Creates a "professionally formatted" book order:
 * cover → credits → indicia → story pages → back cover
 *
 * Notes:
 * - We keep PDF page size as LETTER for now to avoid breaking current expectations.
 * - We still track trim/bleed/safe so templates can be consistent and future-print-ready.
 */
export const buildDefaultComicBookManifest = ({
  comic,
  pageLayout,
  useNarrativeLayout,
}: {
  comic: Comic
  pageLayout: PageLayoutPreset
  useNarrativeLayout: boolean
}): ComicBookManifest => {
  const trimIn = { width: 6.625, height: 10.25 }
  const bleedIn = 0.125
  const safeIn = 0.25

  const pageSizePt: PdfPageSizePt = {
    width: inchesToPoints(trimIn.width + bleedIn * 2),
    height: inchesToPoints(trimIn.height + bleedIn * 2),
  }

  // Padding is based on safe area, with a small extra buffer for UI-like text blocks.
  const safePt = inchesToPoints(safeIn)
  const interiorPaddingPt: PdfPagePaddingPt = {
    top: safePt + 10,
    bottom: safePt + 18,
    horizontal: safePt + 12,
  }

  const geometry: ComicBookGeometry = {
    pageSizePt,
    interiorPaddingPt,
    folioBandHeightPt: 22,
    trimIn,
    bleedIn,
    safeIn,
  }

  const rows = resolveComicLayoutRows(pageLayout, comic.panels, useNarrativeLayout)
  const pageRowBudgetPt =
    geometry.pageSizePt.height -
    geometry.interiorPaddingPt.top -
    geometry.interiorPaddingPt.bottom -
    geometry.folioBandHeightPt

  const storyPages = chunkRowsIntoPages(rows, pageLayout, { pageRowBudgetPt })

  const storyPageEntries: ComicBookPage[] = storyPages.map((pageRows, idx) => ({
    role: "story",
    story: {
      storyPageNumber: idx + 1,
      rows: pageRows,
      folioTitle: comic.title,
    },
  }))

  const credits: ComicBookCredits = {
    title: comic.title,
    logline: comic.logline,
    subtitle: comic.tone ? comic.tone.toUpperCase() : undefined,
    creditsLines: [
      "Written & Illustrated by: You",
      "Produced with: Comic Book Generator",
    ],
    metaLines: [
      `Generated: ${formatToday()}`,
      `${comic.panels.length} panel${comic.panels.length === 1 ? "" : "s"}`,
    ],
  }

  const indicia: ComicBookIndicia = {
    heading: "INDICIA",
    paragraphs: [
      `${comic.title} is a work of fiction. Names, characters, places, and incidents are either the product of the author’s imagination or used fictitiously.`,
      "No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without permission, except brief quotations for reviews.",
      "All rights reserved.",
    ],
  }

  const coverArtUrl = comic.panels[0]?.imageUrl
  const backCoverUrl = comic.panels[comic.panels.length - 1]?.imageUrl

  return {
    geometry,
    pages: [
      { role: "front_cover", title: comic.title, logline: comic.logline, imageUrl: coverArtUrl },
      { role: "credits", credits },
      { role: "indicia", indicia },
      ...storyPageEntries,
      { role: "back_cover", title: comic.title, imageUrl: backCoverUrl },
    ],
  }
}

