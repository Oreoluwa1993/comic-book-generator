"use client"

import { useState, useTransition } from "react"
import { createLead } from "@/app/outreach/actions"
import { Button } from "@/components/ui/button"
import { LEAD_SOURCES, type LeadSource } from "@/lib/outreach"
import { cn } from "@/lib/utils"

type Props = {
  clientId: string
  onCreated?: () => void
}

export const AddLeadForm = ({ clientId, onCreated }: Props) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    source: "manual" as LeadSource,
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createLead(clientId, form)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setForm({ name: "", email: "", company: "", role: "", source: "manual", notes: "" })
      setOpen(false)
      onCreated?.()
    })
  }

  if (!open) {
    return (
      <Button type="button" className="h-9" onClick={() => setOpen(true)}>
        Add lead
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <h3 className="mb-4 text-base font-semibold">New lead</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </Field>
        <Field label="Email *">
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="jane@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Company">
          <input
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="Acme Corp"
            className={inputCls}
          />
        </Field>
        <Field label="Role">
          <input
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="Marketing Director"
            className={inputCls}
          />
        </Field>
        <Field label="Source">
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as LeadSource }))}
            className={inputCls}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Met at conference..."
            className={inputCls}
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={isPending} className="h-9">
          {isPending ? "Saving…" : "Save lead"}
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
