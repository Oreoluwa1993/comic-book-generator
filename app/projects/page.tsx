import Link from "next/link"

import { listProjects } from "@/app/projects/actions"
import { AuthBar } from "@/components/site/auth-bar"
import { SetupFooter } from "@/components/site/setup-footer"
import { ProjectCreateForm } from "@/components/projects/project-create-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function ProjectsPage() {
  const res = await listProjects()
  const projects = res.ok ? res.projects : []

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Projects</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Save and continue longer comics</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Projects store your comic checkpoints in Supabase so you can resume later and keep extending beyond 10 pages.
              </p>
            </div>
            <AuthBar className="sm:pt-1" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))} aria-label="Back to generator">
              Back to generator
            </Link>
            <Link
              href="/characters"
              className={cn(buttonVariants({ variant: "outline", className: "h-10" }))}
              aria-label="Open character library"
            >
              Character library
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <ProjectCreateForm />
          {!res.ok ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {res.error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Your projects</h2>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No projects yet. Create one above, then generate a script and save a checkpoint.
            </div>
          ) : (
            <ul className="grid gap-3">
              {projects.map((p) => (
                <li key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{p.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(p.updated_at).toLocaleString()}
                        {p.current_revision_id ? " • Has a saved checkpoint" : " • No checkpoint yet"}
                      </p>
                    </div>
                    <Link
                      href={`/projects/${p.id}`}
                      className={cn(buttonVariants({ className: "h-9 w-fit" }))}
                      aria-label={`Open project ${p.title}`}
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SetupFooter />
      </main>
    </div>
  )
}

