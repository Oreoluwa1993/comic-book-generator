"use client"

import { useState, useTransition } from "react"
import { updateCampaign } from "@/app/outreach/actions"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/lib/outreach"
import { cn } from "@/lib/utils"

type Props = {
  campaign: Campaign
  onUpdated?: (campaign: Campaign) => void
}

export const MessageComposer = ({ campaign, onUpdated }: Props) => {
  const [subject, setSubject] = useState(campaign.subject)
  const [body, setBody] = useState(campaign.body)
  const [generating, setGenerating] = useState(false)
  const [saving, startSave] = useTransition()
  const [topic, setTopic] = useState("")
  const [genError, setGenError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const generate = async () => {
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          leadName: "{{name}}",
          leadEmail: "lead@example.com",
          leadCompany: "{{company}}",
          topic: topic || undefined,
          tone: "professional",
        }),
      })
      const data = (await res.json()) as { subject?: string; body?: string; error?: string }
      if (!res.ok || data.error) {
        setGenError(data.error ?? "Generation failed.")
        return
      }
      if (data.subject) setSubject(data.subject)
      if (data.body) setBody(data.body)
    } catch {
      setGenError("Network error. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  const save = () => {
    setSaveError(null)
    setSaved(false)
    startSave(async () => {
      const res = await updateCampaign(campaign.id, { subject, body })
      if (!res.ok) {
        setSaveError(res.error)
        return
      }
      setSaved(true)
      onUpdated?.(res.campaign)
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">Message composer</h3>

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground">AI-generate copy</p>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic or angle (optional)"
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
          Generates with <code className="rounded bg-muted px-1">{"{{name}}"}</code> and{" "}
          <code className="rounded bg-muted px-1">{"{{company}}"}</code> placeholders intact.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={cn(
            "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Body</span>
        <textarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={cn(
            "w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        />
      </label>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      {saved ? <p className="text-sm text-green-600 dark:text-green-400">Saved.</p> : null}

      <Button type="button" className="h-9 w-fit" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  )
}
