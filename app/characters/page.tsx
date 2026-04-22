import Link from "next/link"
import { listCharacters } from "./actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AuthBar } from "@/components/site/auth-bar"

export default async function CharactersPage() {
  const res = await listCharacters()

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground">Character Library</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Design characters once. Reuse everywhere.</h1>
              <p className="max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                Generate a character sheet, lock a version, then use it as a reference for consistent panel art.
              </p>
            </div>
            <AuthBar className="sm:pt-1" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))}>
              Back to generator
            </Link>
            <Link href="/characters/new" className={cn(buttonVariants({ className: "h-10" }))}>
              New character
            </Link>
          </div>
        </header>

        {!res.ok ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {res.error}
          </div>
        ) : res.characters.length === 0 ? (
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">No characters yet. Create your first one.</p>
          </div>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {res.characters.map((c) => (
              <Link
                key={c.id}
                href={`/characters/${c.id}`}
                className={cn(
                  "group rounded-xl border bg-card p-4 outline-none transition",
                  "hover:border-foreground/15 hover:bg-accent/40",
                  "focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
                aria-label={`Open ${c.name}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{c.name}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.role ? c.role : "No role set"}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px]",
                      c.locked_version_id ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                    )}
                  >
                    {c.locked_version_id ? "Locked" : "Draft"}
                  </span>
                </div>

                {c.locked_preview_url ? (
                  <div className="mt-3 overflow-hidden rounded-lg border bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.locked_preview_url} alt="" className="h-40 w-full object-cover transition group-hover:scale-[1.02]" />
                  </div>
                ) : (
                  <div className="mt-3 flex h-40 items-center justify-center rounded-lg border bg-background">
                    <p className="text-xs text-muted-foreground">No sheet yet</p>
                  </div>
                )}
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

