import { listLeads } from "@/app/outreach/actions"
import { AddLeadForm } from "@/components/outreach/add-lead-form"
import { LeadsPipeline } from "@/components/outreach/leads-pipeline"

export default async function LeadsPage() {
  const res = await listLeads()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Lead Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Add contacts and move them through your pipeline by expanding each card.
        </p>
      </div>

      <AddLeadForm />

      {!res.ok ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {res.error}
        </div>
      ) : res.leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No leads yet. Add your first contact above.
        </div>
      ) : (
        <LeadsPipeline initialLeads={res.leads} />
      )}
    </div>
  )
}
