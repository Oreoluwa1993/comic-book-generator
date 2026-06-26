"use client"

import { useState, useTransition } from "react"
import {
  addLeadsToCampaign,
  removeLeadFromCampaign,
  sendCampaign,
} from "@/app/outreach/actions"
import type { Lead, Campaign } from "@/lib/outreach"
import { STAGE_LABELS } from "@/lib/outreach"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  campaign: Campaign
  campaignLeads: Lead[]
  allLeads: Lead[]
}

export const CampaignLeadsManager = ({ campaign, campaignLeads, allLeads }: Props) => {
  const [leads, setLeads] = useState(campaignLeads)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const leadIds = new Set(leads.map((l) => l.id))
  const available = allLeads.filter((l) => !leadIds.has(l.id))

  const addSelected = () => {
    if (selected.size === 0) return
    setError(null)
    const ids = [...selected]
    const newLeads = allLeads.filter((l) => ids.includes(l.id))
    setLeads((prev) => [...prev, ...newLeads])
    setSelected(new Set())
    setShowAdd(false)
    startTransition(async () => {
      const res = await addLeadsToCampaign(campaign.id, ids)
      if (!res.ok) setError(res.error)
    })
  }

  const remove = (leadId: string) => {
    setError(null)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    startTransition(async () => {
      const res = await removeLeadFromCampaign(campaign.id, leadId)
      if (!res.ok) setError(res.error)
    })
  }

  const send = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const res = await sendCampaign(campaign.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMessage(`Sent to ${res.sent} lead${res.sent === 1 ? "" : "s"}.`)
    })
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Leads ({leads.length})</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Cancel" : "Add leads"}
          </Button>
          <Button
            type="button"
            className="h-8"
            disabled={isPending || leads.length === 0}
            onClick={send}
          >
            {isPending ? "Sending…" : "Send campaign"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600 dark:text-green-400">{message}</p> : null}

      {showAdd && available.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Select leads to add</p>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
            {available.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggleSelect(l.id)}
                  className="size-4"
                />
                <span className="text-sm">{l.name}</span>
                {l.company ? (
                  <span className="text-xs text-muted-foreground">· {l.company}</span>
                ) : null}
                <span className={cn("ml-auto text-xs capitalize text-muted-foreground")}>
                  {STAGE_LABELS[l.stage]}
                </span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="h-8 w-fit"
            disabled={selected.size === 0 || isPending}
            onClick={addSelected}
          >
            Add {selected.size > 0 ? selected.size : ""} selected
          </Button>
        </div>
      ) : showAdd && available.length === 0 ? (
        <p className="text-sm text-muted-foreground">All leads already in this campaign.</p>
      ) : null}

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads yet. Add some above.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {leads.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
            >
              <div>
                <span className="font-medium">{l.name}</span>
                {l.company ? (
                  <span className="ml-2 text-xs text-muted-foreground">{l.company}</span>
                ) : null}
                <span className="ml-2 text-xs text-muted-foreground">{l.email}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(l.id)}
                disabled={isPending}
                className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
