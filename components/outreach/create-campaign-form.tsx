"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCampaign } from "@/app/outreach/actions"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_CHANNELS, type CampaignChannel } from "@/lib/outreach"
import { cn } from "@/lib/utils"

export const CreateCampaignForm = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    subject: "",
    body: "",
    channel: "email" as CampaignChannel,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createCampaign(form)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.push(`/outreach/campaigns/${res.campaign.id}`)
    })
  }

  if (!open) {
    return (
      <Button type="button" className="h-9" onClick={() => setOpen(true)}>
        New campaign
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">New campaign</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Campaign name *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Summer outreach"
            className={inputCls}
          />
        </Field>
        <Field label="Channel">
          <select
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as CampaignChannel }))}
            className={inputCls}
          >
            {CAMPAIGN_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief internal description"
            className={inputCls}
          />
        </Field>
        <Field label="Subject line *" className="sm:col-span-2">
          <input
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Your comic story starts here"
            className={inputCls}
          />
        </Field>
        <Field label="Message body *" className="sm:col-span-2">
          <textarea
            required
            rows={6}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder={"Hi {{name}},\n\nUse {{name}} and {{company}} as placeholders."}
            className={cn(inputCls, "h-auto resize-y py-2")}
          />
          <span className="text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1">{"{{name}}"}</code> and{" "}
            <code className="rounded bg-muted px-1">{"{{company}}"}</code> for personalization.
          </span>
        </Field>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={isPending} className="h-9">
          {isPending ? "Creating…" : "Create campaign"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={() => { setOpen(false); setError(null) }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

const inputCls = cn(
  "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring/50"
)

const Field = ({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) => (
  <label className={cn("flex flex-col gap-1", className)}>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </label>
)
