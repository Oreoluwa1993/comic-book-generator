import { listCampaigns } from "@/app/outreach/actions"
import { CreateCampaignForm } from "@/components/outreach/create-campaign-form"
import { STATUS_COLORS } from "@/lib/outreach"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function CampaignsPage() {
  const res = await listCampaigns()
  const campaigns = res.ok ? res.campaigns : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Campaigns</h2>
        <p className="text-sm text-muted-foreground">
          Create outreach campaigns, add leads, use AI to write copy, then send.
        </p>
      </div>

      <CreateCampaignForm />

      {!res.ok ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {res.error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No campaigns yet. Create one above.
        </div>
      ) : (
        <ul className="grid gap-3">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_COLORS[c.status]
                      )}
                    >
                      {c.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {c.channel}
                    </span>
                  </div>
                  {c.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Subject: {c.subject}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.sent_count} sent · Created {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/outreach/campaigns/${c.id}`}
                  className={cn(buttonVariants({ className: "h-9 w-fit shrink-0" }))}
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
