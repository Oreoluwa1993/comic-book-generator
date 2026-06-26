import { getClient, getOutreachStats } from "@/app/outreach/actions"
import { ClientIcp } from "@/components/outreach/client-icp"
import { StatsCard } from "@/components/outreach/stats-card"
import { STAGE_LABELS } from "@/lib/outreach"
import { notFound } from "next/navigation"

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const [clientRes, statsRes] = await Promise.all([getClient(clientId), getOutreachStats(clientId)])

  if (!clientRes.ok) {
    if (clientRes.error.includes("No rows") || clientRes.error.includes("not found")) notFound()
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {clientRes.error}
      </div>
    )
  }

  const { client } = clientRes
  const stats = statsRes.ok ? statsRes.stats : null

  const topStage = stats
    ? Object.entries(stats.leadsByStage).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{client.name}</h2>
        {client.industry ? (
          <p className="text-sm font-medium text-muted-foreground">{client.industry}</p>
        ) : null}
        {client.description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{client.description}</p>
        ) : null}
        {client.website ? (
          <p className="text-xs text-muted-foreground">
            {client.website.replace(/^https?:\/\//, "")}
          </p>
        ) : null}
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total leads" value={stats.totalLeads} />
          <StatsCard label="Campaigns" value={stats.totalCampaigns} />
          <StatsCard label="Messages sent" value={stats.messagesSent} />
          <StatsCard label="Social posts" value={stats.totalSocialPosts} />
        </div>
      ) : null}

      {topStage && topStage[1] > 0 ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold">Pipeline snapshot</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(stats!.leadsByStage)
              .filter(([, count]) => count > 0)
              .map(([stage, count]) => (
                <div key={stage} className="flex flex-col items-center rounded-xl border bg-muted/30 px-4 py-2">
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <ClientIcp client={client} />
    </div>
  )
}
