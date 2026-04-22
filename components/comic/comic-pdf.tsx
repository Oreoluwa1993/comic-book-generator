"use client"

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { Comic, ComicPanel, ComicPanelText } from "@/lib/comic"
import { getPanelRole, type PageLayoutPreset } from "@/lib/comic-layout"
import { getCellDimensions, getPdfContentWidth, ROW_CELL_GUTTER } from "@/lib/comic-pdf-layout"
import { formatReaderSpeechLine, truncateForPdf } from "@/lib/comic-reader-text"
import { buildDefaultComicBookManifest } from "@/lib/comic-book-manifest"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#0a0a0a",
  },
  coverPage: { padding: 0, fontFamily: "Helvetica", color: "#0a0a0a" },
  coverBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverOverlay: {
    position: "absolute",
    left: 32,
    right: 32,
    top: 40,
    bottom: 40,
    justifyContent: "flex-end",
  },
  coverTitle: { fontFamily: "Helvetica-Bold", fontSize: 34, marginBottom: 8 },
  coverLogline: { fontSize: 12, color: "#171717", lineHeight: 1.45, marginBottom: 10 },
  coverMeta: { fontSize: 10, color: "#404040" },
  frontMatterTitle: { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 10 },
  frontMatterSubTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 10, color: "#404040" },
  frontMatterLine: { fontSize: 11, marginBottom: 4, lineHeight: 1.35 },
  frontMatterMeta: { fontSize: 10, color: "#525252", marginTop: 10, lineHeight: 1.35 },
  indiciaHeading: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 10 },
  indiciaPara: { fontSize: 10.5, marginBottom: 8, lineHeight: 1.45, color: "#262626" },
  interiorStack: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: ROW_CELL_GUTTER + 2,
  },
  cell: {
    flexDirection: "column",
  },
  panelFrame: {
    borderWidth: 2,
    borderColor: "#18181b",
    backgroundColor: "#f4f4f5",
    overflow: "hidden",
  },
  placeholderInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e4e4e7",
  },
  placeholderLabel: { fontSize: 9, color: "#71717a" },
  textBlock: { marginTop: 5 },
  lineCaption: { fontSize: 8.5, color: "#525252", marginBottom: 2 },
  lineSpeech: { fontSize: 8.5, marginBottom: 2 },
  lineThought: { fontSize: 8.5, fontStyle: "italic", color: "#404040", marginBottom: 2 },
  lineSfx: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 2 },
  folioRow: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  folioText: { fontSize: 9, color: "#525252" },
})

const getPanelTextByKind = (texts: ComicPanelText[], kind: ComicPanelText["kind"]) =>
  texts.filter((t) => t.kind === kind)

const PdfPanelReaderTexts = ({ panel, maxWidth }: { panel: ComicPanel; maxWidth: number }) => {
  const captions = getPanelTextByKind(panel.texts, "caption")
  const speeches = getPanelTextByKind(panel.texts, "speech")
  const thoughts = getPanelTextByKind(panel.texts, "thought")
  const sfxs = getPanelTextByKind(panel.texts, "sfx")

  if (
    captions.length === 0 &&
    speeches.length === 0 &&
    thoughts.length === 0 &&
    sfxs.length === 0
  ) {
    return (
      <View style={[styles.textBlock, { width: maxWidth }]}>
        <Text style={styles.lineCaption}> </Text>
      </View>
    )
  }

  return (
    <View style={[styles.textBlock, { width: maxWidth }]}>
      {captions.map((t, i) => (
        <Text key={`${panel.id}-cap-${i}`} style={styles.lineCaption}>
          {truncateForPdf(`Caption: ${t.text}`)}
        </Text>
      ))}
      {speeches.map((t, i) => (
        <Text key={`${panel.id}-sp-${i}`} style={styles.lineSpeech}>
          {truncateForPdf(formatReaderSpeechLine(t))}
        </Text>
      ))}
      {thoughts.map((t, i) => (
        <Text key={`${panel.id}-th-${i}`} style={styles.lineThought}>
          {truncateForPdf(`Thought: ${formatReaderSpeechLine(t)}`)}
        </Text>
      ))}
      {sfxs.map((t, i) => (
        <Text key={`${panel.id}-sfx-${i}`} style={styles.lineSfx}>
          {truncateForPdf(t.text)}
        </Text>
      ))}
    </View>
  )
}

const PdfPanelCell = ({
  panel,
  pageLayout,
  row,
  panelIdx,
  isLastInRow,
  contentWidth,
}: {
  panel: ComicPanel
  pageLayout: PageLayoutPreset
  row: number[]
  panelIdx: number
  isLastInRow: boolean
  contentWidth: number
}) => {
  const role = getPanelRole(pageLayout, row, panelIdx)
  const dims = getCellDimensions(role, contentWidth)

  return (
    <View
      style={[
        styles.cell,
        {
          width: dims.imageWidth,
          marginRight: isLastInRow ? 0 : ROW_CELL_GUTTER,
        },
      ]}
    >
      <View style={[styles.panelFrame, { width: dims.imageWidth, height: dims.imageHeight }]}>
        {panel.imageUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt
          <Image src={panel.imageUrl} style={{ width: dims.imageWidth, height: dims.imageHeight }} />
        ) : (
          <View style={[styles.placeholderInner, { width: dims.imageWidth, height: dims.imageHeight }]}>
            <Text style={styles.placeholderLabel}>No art</Text>
          </View>
        )}
      </View>
      <PdfPanelReaderTexts panel={panel} maxWidth={dims.imageWidth} />
    </View>
  )
}

