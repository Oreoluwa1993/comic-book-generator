"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/app/outreach/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const CreateClientForm = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "", industry: "", website: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createClient(form)
      if (!res.ok) { setError(res.error); return }
      router.push(`/outreach/${res.client.id}`)
    })
  }

  if (!open) {
    return (
      <Button type="button" className="h-9" onClick={() => setOpen(true)}>
        Add client
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">New client</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client name *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Cintelytics"
            className={inputCls}
          />
        </Field>
        <Field label="Industry">
          <input
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="Media intelligence, SaaS…"
            className={inputCls}
          />
        </Field>
        <Field label="Website">
          <input
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://cintelytics.com"
            className={inputCls}
          />
        </Field>
        <Field label="Description">
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="AI narrative intelligence for Swedish media and politics"
            className={inputCls}
          />
        </Field>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={isPending} className="h-9">
          {isPending ? "Creating…" : "Create client"}
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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </label>
)
