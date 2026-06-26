import { AuthBar } from "@/components/site/auth-bar"
import { OutreachNav } from "@/components/outreach/outreach-nav"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outreach Engine</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Grow your audience
              </h1>
              <p className="mt-1 max-w-xl text-base text-muted-foreground">
                Manage leads, run email campaigns, generate AI pitches, and create social content.
              </p>
            </div>
            <AuthBar className="sm:pt-1" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", className: "h-9" }))}>
              Back to generator
            </Link>
          </div>
        </header>

        <OutreachNav />

        {children}
      </main>
    </div>
  )
}
