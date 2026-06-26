"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/outreach", label: "Dashboard", exact: true },
  { href: "/outreach/leads", label: "Leads" },
  { href: "/outreach/campaigns", label: "Campaigns" },
  { href: "/outreach/social", label: "Social Posts" },
]

export const OutreachNav = () => {
  const pathname = usePathname()

  return (
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
  )
}
