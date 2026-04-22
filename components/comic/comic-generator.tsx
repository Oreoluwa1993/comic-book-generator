"use client"

import type { ReactNode } from "react"
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { pdf } from "@react-pdf/renderer"
import { v4 as uuidv4 } from "uuid"
import {
  BookOpen,
  ChevronDown,
  Download,
  ImageIcon,
  ListTree,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { Collapsible } from "@base-ui/react/collapsible"

import {
  describeCharacterFromReferences,
  embedImageUrlForPdf,
  generateComic,
  generateComicSinglePanelImage,
  reviewLayout,
} from "@/app/actions"
import { getCharacterDetail, listCharacters } from "@/app/characters/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LayoutReviewResult } from "@/lib/layout-review/schema"
import { buildDraftImagePromptFromChoreography } from "@/lib/panel-choreography"
import {
  getPanelRole,
  LAYOUT_PRESETS,
  resolveComicLayoutRows,
  type PageLayoutPreset,
  type PanelPresentationRole,
} from "@/lib/comic-layout"
import {
  clampPanelCount,
  MAX_PANEL_COUNT,
  MAX_REFERENCE_FILES,
  type Comic,
  type ComicCharacter,
  type ComicPanel,
  type ComicPanelText,
  type ComicStyleProfile,
  type ComicTone,
  type GenerateComicResult,
} from "@/lib/comic"
import { ComicPdfDocument } from "./comic-pdf"
import { formatReaderSpeechLine } from "@/lib/comic-reader-text"

type GeneratorState = {
  result: GenerateComicResult | null
}

const createStableId = () => {
  const hasCryptoUuid =
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  return hasCryptoUuid ? globalThis.crypto.randomUUID() : uuidv4()
}

const defaultState: GeneratorState = { result: null }

const tones: Array<{ value: ComicTone; label: string }> = [
  { value: "funny", label: "Funny" },
  { value: "serious", label: "Serious" },
  { value: "wholesome", label: "Wholesome" },
  { value: "mystery", label: "Mystery" },
  { value: "action", label: "Action" },
]

const styleProfiles: Array<{ value: ComicStyleProfile; label: string; help: string }> = [
  { value: "comic", label: "Comic (Marvel/Dark Horse craft)", help: "Bold staging, readable silhouettes, cinematic ink/color." },
  { value: "manga", label: "Manga", help: "Decompressed beats, expressive faces, strong value control, clear action arcs." },
  { value: "anime", label: "Anime (incl. Ghibli sensibility)", help: "Cinematic shot progression, emotive lighting, lived-in environments." },
  { value: "hybrid", label: "Hybrid (Comic + Manga/Anime)", help: "Comic readability with manga pacing + anime cinematics." },
]

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.click()
  URL.revokeObjectURL(url)
}

const getSafeFilename = (title: string) => {
  const base = title.trim() || "comic"
  return base
    .replaceAll(/[^\w\- ]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replaceAll(" ", "-")
    .toLowerCase()
}

const readBlobAsDataUrl = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const embedRemoteImagesForPdf = async (source: Comic): Promise<Comic> => {
  const panels = await Promise.all(
    source.panels.map(async (p) => {
      if (!p.imageUrl) return p
      if (p.imageUrl.startsWith("data:")) return p
      if (!p.imageUrl.startsWith("http")) return p

      const server = await embedImageUrlForPdf(p.imageUrl)
      if (server.ok) {
        return { ...p, imageUrl: server.dataUrl }
      }

      try {
        const res = await fetch(p.imageUrl)
        if (!res.ok) return p
        const blob = await res.blob()
        const dataUrl = await readBlobAsDataUrl(blob)
        return { ...p, imageUrl: dataUrl }
      } catch {
        return p
      }
    })
  )
  return { ...source, panels }
}

const getPanelTextByKind = (texts: ComicPanelText[], kind: ComicPanelText["kind"]) => {
  return texts.filter((t) => t.kind === kind)
}

type PreviewMode = "reader" | "details"

const SAMPLE_PREMISE = `A shy librarian discovers a bookmark that whispers the next chapter of any book overnight. When the bookmark predicts a tragedy in her own life, she teams up with a skeptical bookbinder to rewrite the ending — one panel at a time.`

const allPanelsHaveImages = (comic: Comic | null) =>
  !!comic && comic.panels.length > 0 && comic.panels.every((p) => Boolean(p.imageUrl))

type FlowStepKey = "script" | "art" | "export"

const CHARACTER_LOCK_START = "CHARACTER LOCK:"
const CHARACTER_LOCK_END = "END CHARACTER LOCK"

const extractCharacterLockBlock = (rawPrompt: string | undefined) => {
  const prompt = String(rawPrompt ?? "")
  const startIdx = prompt.indexOf(CHARACTER_LOCK_START)
  if (startIdx < 0) return null
  const afterStart = prompt.slice(startIdx + CHARACTER_LOCK_START.length)
  const endIdx = afterStart.indexOf(CHARACTER_LOCK_END)
  const block = (endIdx >= 0 ? afterStart.slice(0, endIdx) : afterStart).trim()
  if (!block) return null
  return block
}

const parseCharactersFromLock = (lockBlock: string): ComicCharacter[] => {
  const lines = lockBlock
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const parsed = lines
    .map((line) => {
      const match = /^(.+?):\s*(.+)$/.exec(line)
      if (!match) return null
      const name = match[1]?.trim() ?? ""
      const description = match[2]?.trim() ?? ""
      if (!name || !description) return null
      return {
        id: createStableId(),
        name,
        description,
        referenceUrls: [],
        referenceImages: [],
      } satisfies ComicCharacter
    })
    .filter(Boolean) as ComicCharacter[]

  return parsed
}

const buildCharacterLockFromCharacters = (characters: ComicCharacter[] | undefined) => {
  if (!characters || characters.length === 0) return ""
  return characters
    .map((c) => {
      const name = c.name.trim()
      const desc = c.description.trim()
      if (!name || !desc) return null
      return `${name}: ${desc}`
    })
    .filter(Boolean)
    .join(" ")
}

const readFileAsBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const ComicFlowStepper = ({ comic }: { comic: Comic | null }) => {
  const hasScript = Boolean(comic)
  const artComplete = allPanelsHaveImages(comic)
  const activeStep: FlowStepKey = !hasScript ? "script" : !artComplete ? "art" : "export"

  const stepClass = (key: FlowStepKey) => {
    const isActive = activeStep === key
    const isDone =
      (key === "script" && hasScript) ||
      (key === "art" && artComplete) ||
      (key === "export" && hasScript && artComplete)
    return cn(
      "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs sm:px-3 sm:text-sm",
      isActive && "border-primary/40 bg-primary/5 font-medium text-foreground",
      !isActive && isDone && "border-border bg-muted/40 text-muted-foreground",
      !isActive && !isDone && "border-dashed border-border/80 text-muted-foreground"
    )
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">Progress</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        <div className={stepClass("script")}>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold sm:size-7 sm:text-xs",
              activeStep === "script" && "border-primary bg-primary text-primary-foreground",
              activeStep !== "script" && hasScript && "border-emerald-600/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
              activeStep !== "script" && !hasScript && "border-muted-foreground/30 bg-background"
            )}
            aria-hidden="true"
          >
            {hasScript ? "✓" : "1"}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block">Script</span>
            <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">Premise → panels + dialogue</span>
          </span>
        </div>
        <div className={stepClass("art")}>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold sm:size-7 sm:text-xs",
              activeStep === "art" && "border-primary bg-primary text-primary-foreground",
              activeStep !== "art" && artComplete && "border-emerald-600/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
              activeStep !== "art" && !artComplete && "border-muted-foreground/30 bg-background"
            )}
            aria-hidden="true"
          >
            {artComplete ? "✓" : "2"}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block">Panel art</span>
            <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">Render images for each panel</span>
          </span>
        </div>
        <div className={stepClass("export")}>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold sm:size-7 sm:text-xs",
              activeStep === "export" && "border-primary bg-primary text-primary-foreground",
              activeStep !== "export" && hasScript && artComplete && "border-emerald-600/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
              activeStep !== "export" && !(hasScript && artComplete) && "border-muted-foreground/30 bg-background"
            )}
            aria-hidden="true"
          >
            {hasScript && artComplete ? "✓" : "3"}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block">Export</span>
            <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">Download PDF anytime</span>
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Script generation may take a little while. Panel images can take several minutes when you have many panels — keep this tab open.
      </p>
    </div>
  )
}

