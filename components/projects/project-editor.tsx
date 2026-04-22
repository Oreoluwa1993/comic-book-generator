"use client"

import { useMemo, useState, useTransition } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"

import type { Comic } from "@/lib/comic"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ComicGenerator } from "@/components/comic/comic-generator"
import { continueComic } from "@/app/actions"
import { saveProjectRevision } from "@/app/projects/actions"

export type ProjectEditorProps = {
  projectId: string
  projectTitle: string
  initialComic: Comic | null
}

export const ProjectEditor = ({ projectId, projectTitle, initialComic }: ProjectEditorProps) => {
  const [comic, setComic] = useState<Comic | null>(initialComic)
  const [checkpointLabel, setCheckpointLabel] = useState("")
  const [continueCount, setContinueCount] = useState(6)
  const [continuationPrompt, setContinuationPrompt] = useState("")
  const [projectError, setProjectError] = useState<string | null>(null)
  const [projectInfo, setProjectInfo] = useState<string | null>(null)
  const [isPendingSave, startSaveTransition] = useTransition()
  const [isPendingContinue, startContinueTransition] = useTransition()

  const toolbarActions = useMemo(() => {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid gap-1">
            <label htmlFor="checkpointLabel" className="text-xs font-medium text-muted-foreground">
              Save checkpoint (optional label)
            </label>
            <input
              id="checkpointLabel"
              value={checkpointLabel}
              onChange={(e) => setCheckpointLabel(e.target.value)}
              placeholder="e.g., Before regen"
              className={cn(
                "h-10 w-full min-w-56 rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Checkpoint label"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              if (!comic) return
              setProjectError(null)
              setProjectInfo(null)
              startSaveTransition(async () => {
                const res = await saveProjectRevision({
                  projectId,
                  label: checkpointLabel.trim().length > 0 ? checkpointLabel.trim() : undefined,
                  comic,
                })
                if (!res.ok) {
                  setProjectError(res.error)
                  return
                }
                setProjectInfo("Saved.")
              })
            }}
            disabled={!comic || isPendingSave || isPendingContinue}
            aria-label="Save project checkpoint"
          >
            {isPendingSave ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                Save
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid gap-1">
            <label htmlFor="continueCount" className="text-xs font-medium text-muted-foreground">
              Continue (add panels)
            </label>
            <input
              id="continueCount"
              type="number"
              min={1}
              max={50}
              value={continueCount}
              onChange={(e) => setContinueCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className={cn(
                "h-10 w-full min-w-40 rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Additional panel count"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            onClick={() => {
              if (!comic) return
              setProjectError(null)
              setProjectInfo(null)
              startContinueTransition(async () => {
                const res = await continueComic({
                  comic,
                  additionalPanelCount: continueCount,
                  continuationPrompt: continuationPrompt.trim().length > 0 ? continuationPrompt.trim() : undefined,
                })
                if (!res.ok) {
                  setProjectError(res.error)
                  return
                }
                setComic(res.comic)
                setProjectInfo(`Added ${continueCount} panels.`)
              })
            }}
            disabled={!comic || isPendingContinue || isPendingSave}
            aria-label="Continue comic by appending panels"
          >
            {isPendingContinue ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Continuing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden="true" />
                Continue
              </>
            )}
          </Button>
        </div>

        <div className="grid w-full gap-1">
          <label htmlFor="continuationPrompt" className="text-xs font-medium text-muted-foreground">
            What happens next? (optional)
          </label>
          <textarea
            id="continuationPrompt"
            value={continuationPrompt}
            onChange={(e) => setContinuationPrompt(e.target.value)}
            rows={2}
            placeholder="e.g., The bookmark warns them the tragedy is imminent; they rush to the library rooftop…"
            className={cn(
              "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
            aria-label="Continuation note"
          />
        </div>

        {projectError ? (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {projectError}
          </div>
        ) : null}
        {projectInfo ? (
          <div className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-foreground">
            {projectInfo}
          </div>
        ) : null}
      </div>
    )
  }, [
    checkpointLabel,
    comic,
    continueCount,
    continuationPrompt,
    isPendingContinue,
    isPendingSave,
    projectError,
    projectId,
    projectInfo,
  ])

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Project</p>
        <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight">{projectTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save checkpoints to Supabase and continue by appending more panels. Page count grows automatically in PDF export.
        </p>
      </div>

      <ComicGenerator
        initialComic={comic}
        onComicChange={setComic}
        toolbarActions={toolbarActions}
        key={projectId}
      />
    </div>
  )
}

