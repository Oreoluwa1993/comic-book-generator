import { listSocialPosts } from "@/app/outreach/actions"
import { SocialGenerator } from "@/components/outreach/social-generator"

export default async function SocialPage() {
  const res = await listSocialPosts()
  const posts = res.ok ? res.posts : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Social Media Content</h2>
        <p className="text-sm text-muted-foreground">
          Use AI to generate platform-optimized posts. Save drafts and mark them published.
        </p>
      </div>

      {!res.ok ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {res.error}
        </div>
      ) : null}

      <SocialGenerator initialPosts={posts} />
    </div>
  )
}