const getPanelShellClass = (role: PanelPresentationRole) =>
  cn(
    "flex flex-col overflow-hidden",
    role === "uniform" &&
      "rounded-lg border-4 border-zinc-900 bg-zinc-50 shadow-[6px_6px_0_0_rgb(24_24_27)]",
    role === "manga-bleed" &&
      "rounded-lg border border-zinc-900 bg-zinc-50 md:border md:border-y md:border-r-4 md:border-l-0 md:border-zinc-900 md:shadow-none",
    role === "manga-sidebar" &&
      "rounded-lg border-4 border-zinc-900 bg-zinc-50 shadow-[4px_4px_0_0_rgb(24_24_27)]",
    (role === "manga-solo" || role === "tier-full") &&
      "w-full rounded-lg border-4 border-zinc-900 bg-zinc-50 shadow-[6px_6px_0_0_rgb(24_24_27)]",
    role === "tier-half" &&
      "h-full rounded-lg border-4 border-zinc-900 bg-zinc-50 shadow-[6px_6px_0_0_rgb(24_24_27)]"
  )

const getPanelImageClass = (role: PanelPresentationRole) =>
  cn(
    // object-contain avoids cropping generated art (object-cover was clipping heads at fixed aspect ratios).
    "w-full object-contain",
    role === "manga-bleed" && "aspect-video md:min-h-[200px] md:aspect-auto",
    role === "manga-sidebar" && "aspect-[3/4]",
    (role === "manga-solo" || role === "tier-full") && "aspect-video md:max-h-72 md:min-h-48",
    role === "tier-half" && "aspect-4/3",
    role === "uniform" && "aspect-4/3"
  )

type ComicPanelBlockProps = {
  comic: Comic
  panel: ComicPanel
  globalIdx: number
  role: PanelPresentationRole
  previewMode: PreviewMode
  isRenderingImage?: boolean
  progressLabel?: string | null
  onUpdatePanel?: (panelId: string, patch: Partial<ComicPanel>) => void
  onRegenerateDraftPrompt?: (panelId: string) => void
  onAcceptDraftPrompt?: (panelId: string) => void
  onClearDraftPrompt?: (panelId: string) => void
}

