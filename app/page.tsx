import { ComicGenerator } from "@/components/comic/comic-generator"
import { AuthBar } from "@/components/site/auth-bar"
import { SetupFooter } from "@/components/site/setup-footer"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

/** Long-running image generation for many panels */
export const maxDuration = 300;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:gap-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
          <p className="text-sm font-medium text-muted-foreground">Comic Book Generator</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Generate a full comic: script, panel art, and PDF export
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Start with a premise and optional reference images or style notes. Generate the script, then render
            panel images and download a complete PDF.
          </p>
            </div>
            <AuthBar className="sm:pt-1" />
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a href="#premise" className={cn(buttonVariants({ className: "h-10 w-fit" }))}>
              Start generating
            </a>
            <Link
              href="/characters"
              className={cn(buttonVariants({ variant: "outline", className: "h-10 w-fit" }))}
              aria-label="Open character library"
            >
              Character library
            </Link>
            <Link
              href="/projects"
              className={cn(buttonVariants({ variant: "outline", className: "h-10 w-fit" }))}
              aria-label="Open projects"
            >
              Projects
            </Link>
            <p className="text-xs text-muted-foreground">
              Tip: paste a full story — the app will keep your plot and just split it into panels.
            </p>
          </div>
        </header>

        <ComicGenerator />

        <SetupFooter />
      </main>
    </div>
  );
}
