import { getOutreachStats } from "./actions"
import { StatsCard } from "@/components/outreach/stats-card"
import { STAGE_LABELS, LEAD_STAGES } from "@/lib/outreach"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function OutreachDashboardPage() {
  const res = await getOutreachStats()

  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {res.error}
      </div>
    )
  }

  const { stats } = res

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Leads" value={stats.totalLeads} sub="across all pipeline stages" />
        <StatsCard label="Campaigns" value={stats.totalCampaigns} sub="email & channel campaigns" />
        <StatsCard label="Messages Sent" value={stats.messagesSent} sub="via all campaigns" />
        <StatsCard label="Social Posts" value={stats.totalSocialPosts} sub="saved drafts & published" />
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Lead Pipeline</h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {LEAD_STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-1 rounded-xl border p-3">
              <p className="text-xs font-medium text-muted-foreground">{STAGE_LABELS[stage]}</p>
              <p className="text-2xl font-bold">{stats.leadsByStage[stage] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          href="/outreach/leads"
          title="Manage Leads"
          description="Add contacts, move them through your pipeline stages, and track who's interested."
        />
        <QuickActionCard
          href="/outreach/campaigns"
          title="Run Campaigns"
          description="Create email sequences with AI-written copy and send them to your lead segments."
        />
        <QuickActionCard
          href="/outreach/social"
          title="Social Content"
          description="Generate platform-specific posts for Twitter, LinkedIn, Instagram, and Facebook."
        />
      </section>
    </div>
  )
}

const QuickActionCard = ({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
    <div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <Link href={href} className={cn(buttonVariants({ className: "h-9 w-fit" }))}>
      Open
    </Link>
  </div>
)
