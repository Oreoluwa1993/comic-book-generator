"use client"

import { useState, useTransition } from "react"
import { saveSocialPost, deleteSocialPost, updateSocialPost } from "@/app/outreach/actions"
import type { SocialPlatform, SocialPost } from "@/lib/outreach"
import { SOCIAL_PLATFORMS, PLATFORM_CHAR_LIMITS } from "@/lib/outreach"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  initialPosts: SocialPost[]
}

export const SocialGenerator = ({ initialPosts }: Props) => {
  const [platform, setPlatform] = useState<SocialPlatform>("twitter")
  const [topic, setTopic] = useState("")
  const [angle, setAngle] = useState("")
  const [generated, setGenerated] = useState<{ content: string; hashtags: string[] } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [posts, setPosts] = useState(initialPosts)
  const [saving, startSave] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  const generate = async () => {
    setGenError(null)
    setGenerated(null)
    setGenerating(true)
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "social",
          platform,
          topic: topic || undefined,
          angle: angle || undefined,
          includeHashtags: true,
        }),
      })
      const data = (await res.json()) as { content?: string; hashtags?: string[]; error?: string }
      if (!res.ok || data.error) {
        setGenError(data.error ?? "Generation failed.")
        return
      }
      setGenerated({ content: data.content ?? "", hashtags: data.hashtags ?? [] })
    } catch {
      setGenError("Network error. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  const save = () => {
    if (!generated) return
    setSaveError(null)
    startSave(async () => {
      const res = await saveSocialPost({
        platform,
        content: generated.content,
        hashtags: generated.hashtags,
        status: "draft",
      })
      if (!res.ok) {
        setSaveError(res.error)
        return
      }
      setPosts((prev) => [res.post, ...prev])
      setGenerated(null)
    })
  }

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    startDelete(async () => {
      await deleteSocialPost(postId)
    })
  }

  const markPublished = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, status: "published", published_at: new Date().toISOString() } : p
      )
    )
    startDelete(async () => {
      await updateSocialPost(postId, { status: "published" })
    })
  }

  const charLimit = PLATFORM_CHAR_LIMITS[platform]
  const charCount = generated?.content.length ?? 0
  const overLimit = charCount > charLimit

  const filteredPosts = posts.filter((p) => p.platform === platform)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
        {SOCIAL_PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setPlatform(p); setGenerated(null); setGenError(null) }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              platform === p
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Generate {platform} post</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="AI comic generation, new features…"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Angle (optional)</span>
            <input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="Behind the scenes, how-to, announcement…"
              className={inputCls}
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={generate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
        </div>
        {genError ? <p className="mt-2 text-sm text-destructive">{genError}</p> : null}

        {generated ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Generated content</p>
              <span
                className={cn(
                  "text-xs",
                  overLimit ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {charCount}/{charLimit}
              </span>
            </div>
            <textarea
              rows={6}
              value={generated.content}
              onChange={(e) => setGenerated((g) => g ? { ...g, content: e.target.value } : g)}
              className={cn(
                "w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50"
              )}
            />
            {generated.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {generated.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                className="h-8"
                onClick={save}
                disabled={saving || overLimit}
              >
                {saving ? "Saving…" : "Save as draft"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => { setGenerated(null); setGenError(null) }}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">
          Saved {platform} posts ({filteredPosts.length})
        </h3>
        {filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No {platform} posts yet. Generate one above.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredPosts.map((post) => (
              <li key={post.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-wrap text-sm">{post.content}</p>
                    {post.hashtags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          post.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {post.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {post.status === "draft" ? (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => markPublished(post.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                      >
                        Mark published
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => deletePost(post.id)}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const inputCls = cn(
  "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring/50"
)
