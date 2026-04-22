import Link from "next/link"
import { notFound } from "next/navigation"
import { getCharacterDetail } from "../actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CharacterDesigner } from "@/components/characters/character-designer"

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const { id } = params
  const res = await getCharacterDetail(id)
  if (!res.ok) {
    if (res.error.toLowerCase().includes("not found")) return notFound()
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Character Designer</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {res.ok ? res.character.name : "Character"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload references, generate a sheet, then lock a version for consistent panels.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/characters" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))}>
                Back to library
              </Link>
              <Link href="/" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))}>
                Generator
              </Link>
            </div>
          </div>
        </header>

        {!res.ok ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {res.error}
          </div>
        ) : (
          <CharacterDesigner character={res.character} />
        )}
      </main>
    </div>
  )
}

