"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { createProject } from "@/app/projects/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CreateState = { ok: boolean; error: string | null; projectId: string | null }

const initialState: CreateState = { ok: false, error: null, projectId: null }

export const ProjectCreateForm = ({ className }: { className?: string }) => {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [state, action, isPending] = useActionState(
    async (_prev: CreateState, formData: FormData): Promise<CreateState> => {
      const title = String(formData.get("title") ?? "").trim()
      const res = await createProject({ title })
      if (!res.ok) return { ok: false, error: res.error, projectId: null }
      return { ok: true, error: null, projectId: res.projectId }
    },
    initialState
  )

  useEffect(() => {
    if (state.ok && state.projectId) {
      router.push(`/projects/${state.projectId}`)
      router.refresh()
    }
  }, [router, state.ok, state.projectId])

  return (
    <form action={action} className={cn("flex flex-col gap-2 sm:flex-row sm:items-end", className)}>
      <div className="grid flex-1 gap-1.5">
        <label htmlFor="projectTitle" className="text-sm font-medium">
          New project
        </label>
        <input
          id="projectTitle"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., The Bookmark That Whispered"
          className={cn(
            "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          disabled={isPending}
          aria-label="Project title"
        />
      </div>
      <Button type="submit" className="h-10" disabled={isPending || title.trim().length === 0} aria-label="Create project">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating…
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Create
          </>
        )}
      </Button>

      {state.error ? (
        <div className="sm:col-span-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
    </form>
  )
}

