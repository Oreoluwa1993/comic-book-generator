import { getCampaign, listLeads } from "@/app/outreach/actions"
import { MessageComposer } from "@/components/outreach/message-composer"
import { CampaignLeadsManager } from "@/components/outreach/campaign-leads-manager"
import { STATUS_COLORS } from "@/lib/outreach"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [campaignRes, leadsRes] = await Promise.all([getCampaign(id), listLeads()])

  if (!campaignRes.ok) {
    if (campaignRes.error.includes("not found") || campaignRes.error.includes("No rows")) {
      notFound()
    }
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {campaignRes.error}
      </div>
    )
  }

  const { campaign, leads: campaignLeads } = campaignRes
  const allLeads = leadsRes.ok ? leadsRes.leads : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{campaign.name}</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                STATUS_COLORS[campaign.status]
              )}
            >
              {campaign.status}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {campaign.channel}
            </span>
          </div>
          {campaign.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.sent_count} sent · Created {new Date(campaign.created_at).toLocaleDateString()}
          </p>
        </div>
        <Link
          href="/outreach/campaigns"
          className={cn(buttonVariants({ variant: "outline", className: "h-9 shrink-0" }))}
        >
          Back to campaigns
        </Link>
      </div>

      <MessageComposer campaign={campaign} />

      <CampaignLeadsManager
        campaign={campaign}
        campaignLeads={campaignLeads}
        allLeads={allLeads}
      />
    </div>
  )
}
