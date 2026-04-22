import Link from "next/link"

import { getProject } from "@/app/projects/actions"
import { AuthBar } from "@/components/site/auth-bar"
import { SetupFooter } from "@/components/site/setup-footer"
import { ProjectEditor } from "@/components/projects/project-editor"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const maxDuration = 300

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getProject(id)

  if (!res.ok) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-background">
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
          <header className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project</p>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Unable to load</h1>
                <p className="mt-2 text-base text-muted-foreground">This project may not exist or you may not be signed in.</p>
              </div>
              <AuthBar className="sm:pt-1" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link href="/projects" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))} aria-label="Back to projects">
                Back to projects
              </Link>
            </div>
          </header>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{res.error}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:gap-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project editor</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save checkpoints, continue by appending panels, and export PDF at any time.
              </p>
            </div>
            <AuthBar className="sm:pt-1" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link href="/projects" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))} aria-label="Back to projects">
              Back to projects
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))} aria-label="Open generator home">
              Generator home
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

        <ProjectEditor
          projectId={res.project.id}
          projectTitle={res.project.title}
          initialComic={res.revision?.comic ?? null}
        />

        <SetupFooter />
      </main>
    </div>
  )
}

