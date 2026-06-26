"use client"

import { useState, useTransition } from "react"
import { updateClient } from "@/app/outreach/actions"
import type { Client } from "@/lib/outreach"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  client: Client
}

export const ClientIcp = ({ client }: Props) => {
  const [content, setContent] = useState(client.icp_content ?? "")
  const [generating, setGenerating] = useState(false)
  const [saving, startSave] = useTransition()
  const [genError, setGenError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [topic, setTopic] = useState("")

  const generate = async () => {
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "icp",
          clientName: client.name,
          industry: client.industry ?? "",
          description: client.description ?? "",
          topic: topic || undefined,
        }),
      })
      const data = (await res.json()) as { icp?: string; error?: string }
      if (!res.ok || data.error) { setGenError(data.error ?? "Generation failed."); return }
      if (data.icp) setContent(data.icp)
    } catch {
      setGenError("Network error. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  const save = () => {
    setSaveMsg(null)
    startSave(async () => {
      const res = await updateClient(client.id, { icp_content: content })
      if (!res.ok) { setSaveMsg(`Error: ${res.error}`); return }
      setSaveMsg("Saved.")
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Ideal Customer Profile</h3>
        {content ? (
          <span className="text-xs text-muted-foreground">{content.length} chars</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground">Generate a starter ICP with AI</p>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Focus area or angle (optional)"
            className={cn(
              "h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/50"
            )}
          />
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0"
            onClick={generate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
        </div>
        {genError ? <p className="text-xs text-destructive">{genError}</p> : null}
        <p className="text-xs text-muted-foreground">
          Or paste your own ICP below — supports markdown.
        </p>
      </div>

      <textarea
        rows={20}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={"# Ideal Customer Profile — " + client.name + "\n\n## Who they are\n\n## What triggers them\n\n## How they talk\n\n## Where to reach them\n\n## Who this is NOT"}
        className={cn(
          "w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      />

      {saveMsg ? (
        <p className={cn("text-sm", saveMsg.startsWith("Error") ? "text-destructive" : "text-green-600 dark:text-green-400")}>
          {saveMsg}
        </p>
      ) : null}

      <Button type="button" className="h-9 w-fit" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save ICP"}
      </Button>
    </div>
  )
}