const PdfFolio = ({
  title,
  pageNumber,
  paddingHorizontal,
  bottom,
}: {
  title?: string
  pageNumber: number
  paddingHorizontal: number
  bottom: number
}) => {
  const safeTitle = String(title ?? "").trim()
  return (
    <View style={[styles.folioRow, { left: paddingHorizontal, right: paddingHorizontal, bottom }]}>
      <Text style={styles.folioText}>{safeTitle}</Text>
      <Text style={styles.folioText}>{pageNumber}</Text>
    </View>
  )
}

export const ComicPdfDocument = ({
  comic,
  pageLayout = "comic-tiers",
  useNarrativeLayout = true,
}: {
  comic: Comic
  pageLayout?: PageLayoutPreset
  /** When true and panels carry layout metadata, row rhythm follows story beats (manga + tiers presets). */
  useNarrativeLayout?: boolean
}) => {
  const manifest = buildDefaultComicBookManifest({ comic, pageLayout, useNarrativeLayout })
  const pageSize = manifest.geometry.pageSizePt
  const padding = manifest.geometry.interiorPaddingPt
  const contentWidth = getPdfContentWidth(pageSize.width, padding.horizontal)

  return (
    <Document title={comic.title}>
      {manifest.pages.map((page, pageIdx) => {
        if (page.role === "front_cover") {
          return (
            <Page key={`book-${pageIdx}-${page.role}`} size={pageSize} style={styles.coverPage}>
              <View style={styles.coverBg}>
                {page.imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt
                  <Image src={page.imageUrl} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <View style={{ width: "100%", height: "100%", backgroundColor: "#fafafa" }} />
                )}
              </View>

              <View
                style={[
                  styles.coverOverlay,
                  {
                    left: padding.horizontal,
                    right: padding.horizontal,
                    top: padding.top,
                    bottom: padding.bottom,
                  },
                ]}
              >
                <Text style={styles.coverTitle}>{page.title}</Text>
                {page.logline ? <Text style={styles.coverLogline}>{page.logline}</Text> : null}
                <Text style={styles.coverMeta}>A comic book</Text>
              </View>
            </Page>
          )
        }
        if (page.role === "credits") {
          return (
            <Page
              key={`book-${pageIdx}-${page.role}`}
              size={pageSize}
              style={[styles.page, { paddingTop: padding.top, paddingBottom: padding.bottom, paddingHorizontal: padding.horizontal }]}
            >
              <Text style={styles.frontMatterTitle}>{page.credits.title}</Text>
              {page.credits.subtitle ? <Text style={styles.frontMatterSubTitle}>{page.credits.subtitle}</Text> : null}
              {page.credits.logline ? (
                <Text style={[styles.frontMatterLine, { color: "#404040" }]}>{page.credits.logline}</Text>
              ) : null}

              <View style={{ marginTop: 14 }}>
                {page.credits.creditsLines.map((line, idx) => (
                  <Text key={`credit-${idx}`} style={styles.frontMatterLine}>
                    {line}
                  </Text>
                ))}
              </View>

              <View style={{ marginTop: 12 }}>
                {page.credits.metaLines.map((line, idx) => (
                  <Text key={`meta-${idx}`} style={styles.frontMatterMeta}>
                    {line}
                  </Text>
                ))}
              </View>
            </Page>
          )
        }
        if (page.role === "indicia") {
          return (
            <Page
              key={`book-${pageIdx}-${page.role}`}
              size={pageSize}
              style={[styles.page, { paddingTop: padding.top, paddingBottom: padding.bottom, paddingHorizontal: padding.horizontal }]}
            >
              <Text style={styles.indiciaHeading}>{page.indicia.heading}</Text>
              {page.indicia.paragraphs.map((p, idx) => (
                <Text key={`indicia-${idx}`} style={styles.indiciaPara}>
                  {p}
                </Text>
              ))}
            </Page>
          )
        }
        if (page.role === "back_cover") {
          return (
            <Page key={`book-${pageIdx}-${page.role}`} size={pageSize} style={styles.coverPage}>
              <View style={styles.coverBg}>
                {page.imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt
                  <Image src={page.imageUrl} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <View style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0a" }} />
                )}
              </View>

              <View
                style={[
                  styles.coverOverlay,
                  {
                    justifyContent: "flex-start",
                    left: padding.horizontal,
                    right: padding.horizontal,
                    top: padding.top,
                    bottom: padding.bottom,
                  },
                ]}
              >
                <Text style={[styles.coverMeta, { color: "#e5e5e5" }]}>{page.title}</Text>
              </View>
            </Page>
          )
        }
        if (page.role !== "story") return null

        return (
          <Page
            key={`book-${pageIdx}-${page.role}-${page.story.storyPageNumber}`}
            size={pageSize}
            style={[styles.page, { paddingTop: padding.top, paddingBottom: padding.bottom, paddingHorizontal: padding.horizontal }]}
          >
            <View style={[styles.interiorStack, { width: contentWidth }]}>
              {page.story.rows.map((row, rowIdx) => (
                <View key={`row-${page.story.storyPageNumber}-${rowIdx}`} style={[styles.row, { width: contentWidth }]}>
                  {row.map((panelIndex, cellIdx) => {
                    const panel = comic.panels[panelIndex]
                    if (!panel) return null
                    return (
                      <PdfPanelCell
                        key={panel.id}
                        panel={panel}
                        pageLayout={pageLayout}
                        row={row}
                        panelIdx={panelIndex}
                        isLastInRow={cellIdx === row.length - 1}
                        contentWidth={contentWidth}
                      />
                    )
                  })}
                </View>
              ))}
            </View>

            <PdfFolio
              title={page.story.folioTitle}
              pageNumber={page.story.storyPageNumber}
              paddingHorizontal={padding.horizontal}
              bottom={Math.max(8, padding.bottom - 18)}
            />
          </Page>
        )
      })}
    </Document>
  )
}
