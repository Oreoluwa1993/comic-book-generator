import { getClient } from "@/app/outreach/actions"
import { OutreachNav } from "@/components/outreach/outreach-nav"
import { notFound } from "next/navigation"

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const res = await getClient(clientId)

  if (!res.ok) {
    if (res.error.includes("No rows") || res.error.includes("not found")) notFound()
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {res.error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <OutreachNav clientId={clientId} clientName={res.client.name} />
      {children}
    </div>
  )
}
