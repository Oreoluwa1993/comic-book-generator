"use client"

import { useState, useTransition } from "react"
import { updateLeadStage, deleteLead } from "@/app/outreach/actions"
import type { Lead, LeadStage } from "@/lib/outreach"
import { LEAD_STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/outreach"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  initialLeads: Lead[]
}

export const LeadsPipeline = ({ initialLeads }: Props) => {
  const [leads, setLeads] = useState(initialLeads)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const byStage = (stage: LeadStage) => leads.filter((l) => l.stage === stage)

  const moveStage = (leadId: string, stage: LeadStage) => {
    setError(null)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)))
    startTransition(async () => {
      const res = await updateLeadStage(leadId, stage)
      if (!res.ok) setError(res.error)
    })
  }

  const removeLead = (leadId: string) => {
    setError(null)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    startTransition(async () => {
      const res = await deleteLead(leadId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = byStage(stage)
          return (
            <div key={stage} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STAGE_COLORS[stage]
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
              </div>
              <div className="flex min-h-24 flex-col gap-2 rounded-xl border bg-muted/30 p-2">
                {stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onMove={moveStage}
                    onDelete={removeLead}
                    disabled={isPending}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const LeadCard = ({
  lead,
  onMove,
  onDelete,
  disabled,
}: {
  lead: Lead
  onMove: (id: string, stage: LeadStage) => void
  onDelete: (id: string) => void
  disabled: boolean
}) => {
  const [expanded, setExpanded] = useState(false)

  const currentIdx = LEAD_STAGES.indexOf(lead.stage)
  const prevStage = currentIdx > 0 ? LEAD_STAGES[currentIdx - 1] : null
  const nextStage = currentIdx < LEAD_STAGES.length - 1 ? LEAD_STAGES[currentIdx + 1] : null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm text-sm">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <p className="font-medium leading-tight">{lead.name}</p>
        {lead.company ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{lead.company}</p>
        ) : null}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.email}</p>
      </button>

      {expanded ? (
        <div className="mt-2 flex flex-col gap-2 border-t pt-2">
          {lead.role ? <p className="text-xs text-muted-foreground">Role: {lead.role}</p> : null}
          {lead.notes ? <p className="text-xs text-muted-foreground">{lead.notes}</p> : null}
          <div className="flex flex-wrap gap-1">
            {prevStage ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onMove(lead.id, prevStage)}
                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                ← {STAGE_LABELS[prevStage]}
              </button>
            ) : null}
            {nextStage ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onMove(lead.id, nextStage)}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {STAGE_LABELS[nextStage]} →
              </button>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (confirm(`Delete ${lead.name}?`)) onDelete(lead.id)
              }}
              className="ml-auto rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