const ComicPanelBlock = ({
  comic,
  panel,
  globalIdx,
  role,
  previewMode,
  isRenderingImage,
  progressLabel,
  onUpdatePanel,
  onRegenerateDraftPrompt,
  onAcceptDraftPrompt,
  onClearDraftPrompt,
}: ComicPanelBlockProps) => {
  const idx = globalIdx
  const compactMeta = role === "manga-sidebar" || role === "tier-half"
  const isReader = previewMode === "reader"
  const isDetails = previewMode === "details"

  return (
    <article className={getPanelShellClass(role)}>
      {panel.imageUrl ? (
        <div className="relative border-b-4 border-zinc-900 bg-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={panel.imageUrl}
            alt={`Panel ${idx + 1}: ${panel.title}`}
            className={getPanelImageClass(role)}
          />
          <div className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded border-2 border-zinc-900 bg-white px-1.5 font-mono text-xs font-bold text-zinc-900 shadow-sm">
            {idx + 1}
          </div>
          {isRenderingImage ? (
            <div className="absolute bottom-2 left-2 rounded-full border-2 border-zinc-900 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 shadow-sm">
              Rendering…{progressLabel ? <span className="ml-1 font-mono text-[10px]">{progressLabel}</span> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="relative flex min-h-18 items-center justify-center border-b-4 border-dashed border-zinc-900 bg-zinc-100 text-xs text-muted-foreground">
          Panel {idx + 1} — generate images to fill
          {isRenderingImage ? (
            <div className="absolute bottom-2 left-2 rounded-full border-2 border-zinc-900 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 shadow-sm">
              Rendering…{progressLabel ? <span className="ml-1 font-mono text-[10px]">{progressLabel}</span> : null}
            </div>
          ) : null}
        </div>
      )}
      <div className={cn("flex flex-1 flex-col", compactMeta ? "p-2.5 sm:p-3" : "p-3 sm:p-4")}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={cn("font-semibold leading-snug", compactMeta ? "text-xs sm:text-sm" : "text-sm")}>
            <span className="text-muted-foreground">{idx + 1}. </span>
            {panel.title}
          </h3>
          {!isReader ? (
            <span className="shrink-0 rounded-full border border-zinc-900 bg-white px-2 py-0.5 text-[10px] text-zinc-800 sm:text-xs">
              {comic.tone}
            </span>
          ) : null}
        </div>

        {!isReader && !comic.seriesStyleBlurb && panel.imageReferenceNotes ? (
          <p className="mt-2 text-[11px] italic text-muted-foreground sm:text-xs">
            <span className="font-medium not-italic text-foreground">Reference:</span> {panel.imageReferenceNotes}
          </p>
        ) : null}

        <div className={cn("mt-3 grid gap-2", compactMeta && "gap-1.5")}>
          {!isReader ? (
            <>
              <div className="grid gap-1">
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Description</p>
                <p className={cn("text-muted-foreground", compactMeta ? "text-[11px] sm:text-xs" : "text-sm")}>{panel.description}</p>
              </div>

              {isDetails ? (
                <div className="grid gap-2">
                  <div className="grid gap-1.5">
                    <label htmlFor={`stageNotes-${panel.id}`} className="text-xs font-medium text-muted-foreground">
                      Stage notes (blocking / pose / expression / camera)
                    </label>
                    <textarea
                      id={`stageNotes-${panel.id}`}
                      value={panel.stageNotes ?? ""}
                      onChange={(e) => onUpdatePanel?.(panel.id, { stageNotes: e.target.value })}
                      rows={4}
                      className={cn(
                        "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                        "focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                      aria-label={`Stage notes for panel ${idx + 1}`}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor={`microBeats-${panel.id}`} className="text-xs font-medium text-muted-foreground">
                      Micro-beats (3–6, one per line)
                    </label>
                    <textarea
                      id={`microBeats-${panel.id}`}
                      value={(panel.microBeats ?? []).join("\n")}
                      onChange={(e) =>
                        onUpdatePanel?.(panel.id, {
                          microBeats: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .slice(0, 8),
                        })
                      }
                      rows={4}
                      className={cn(
                        "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                        "focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                      aria-label={`Micro-beats for panel ${idx + 1}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => onRegenerateDraftPrompt?.(panel.id)}
                        disabled={!onRegenerateDraftPrompt}
                        aria-label={`Regenerate draft prompt for panel ${idx + 1}`}
                      >
                        Regenerate draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => onClearDraftPrompt?.(panel.id)}
                        disabled={!panel.draftImagePrompt || !onClearDraftPrompt}
                        aria-label={`Clear draft prompt for panel ${idx + 1}`}
                      >
                        Clear draft
                      </Button>
                    </div>
                  </div>

                  {panel.draftImagePrompt ? (
                    <div className="grid gap-1.5 rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Draft image prompt (from choreography)</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{panel.draftImagePrompt}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          onClick={() => onAcceptDraftPrompt?.(panel.id)}
                          disabled={!onAcceptDraftPrompt}
                          aria-label={`Accept draft prompt for panel ${idx + 1}`}
                        >
                          Accept draft → image prompt
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-1.5">
                    <label htmlFor={`imagePrompt-${panel.id}`} className="text-xs font-medium text-muted-foreground">
                      Image prompt (manual, used for rendering)
                    </label>
                    <textarea
                      id={`imagePrompt-${panel.id}`}
                      value={panel.imagePrompt}
                      onChange={(e) => onUpdatePanel?.(panel.id, { imagePrompt: e.target.value })}
                      rows={5}
                      className={cn(
                        "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                        "focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                      aria-label={`Image prompt for panel ${idx + 1}`}
                    />
                  </div>
                </div>
              ) : !compactMeta ? (
                <div className="grid gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Image prompt</p>
                  <p className="text-sm text-muted-foreground">{panel.imagePrompt}</p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="grid gap-1">
            {!isReader ? <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Text</p> : null}
            {panel.texts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground sm:text-xs">(No dialogue)</p>
            ) : (
              <ul className={cn("grid gap-0.5", isReader && "gap-1")}>
                {getPanelTextByKind(panel.texts, "caption").map((t, lineIdx) => (
                  <li key={`${panel.id}-line-${lineIdx}`} className="text-[11px] text-muted-foreground sm:text-xs">
                    {isReader ? (
                      <>
                        <span className="text-muted-foreground/80">Caption: </span>
                        {t.text}
                      </>
                    ) : (
                      <>- (Caption) {t.text}</>
                    )}
                  </li>
                ))}
                {getPanelTextByKind(panel.texts, "speech").map((t, lineIdx) => (
                  <li key={`${panel.id}-speech-${lineIdx}`} className="text-[11px] text-muted-foreground sm:text-xs">
                    {isReader ? formatReaderSpeechLine(t) : <>- {formatReaderSpeechLine(t)}</>}
                  </li>
                ))}
                {getPanelTextByKind(panel.texts, "thought").map((t, lineIdx) => (
                  <li key={`${panel.id}-thought-${lineIdx}`} className="text-[11px] italic text-muted-foreground sm:text-xs">
                    {isReader ? (
                      <>
                        <span className="not-italic text-muted-foreground/80">Thought: </span>
                        {formatReaderSpeechLine(t)}
                      </>
                    ) : (
                      <>- (Thought) {formatReaderSpeechLine(t)}</>
                    )}
                  </li>
                ))}
                {getPanelTextByKind(panel.texts, "sfx").map((t, lineIdx) => (
                  <li key={`${panel.id}-sfx-${lineIdx}`} className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {isReader ? t.text : <>- (SFX) {t.text}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export type ComicGeneratorProps = {
  initialComic?: Comic | null
  onComicChange?: (comic: Comic | null) => void
  toolbarActions?: ReactNode
}

export const ComicGenerator = ({ initialComic = null, onComicChange, toolbarActions }: ComicGeneratorProps) => {
  const [premise, setPremise] = useState("")
  const [tone, setTone] = useState<ComicTone>("funny")
  const [styleProfile, setStyleProfile] = useState<ComicStyleProfile>("comic")
  const [panelCount, setPanelCount] = useState(6)
  const [referenceUrls, setReferenceUrls] = useState("")
  const [referenceStyleNotes, setReferenceStyleNotes] = useState("")
  const [comic, setComic] = useState<Comic | null>(initialComic)
  const [isDownloading, setIsDownloading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [characterError, setCharacterError] = useState<string | null>(null)
  const [isPendingCharacter, startCharacterTransition] = useTransition()
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [libraryCharacters, setLibraryCharacters] = useState<Array<{ id: string; name: string; locked: boolean }> | null>(null)
  const [selectedLibraryCharacterId, setSelectedLibraryCharacterId] = useState<string>("")
  const [isPendingLibrary, startLibraryTransition] = useTransition()
  const [pageLayout, setPageLayout] = useState<PageLayoutPreset>("comic-tiers")
  const [useNarrativeLayout, setUseNarrativeLayout] = useState(true)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("reader")
  const [scriptGenerationSucceeded, setScriptGenerationSucceeded] = useState(false)
  const [isCharacterDesignsOpen, setIsCharacterDesignsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const hasFocusedPreviewRef = useRef(false)
  const firstPanelRef = useRef<HTMLDivElement>(null)

  const [isPendingImages, startImageTransition] = useTransition()
  const [renderingPanelIds, setRenderingPanelIds] = useState<Set<string>>(() => new Set())
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number } | null>(null)
  const cancelRenderRef = useRef(false)
  const [isPendingLayoutReview, startLayoutReviewTransition] = useTransition()
  const [layoutReview, setLayoutReview] = useState<LayoutReviewResult | null>(null)

  const [state, action, isPending] = useActionState(
    async (_prev: GeneratorState, formData: FormData): Promise<GeneratorState> => {
      const result = await generateComic(formData)
      return { result }
    },
    defaultState
  )

  useEffect(() => {
    if (state.result?.ok) {
      const generated = state.result.comic
      const lockBlock = extractCharacterLockBlock(generated.panels?.[0]?.imagePrompt)
      const parsedCharacters = lockBlock ? parseCharactersFromLock(lockBlock) : []
      const inferredLock = buildCharacterLockFromCharacters(parsedCharacters)
      setComic({
        ...generated,
        characters: parsedCharacters.length > 0 ? parsedCharacters : generated.characters,
        characterLock: inferredLock.length > 0 ? inferredLock : generated.characterLock,
      })
      setImageError(null)
      setCharacterError(null)
      setScriptGenerationSucceeded(true)
    }
  }, [state.result])

  useEffect(() => {
    setComic(initialComic)
    setImageError(null)
    setCharacterError(null)
    setLibraryError(null)
    setLayoutReview(null)
    setScriptGenerationSucceeded(false)
  }, [initialComic])

  useEffect(() => {
    onComicChange?.(comic)
  }, [comic, onComicChange])

  useEffect(() => {
    if (isPending) setScriptGenerationSucceeded(false)
  }, [isPending])

  useEffect(() => {
    if (comic && !hasFocusedPreviewRef.current) {
      hasFocusedPreviewRef.current = true
      const isDesktop =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 1024px)").matches

      if (!isDesktop) {
        requestAnimationFrame(() => {
          previewHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      }

      previewHeadingRef.current?.focus()
    }
    if (!comic) hasFocusedPreviewRef.current = false
  }, [comic])

  const error = useMemo(() => {
    if (!state.result) return null
    if (state.result.ok) return null
    return state.result.error
  }, [state.result])

  const layoutRows = useMemo(
    () => (comic ? resolveComicLayoutRows(pageLayout, comic.panels, useNarrativeLayout) : []),
    [comic, pageLayout, useNarrativeLayout]
  )

  const handlePageLayoutChange = (value: PageLayoutPreset) => {
    setPageLayout(value)
  }

  const handleDownloadPdf = async () => {
    if (!comic) return
    if (isDownloading) return

    setIsDownloading(true)
    try {
      const forPdf = await embedRemoteImagesForPdf(comic)
      const blob = await pdf(
        <ComicPdfDocument comic={forPdf} pageLayout={pageLayout} useNarrativeLayout={useNarrativeLayout} />
      ).toBlob()
      downloadBlob(blob, `${getSafeFilename(comic.title)}.pdf`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleReset = () => {
    setPremise("")
    setTone("funny")
    setStyleProfile("comic")
    setPanelCount(6)
    setReferenceUrls("")
    setReferenceStyleNotes("")
    setComic(null)
    setImageError(null)
    setScriptGenerationSucceeded(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleInsertSamplePremise = () => {
    setPremise(SAMPLE_PREMISE)
    setTone("wholesome")
    setStyleProfile("hybrid")
    setPanelCount(6)
  }

  const handleGeneratePanelImages = () => {
    if (!comic) return
    setImageError(null)
    startImageTransition(async () => {
      cancelRenderRef.current = false
      setIsCharacterDesignsOpen(false)
      requestAnimationFrame(() => {
        firstPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })

      // Progressive rendering: update the UI as each panel finishes.
      const panelIds = comic.panels.filter((p) => !p.imageUrl).map((p) => p.id)
      if (panelIds.length === 0) return

      const staggerRaw = process.env.NEXT_PUBLIC_OPENAI_IMAGE_STAGGER_MS
      const staggerMs = staggerRaw !== undefined && staggerRaw !== "" ? Math.max(0, Number(staggerRaw) || 0) : 450

      setRenderingPanelIds(new Set(panelIds))
      setRenderProgress({ done: 0, total: panelIds.length })

      let workingComic = comic
      for (let i = 0; i < panelIds.length; i++) {
        const panelId = panelIds[i]!
        if (cancelRenderRef.current) break
        if (i > 0 && staggerMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, staggerMs))
        }
        const res = await generateComicSinglePanelImage(workingComic, panelId)
        if (!res.ok) {
          setImageError(res.error)
          break
        }
        workingComic = {
          ...workingComic,
          panels: workingComic.panels.map((p) => (p.id === res.panelId ? { ...p, imageUrl: res.imageUrl } : p)),
        }
        setComic((prev) => {
          if (!prev) return prev
          const nextPanels = prev.panels.map((p) => (p.id === res.panelId ? { ...p, imageUrl: res.imageUrl } : p))
          return { ...prev, panels: nextPanels }
        })
        setRenderingPanelIds((prev) => {
          const next = new Set(prev)
          next.delete(panelId)
          return next
        })
        setRenderProgress((prev) => {
          if (!prev) return prev
          return { ...prev, done: Math.min(prev.total, prev.done + 1) }
        })
      }

      setRenderingPanelIds(new Set())
      setRenderProgress(null)
    })
  }

  const handleCancelPanelRendering = () => {
    cancelRenderRef.current = true
    setRenderingPanelIds(new Set())
    setRenderProgress(null)
  }

  const handleAddCharacter = () => {
    if (!comic) return
    const next: ComicCharacter = {
      id: createStableId(),
      name: "New character",
      description: "",
      referenceUrls: [],
      referenceImages: [],
    }
    setComic({ ...comic, characters: [...(comic.characters ?? []), next] })
  }

  const handleRemoveCharacter = (characterId: string) => {
    if (!comic) return
    const next = (comic.characters ?? []).filter((c) => c.id !== characterId)
    setComic({ ...comic, characters: next })
  }

  const handleUpdateCharacter = (characterId: string, patch: Partial<ComicCharacter>) => {
    if (!comic) return
    const next = (comic.characters ?? []).map((c) => (c.id === characterId ? { ...c, ...patch } : c))
    setComic({ ...comic, characters: next })
  }

  const handleApplyCharacterLock = () => {
    if (!comic) return
    const lock = buildCharacterLockFromCharacters(comic.characters)
    setComic({ ...comic, characterLock: lock.length > 0 ? lock : undefined })
  }

  const handleLoadCharacterLibrary = () => {
    setLibraryError(null)
    startLibraryTransition(async () => {
      const res = await listCharacters()
      if (!res.ok) {
        setLibraryError(res.error)
        setLibraryCharacters(null)
        return
      }
      const items = res.characters.map((c) => ({
        id: c.id,
        name: c.name,
        locked: Boolean(c.locked_version_id),
      }))
      setLibraryCharacters(items)
      const firstLocked = items.find((i) => i.locked)
      setSelectedLibraryCharacterId(firstLocked?.id ?? items[0]?.id ?? "")
    })
  }

  const handleAddLockedCharacterFromLibrary = () => {
    if (!comic) return
    if (!selectedLibraryCharacterId) {
      setLibraryError("Select a character first.")
      return
    }
    setLibraryError(null)
    startLibraryTransition(async () => {
      const res = await getCharacterDetail(selectedLibraryCharacterId)
      if (!res.ok) {
        setLibraryError(res.error)
        return
      }
      const lockedVersion = res.character.versions.find((v) => v.status === "locked")
      if (!lockedVersion) {
        setLibraryError("That character has no locked version yet. Lock a version in the Character Designer first.")
        return
      }
      const identity = String(lockedVersion.identity_text ?? "").trim()
      if (!identity) {
        setLibraryError("Locked version is missing identity text. Generate a draft first.")
        return
      }
      const refUrls = lockedVersion.assets
        .filter((a) => ["turnaround", "expressions", "outfit"].includes(a.asset_type))
        .map((a) => a.public_url)
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .slice(0, 6)

      const next: ComicCharacter = {
        id: createStableId(),
        name: res.character.name,
        description: identity,
        referenceUrls: refUrls,
        referenceImages: [],
      }

      const nextCharacters = [...(comic.characters ?? []), next]
      const lock = buildCharacterLockFromCharacters(nextCharacters)
      setComic({ ...comic, characters: nextCharacters, characterLock: lock.length > 0 ? lock : comic.characterLock })
    })
  }

  const handleDescribeCharacter = (characterId: string) => {
    if (!comic) return
    const character = (comic.characters ?? []).find((c) => c.id === characterId)
    if (!character) return

    setCharacterError(null)
    startCharacterTransition(async () => {
      const res = await describeCharacterFromReferences({
        name: character.name,
        notes: character.description,
        referenceUrls: character.referenceUrls,
        referenceImages: character.referenceImages,
      })
      if (!res.ok) {
        setCharacterError(res.error)
        return
      }
      handleUpdateCharacter(characterId, { description: res.description })
    })
  }

  const handleCharacterFilesSelected = async (characterId: string, files: FileList | null) => {
    if (!comic) return
    if (!files || files.length === 0) return
    const picked = Array.from(files).slice(0, 5)
    const images = await Promise.all(
      picked.map(async (f) => {
        const dataUrl = await readFileAsBase64(f)
        const base64 = dataUrl.split("base64,")[1] ?? ""
        return { mime: f.type || "image/png", base64 }
      })
    )
    handleUpdateCharacter(characterId, { referenceImages: images.filter((i) => i.base64.length > 0) })
  }

  const handleClearReferenceFiles = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRunLayoutReview = () => {
    startLayoutReviewTransition(async () => {
      const res = await reviewLayout()
      setLayoutReview(res)
    })
  }

  const isLayoutReviewEnabled = ["1", "true", "yes", "on"].includes(
    String(process.env.NEXT_PUBLIC_LAYOUT_REVIEW_ENABLED ?? "")
      .trim()
      .toLowerCase()
  )

  const handleUpdatePanel = (panelId: string, patch: Partial<ComicPanel>) => {
    setComic((prev) => {
      if (!prev) return prev
      const nextPanels = prev.panels.map((p) => (p.id === panelId ? { ...p, ...patch } : p))
      return { ...prev, panels: nextPanels }
    })
  }

  const handleRegenerateDraftPrompt = (panelId: string) => {
    setComic((prev) => {
      if (!prev) return prev
      const nextPanels = prev.panels.map((p) => {
        if (p.id !== panelId) return p
        const draft = buildDraftImagePromptFromChoreography({ stageNotes: p.stageNotes, microBeats: p.microBeats })
        return { ...p, draftImagePrompt: draft.length > 0 ? draft : undefined }
      })
      return { ...prev, panels: nextPanels }
    })
  }

  const handleAcceptDraftPrompt = (panelId: string) => {
    setComic((prev) => {
      if (!prev) return prev
      const nextPanels = prev.panels.map((p) => {
        if (p.id !== panelId) return p
        const draft = String(p.draftImagePrompt ?? "").trim()
        if (!draft) return p
        return { ...p, imagePrompt: draft, draftImagePrompt: undefined }
      })
      return { ...prev, panels: nextPanels }
    })
  }

  const handleClearDraftPrompt = (panelId: string) => {
    setComic((prev) => {
      if (!prev) return prev
      const nextPanels = prev.panels.map((p) => (p.id === panelId ? { ...p, draftImagePrompt: undefined } : p))
      return { ...prev, panels: nextPanels }
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <ComicFlowStepper comic={comic} />
      {isLayoutReviewEnabled ? (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Layout review (dev-only)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Runs your UX + Dev personas against the current UI and returns a structured critique and change list.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              onClick={handleRunLayoutReview}
              disabled={isPendingLayoutReview}
              aria-label="Run layout review"
            >
              {isPendingLayoutReview ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Reviewing…
                </>
              ) : (
                "Run layout review"
              )}
            </Button>
          </div>

          {layoutReview ? (
            <div className="mt-3 grid gap-3">
              {!layoutReview.ok ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Layout review failed: {layoutReview.error}
                  {layoutReview.rawText ? (
                    <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-background p-2 text-[11px] text-muted-foreground">
                      {layoutReview.rawText}
                    </pre>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">UX issues</p>
                    <ul className="mt-2 grid gap-2">
                      {layoutReview.ux.issues.slice(0, 10).map((i) => (
                        <li key={i.id} className="rounded-lg border p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold">{i.id}</span>
                            <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {i.severity}
                            </span>
                            <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {i.target}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{i.evidence}</p>
                          <p className="mt-1 text-xs">
                            <span className="font-medium">Recommendation:</span> {i.recommendation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">Dev change list</p>
                    <ul className="mt-2 grid gap-2">
                      {layoutReview.dev.changes.slice(0, 7).map((c) => (
                        <li key={`${c.priority}-${c.summary}`} className="rounded-lg border p-2">
                          <p className="text-xs font-semibold">
                            P{c.priority}: {c.summary}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{c.rationale}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Files: {c.targetFiles.join(", ")}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Generator</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Script first, then generate panel art. Add reference images or notes for continuity.
              </p>
            </div>
            <Sparkles className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          </div>

          <form action={action} className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center">
                <label htmlFor="premise" className="text-sm font-medium">
                  Story or premise
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleInsertSamplePremise}
                >
                  Insert sample
                </Button>
              </div>
              <textarea
                id="premise"
                name="premise"
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                rows={5}
                placeholder="Paste a full story or a one-line idea — the app follows your text and splits it into panels…"
                className={cn(
                  "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                aria-label="Comic story or premise"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="tone" className="text-sm font-medium">
                Tone
              </label>
              <select
                id="tone"
                name="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as ComicTone)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                aria-label="Comic tone"
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="styleProfile" className="text-sm font-medium">
                Art style
              </label>
              <select
                id="styleProfile"
                name="styleProfile"
                value={styleProfile}
                onChange={(e) => setStyleProfile(e.target.value as ComicStyleProfile)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                aria-label="Art style profile"
              >
                {styleProfiles.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{styleProfiles.find((p) => p.value === styleProfile)?.help}</p>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="panelCount" className="text-sm font-medium">
                Panels <span className="text-muted-foreground">(1–{MAX_PANEL_COUNT})</span>
              </label>
              <input
                id="panelCount"
                name="panelCount"
                value={panelCount}
                onChange={(e) => setPanelCount(clampPanelCount(Number(e.target.value)))}
                type="number"
                min={1}
                max={MAX_PANEL_COUNT}
                className={cn(
                  "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                aria-label="Panel count"
              />
            </div>

            <Collapsible.Root defaultOpen={false} className="grid gap-1.5">
              <Collapsible.Trigger
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-sm font-medium outline-none",
                  "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                  "data-panel-open:border-border data-panel-open:bg-muted/30",
                  "data-panel-open:[&_svg]:rotate-180"
                )}
              >
                <span>Reference images and style (optional)</span>
                <ChevronDown className="size-4 shrink-0 transition-transform" aria-hidden="true" />
              </Collapsible.Trigger>
              <Collapsible.Panel keepMounted className="grid gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="referenceUrls" className="text-sm font-medium">
                    Reference image URLs <span className="text-muted-foreground">(optional, one per line)</span>
                  </label>
                  <textarea
                    id="referenceUrls"
                    name="referenceUrls"
                    value={referenceUrls}
                    onChange={(e) => setReferenceUrls(e.target.value)}
                    rows={3}
                    placeholder={"https://example.com/character.png\nhttps://example.com/location.jpg"}
                    className={cn(
                      "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                      "focus-visible:ring-3 focus-visible:ring-ring/50"
                    )}
                    aria-label="Reference image URLs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Public HTTPS URLs only. References inform art style (line, color, texture) — not story content unless you describe it in the story field.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="referenceStyleNotes" className="text-sm font-medium">
                    Visual / style notes <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="referenceStyleNotes"
                    name="referenceStyleNotes"
                    value={referenceStyleNotes}
                    onChange={(e) => setReferenceStyleNotes(e.target.value)}
                    rows={2}
                    placeholder="Flat color, ligne claire, 80s sci-fi palette, recurring red scarf on the hero…"
                    className={cn(
                      "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                      "focus-visible:ring-3 focus-visible:ring-ring/50"
                    )}
                    aria-label="Visual and style reference notes"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="referenceFiles" className="text-sm font-medium">
                    Reference images from device{" "}
                    <span className="text-muted-foreground">(optional, up to {MAX_REFERENCE_FILES})</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="referenceFiles"
                    name="referenceFiles"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className={cn(
                      "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    )}
                    aria-label="Upload reference images"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleClearReferenceFiles}>
                      Clear files
                    </Button>
                  </div>
                </div>
              </Collapsible.Panel>
            </Collapsible.Root>

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="submit" disabled={isPending} className="h-10">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Generate comic script
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleReset}
                disabled={isPending || isDownloading || isPendingImages}
                aria-label="Reset generator"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </form>

          <div className="mt-4 text-xs text-muted-foreground">
            <p>
              After the script is ready, use <strong>Generate panel images</strong> for full artwork. Requires{" "}
              <code className="font-mono text-foreground">OPENAI_API_KEY</code> for DALL·E; without it, placeholders are used.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 xl:col-span-8">
        <div className="rounded-2xl border bg-card shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)] overflow-hidden flex flex-col min-h-0">
          <div className="p-5 pb-3 shrink-0">
            <h2
              ref={previewHeadingRef}
              id="comic-preview-heading"
              tabIndex={-1}
              className="text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
            >
              Preview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Script and generated panel art. Export a PDF when you are happy.
            </p>
          </div>

          <div
            className={cn(
              "z-20 flex flex-col gap-3 border-b border-border/70 px-5 py-3",
              "bg-card/95 backdrop-blur-md supports-backdrop-filter:bg-card/85",
              "shadow-sm shadow-black/5",
              "sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            )}
          >
            {comic ? (
              <div
                className="flex w-full gap-1 rounded-lg border border-border/80 bg-muted/30 p-0.5 sm:w-auto"
                role="group"
                aria-label="Preview display mode"
              >
                <Button
                  type="button"
                  variant={previewMode === "reader" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setPreviewMode("reader")}
                  aria-pressed={previewMode === "reader"}
                  aria-label="Reader view"
                >
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  Reader
                </Button>
                <Button
                  type="button"
                  variant={previewMode === "details" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setPreviewMode("details")}
                  aria-pressed={previewMode === "details"}
                  aria-label="Details view"
                >
                  <ListTree className="size-3.5" aria-hidden="true" />
                  Details
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground sm:min-w-0 sm:flex-1">Generate a script to unlock the preview.</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              {toolbarActions}
              <Button
                type="button"
                variant="secondary"
                className="h-10"
                onClick={handleGeneratePanelImages}
                disabled={!comic || isPending || isPendingImages || renderingPanelIds.size > 0}
                aria-label="Generate panel images"
              >
                {isPendingImages ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Rendering panels…{renderProgress ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {renderProgress.done}/{renderProgress.total}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-4" aria-hidden="true" />
                    Generate panel images
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleCancelPanelRendering}
                disabled={renderingPanelIds.size === 0}
                aria-label="Cancel panel rendering"
              >
                Cancel rendering
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleDownloadPdf}
                disabled={!comic || isPending || isDownloading}
                aria-label="Download PDF"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download className="size-4" aria-hidden="true" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto space-y-4 p-5 pt-4 pb-10">
            {scriptGenerationSucceeded && comic ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-foreground"
              >
                Script ready — review below, then generate panel images when you want artwork.
              </div>
            ) : null}

            {comic ? (
              <Collapsible.Root
                open={isCharacterDesignsOpen}
                onOpenChange={setIsCharacterDesignsOpen}
                className="rounded-2xl border bg-background"
              >
                <div
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl p-4",
                    isCharacterDesignsOpen && "rounded-b-none border-b border-border/70"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <Collapsible.Trigger
                      type="button"
                      className={cn(
                        "flex flex-1 items-start justify-between gap-3 rounded-xl p-2 text-left outline-none",
                        "hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                      aria-label="Toggle character designs"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">Character designs</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Optional: edit characters and apply a lock for better continuity.
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 size-4 shrink-0 transition-transform",
                          isCharacterDesignsOpen && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </Collapsible.Trigger>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleAddCharacter}>
                        Add character
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={handleLoadCharacterLibrary}
                        disabled={isPendingLibrary}
                        aria-label="Load character library"
                      >
                        Load library
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={handleApplyCharacterLock}
                        disabled={!comic}
                        aria-label="Apply character lock"
                      >
                        Apply character lock
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Current lock length: {String(comic.characterLock ?? "").trim().length} chars
                  </p>
                </div>

                <Collapsible.Panel keepMounted className="p-4">
                  {libraryError ? (
                    <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {libraryError}
                    </div>
                  ) : null}

                  {libraryCharacters && libraryCharacters.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="grid gap-1.5">
                        <label htmlFor="libraryCharacter" className="text-xs font-medium text-muted-foreground">
                          Add from library (locked versions)
                        </label>
                        <select
                          id="libraryCharacter"
                          value={selectedLibraryCharacterId}
                          onChange={(e) => setSelectedLibraryCharacterId(e.target.value)}
                          className={cn(
                            "h-9 w-full min-w-72 rounded-xl border bg-background px-3 text-sm outline-none",
                            "focus-visible:ring-3 focus-visible:ring-ring/50"
                          )}
                          aria-label="Select character from library"
                        >
                          {libraryCharacters.map((c) => (
                            <option key={c.id} value={c.id} disabled={!c.locked}>
                              {c.name}
                              {c.locked ? " (locked)" : " (no locked version)"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        onClick={handleAddLockedCharacterFromLibrary}
                        disabled={isPendingLibrary || !selectedLibraryCharacterId}
                        aria-label="Add selected locked character to comic"
                      >
                        Add to comic
                      </Button>
                    </div>
                  ) : null}

                  {characterError ? (
                    <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {characterError}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    {(comic.characters ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No characters detected yet. Add one and describe their look.</p>
                    ) : (
                      (comic.characters ?? []).map((c) => (
                        <div key={c.id} className="rounded-xl border p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="grid flex-1 gap-2">
                              <div className="grid gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor={`char-name-${c.id}`}>
                                  Name
                                </label>
                                <input
                                  id={`char-name-${c.id}`}
                                  value={c.name}
                                  onChange={(e) => handleUpdateCharacter(c.id, { name: e.target.value })}
                                  className={cn(
                                    "h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                                    "focus-visible:ring-3 focus-visible:ring-ring/50"
                                  )}
                                  aria-label={`Character name: ${c.name}`}
                                />
                              </div>

                              <div className="grid gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor={`char-desc-${c.id}`}>
                                  Look / design notes
                                </label>
                                <textarea
                                  id={`char-desc-${c.id}`}
                                  value={c.description}
                                  onChange={(e) => handleUpdateCharacter(c.id, { description: e.target.value })}
                                  rows={2}
                                  placeholder="e.g., late-20s, warm brown skin, tight black curls, round glasses, teal hoodie, red canvas tote with enamel pins…"
                                  className={cn(
                                    "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                                    "focus-visible:ring-3 focus-visible:ring-ring/50"
                                  )}
                                  aria-label={`Character design notes: ${c.name}`}
                                />
                              </div>

                              <div className="grid gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor={`char-urls-${c.id}`}>
                                  Reference image URLs (optional, one per line)
                                </label>
                                <textarea
                                  id={`char-urls-${c.id}`}
                                  value={(c.referenceUrls ?? []).join("\n")}
                                  onChange={(e) =>
                                    handleUpdateCharacter(c.id, {
                                      referenceUrls: e.target.value
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                        .slice(0, 5),
                                    })
                                  }
                                  rows={2}
                                  placeholder={"https://example.com/hero.png\nhttps://example.com/hero-outfit.jpg"}
                                  className={cn(
                                    "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                                    "focus-visible:ring-3 focus-visible:ring-ring/50"
                                  )}
                                  aria-label={`Character reference URLs: ${c.name}`}
                                />
                              </div>

                              <div className="grid gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor={`char-files-${c.id}`}>
                                  Reference images from device (optional)
                                </label>
                                <input
                                  id={`char-files-${c.id}`}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  multiple
                                  onChange={(e) => void handleCharacterFilesSelected(c.id, e.target.files)}
                                  className={cn(
                                    "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
                                  )}
                                  aria-label={`Upload character reference images: ${c.name}`}
                                />
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-9"
                                onClick={() => handleDescribeCharacter(c.id)}
                                disabled={isPendingCharacter}
                                aria-label={`Auto-describe ${c.name} from references`}
                              >
                                {isPendingCharacter ? (
                                  <>
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    Describing…
                                  </>
                                ) : (
                                  "Auto-describe"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={() => handleRemoveCharacter(c.id)}
                                aria-label={`Remove character ${c.name}`}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Collapsible.Panel>
              </Collapsible.Root>
          ) : null}

          {imageError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {imageError}
            </div>
          ) : null}

          {!comic ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              <p>Generate a comic script to see a preview, or start from a sample premise.</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 h-9"
                onClick={handleInsertSamplePremise}
              >
                Insert sample premise
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Title</p>
                  <p className="text-base font-semibold">{comic.title}</p>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Logline</p>
                  <p className="text-sm text-muted-foreground">{comic.logline}</p>
                </div>
                {comic.seriesStyleBlurb ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Series style (locked for all panels)</p>
                    <p className="text-sm text-muted-foreground">{comic.seriesStyleBlurb}</p>
                  </div>
                ) : null}
              </div>

              {previewMode === "details" ? (
                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Story (unchanged)</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comic.sourceStory}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 rounded-2xl border bg-background p-4">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label htmlFor="pageLayout" className="text-sm font-medium">
                      Page layout
                    </label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {LAYOUT_PRESETS.find((p) => p.value === pageLayout)?.description}
                    </p>
                  </div>
                  <select
                    id="pageLayout"
                    value={pageLayout}
                    onChange={(e) => handlePageLayoutChange(e.target.value as PageLayoutPreset)}
                    className={cn(
                      "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none sm:max-w-xs",
                      "focus-visible:ring-3 focus-visible:ring-ring/50"
                    )}
                    aria-label="Comic page layout preset"
                  >
                    {LAYOUT_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {pageLayout !== "uniform-grid" ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-1 py-1 text-sm hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={useNarrativeLayout}
                      onChange={(e) => setUseNarrativeLayout(e.target.checked)}
                      className="mt-1 size-4 rounded border-input"
                      aria-describedby="narrative-layout-hint"
                      aria-label="Narrative layout: use script row hints"
                    />
                    <span>
                      <span className="font-medium">Narrative layout</span>
                      <span id="narrative-layout-hint" className="mt-0.5 block text-xs text-muted-foreground">
                        Use each panel&apos;s story beat and layout hints for row sizing (from script JSON). Turn off to
                        use only the preset pattern.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>

              {pageLayout === "uniform-grid" ? (
                <div ref={firstPanelRef} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {comic.panels.map((panel, idx) => (
                    <ComicPanelBlock
                      key={panel.id}
                      comic={comic}
                      panel={panel}
                      globalIdx={idx}
                      role="uniform"
                      previewMode={previewMode}
                      isRenderingImage={renderingPanelIds.has(panel.id)}
                      progressLabel={renderProgress ? `${renderProgress.done}/${renderProgress.total}` : null}
                      onUpdatePanel={handleUpdatePanel}
                      onRegenerateDraftPrompt={handleRegenerateDraftPrompt}
                      onAcceptDraftPrompt={handleAcceptDraftPrompt}
                      onClearDraftPrompt={handleClearDraftPrompt}
                    />
                  ))}
                </div>
              ) : (
                <div ref={firstPanelRef} className="rounded-xl border border-zinc-400/70 bg-zinc-100/90 p-3 shadow-inner sm:p-4">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    Preview page — {pageLayout === "manga-asymmetric" ? "asymmetric rows" : "tiered rows"}
                  </p>
                  <div className="flex flex-col gap-4">
                    {layoutRows.map((row, rowIdx) => {
                      const isMangaPair = pageLayout === "manga-asymmetric" && row.length === 2
                      const isTierPair = pageLayout === "comic-tiers" && row.length === 2
                      return (
                        <div
                          key={`row-${rowIdx}-${row.join("-")}`}
                          className={cn(
                            "grid gap-3",
                            isMangaPair && "grid-cols-1 md:grid-cols-[7fr_3fr] md:items-stretch md:gap-4",
                            isTierPair && "grid-cols-1 sm:grid-cols-2 sm:gap-4",
                            row.length === 1 && "grid-cols-1"
                          )}
                        >
                          {row.map((panelIdx) => {
                            const panel = comic.panels[panelIdx]
                            const role = getPanelRole(pageLayout, row, panelIdx)
                            return (
                              <ComicPanelBlock
                                key={panel.id}
                                comic={comic}
                                panel={panel}
                                globalIdx={panelIdx}
                                role={role}
                                previewMode={previewMode}
                                isRenderingImage={renderingPanelIds.has(panel.id)}
                                progressLabel={renderProgress ? `${renderProgress.done}/${renderProgress.total}` : null}
                                onUpdatePanel={handleUpdatePanel}
                                onRegenerateDraftPrompt={handleRegenerateDraftPrompt}
                                onAcceptDraftPrompt={handleAcceptDraftPrompt}
                                onClearDraftPrompt={handleClearDraftPrompt}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}
