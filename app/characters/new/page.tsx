import Link from "next/link"
import { redirect } from "next/navigation"
import { createCharacter } from "../actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NewCharacterPage() {
  const handleCreate = async (formData: FormData) => {
    "use server"
    const res = await createCharacter(formData)
    if (!res.ok) return
    redirect(`/characters/${res.characterId}`)
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">New character</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Create a character</h1>
          <p className="text-sm text-muted-foreground">You’ll generate the character sheet on the next step.</p>
          <div className="mt-2">
            <Link href="/characters" className={cn(buttonVariants({ variant: "outline", className: "h-10" }))}>
              Back
            </Link>
          </div>
        </header>

        <form action={handleCreate} className="grid gap-4 rounded-xl border bg-card p-5">
          <div className="grid gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              placeholder="Astra Vale"
              className={cn(
                "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Character name"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="role" className="text-sm font-medium">
              Role (optional)
            </label>
            <select
              id="role"
              name="role"
              className={cn(
                "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Character role"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button type="submit" className={cn(buttonVariants({ className: "h-10 w-fit" }))} aria-label="Create character">
            Create
          </button>
        </form>
      </main>
    </div>
  )
}

