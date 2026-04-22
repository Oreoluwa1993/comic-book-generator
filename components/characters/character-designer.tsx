"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CharacterDetail } from "@/app/characters/actions"
import {
  createCharacterVersion,
  generateCharacterDesignDraft,
  lockCharacterVersion,
  updateCharacter,
  uploadCharacterReferenceImages,
} from "@/app/characters/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  character: CharacterDetail
}

const pickTopPreviewAssets = (assets: CharacterDetail["versions"][number]["assets"]) => {
  const preferred = new Set(["turnaround", "expressions", "outfit"])
  return assets.filter((a) => preferred.has(a.asset_type)).slice(0, 3)
}

export const CharacterDesigner = ({ character }: Props) => {
  const router = useRouter()
  const [localName, setLocalName] = useState(character.name)
  const [localRole, setLocalRole] = useState(character.role ?? "")
  const [userNotes, setUserNotes] = useState("")
  const [referenceUrls, setReferenceUrls] = useState("")

  const [activeVersionId, setActiveVersionId] = useState(character.versions[0]?.id ?? "")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeVersion = useMemo(
    () => character.versions.find((v) => v.id === activeVersionId) ?? character.versions[0],
    [character.versions, activeVersionId]
  )

  const lockedVersionId = useMemo(() => character.versions.find((v) => v.status === "locked")?.id ?? null, [character.versions])

  const handleSaveBasics = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await updateCharacter({
        characterId: character.id,
        name: localName,
        role: localRole.trim() ? localRole.trim() : null,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess("Saved.")
      router.refresh()
    })
  }

  const handleUploadReferenceFiles = () => {
    setError(null)
    setSuccess(null)
    const v = activeVersion
    if (!v) {
      setError("Pick a version first.")
      return
    }
    const files = Array.from(fileInputRef.current?.files ?? [])
    if (files.length === 0) {
      setError("Select at least one image.")
      return
    }

    startTransition(async () => {
      const res = await uploadCharacterReferenceImages({ characterId: character.id, versionId: v.id, files })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess(`Uploaded ${res.assetIds.length} reference image(s).`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      router.refresh()
    })
  }

  const handleGenerateDraft = () => {
    setError(null)
    setSuccess(null)
    const v = activeVersion
    if (!v) {
      setError("Pick a version first.")
      return
    }
    const notes = userNotes.trim()
    if (!notes) {
      setError("Add a few notes (stable visual traits) before generating.")
      return
    }
    const urls = referenceUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)

    startTransition(async () => {
      const res = await generateCharacterDesignDraft({
        characterId: character.id,
        versionId: v.id,
        userNotes: notes,
        referenceUrls: urls,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess("Generated character sheet assets.")
      router.refresh()
    })
  }

  const handleLockVersion = () => {
    setError(null)
    setSuccess(null)
    const v = activeVersion
    if (!v) {
      setError("Pick a version first.")
      return
    }

    startTransition(async () => {
      const res = await lockCharacterVersion({ characterId: character.id, versionId: v.id })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess("Locked.")
      router.refresh()
    })
  }

  const handleCreateNewVersion = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await createCharacterVersion({ characterId: character.id })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess("Created a new draft version.")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1">
            <h2 className="text-base font-semibold">Basics</h2>
            <p className="text-xs text-muted-foreground">These help keep your library tidy (they don’t change the art directly).</p>
          </div>
          <Button type="button" className="h-10 w-fit" onClick={handleSaveBasics} disabled={isPending} aria-label="Save character basics">
            Save
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="characterName" className="text-sm font-medium">
              Name
            </label>
            <input
              id="characterName"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className={cn(
                "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Character name"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="characterRole" className="text-sm font-medium">
              Role
            </label>
            <select
              id="characterRole"
              value={localRole}
              onChange={(e) => setLocalRole(e.target.value)}
              className={cn(
                "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Character role"
            >
              <option value="">—</option>
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Version</h2>
          <p className="text-xs text-muted-foreground">
            Generate sheets in a draft, then lock one version for consistent comics.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1.5">
            <label htmlFor="versionSelect" className="text-sm font-medium">
              Active version
            </label>
            <select
              id="versionSelect"
              value={activeVersionId}
              onChange={(e) => setActiveVersionId(e.target.value)}
              className={cn(
                "h-10 w-full min-w-72 rounded-xl border bg-background px-3 text-sm outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              aria-label="Select active version"
            >
              {character.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.status === "locked" ? "Locked" : "Draft"} · {new Date(v.created_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={handleCreateNewVersion} disabled={isPending} aria-label="Create new version">
              New version
            </Button>
            <Button
              type="button"
              className="h-10"
              onClick={handleLockVersion}
              disabled={isPending || !activeVersion}
              aria-label="Lock this version"
            >
              Lock version
            </Button>
          </div>
        </div>

        {lockedVersionId ? (
          <p className="text-xs text-muted-foreground">
            Current locked version: <span className="font-medium text-foreground">{lockedVersionId}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No locked version yet.</p>
        )}
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">References</h2>
          <p className="text-xs text-muted-foreground">Upload a few images and/or paste URLs. These improve identity extraction.</p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="refUrls" className="text-sm font-medium">
            Reference URLs (optional, one per line)
          </label>
          <textarea
            id="refUrls"
            value={referenceUrls}
            onChange={(e) => setReferenceUrls(e.target.value)}
            rows={3}
            placeholder="https://...\nhttps://..."
            className={cn(
              "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
            aria-label="Reference image URLs"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="refFiles" className="text-sm font-medium">
            Reference images from device
          </label>
          <input
            ref={fileInputRef}
            id="refFiles"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className={cn(
              "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            )}
            aria-label="Upload character reference images"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={handleUploadReferenceFiles} disabled={isPending} aria-label="Upload selected reference images">
              Upload references
            </Button>
            <p className="text-xs text-muted-foreground">Tip: 2–6 images is plenty (front view + close-up + outfit).</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">Generate character sheet</h2>
          <p className="text-xs text-muted-foreground">
            Write stable traits only (avoid scenes). We’ll generate: turnaround + expressions + outfit/props.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="userNotes" className="text-sm font-medium">
            Notes (authoritative)
          </label>
          <textarea
            id="userNotes"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            rows={3}
            placeholder="Mid-20s, warm brown skin, short curly black hair, amber eyes, athletic build, red scarf always present…"
            className={cn(
              "w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
            aria-label="Character notes"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ className: "h-10" }))}
            onClick={handleGenerateDraft}
            disabled={isPending || !activeVersion}
            aria-label="Generate character sheet"
          >
            Generate design draft
          </button>
          <p className="text-xs text-muted-foreground">This can take ~10–30s depending on model.</p>
        </div>
        {activeVersion?.identity_text ? (
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Canonical identity (used for locking)</p>
            <p className="mt-1 text-sm">{activeVersion.identity_text}</p>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}
      {success ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{success}</div> : null}

      <section className="grid gap-3">
        <h2 className="text-base font-semibold">Assets (current page snapshot)</h2>
        <p className="text-xs text-muted-foreground">Uploads and generations automatically refresh this page.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {character.versions.flatMap((v) =>
            pickTopPreviewAssets(v.assets).map((a) => (
              <div key={a.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <p className="text-xs font-medium">{a.asset_type}</p>
                  <p className="text-[11px] text-muted-foreground">{v.status === "locked" ? "Locked" : "Draft"}</p>
                </div>
                {a.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.public_url} alt="" className="h-48 w-full object-cover" />
                ) : (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-xs text-muted-foreground">No preview</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

