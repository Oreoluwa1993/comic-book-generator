import { listClients } from "./actions"
import { CreateClientForm } from "@/components/outreach/create-client-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function OutreachPage() {
  const res = await listClients()
  const clients = res.ok ? res.clients : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Your clients</h2>
        <p className="text-sm text-muted-foreground">
          Each client has its own lead pipeline, campaigns, social posts, and ICP.
        </p>
      </div>

      <CreateClientForm />

      {!res.ok ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {res.error}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-sm font-medium">No clients yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first client above — add your own business or a client you manage outreach for.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-3">
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                {c.industry ? (
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{c.industry}</p>
                ) : null}
                {c.description ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {c.icp_content ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ICP ready
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5">No ICP yet</span>
                  )}
                  {c.website ? (
                    <span className="truncate">{c.website.replace(/^https?:\/\//, "")}</span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/outreach/${c.id}`}
                className={cn(buttonVariants({ className: "h-9 w-fit" }))}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
