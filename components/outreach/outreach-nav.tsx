"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type Props = {
  clientId: string
  clientName: string
}

export const OutreachNav = ({ clientId, clientName }: Props) => {
  const pathname = usePathname()
  const base = `/outreach/${clientId}`

  const NAV_ITEMS = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/leads`, label: "Leads" },
    { href: `${base}/campaigns`, label: "Campaigns" },
    { href: `${base}/social`, label: "Social Posts" },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/outreach"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All clients
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs font-medium">{clientName}</span>
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-4">
        {NAV_ITEMS.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
