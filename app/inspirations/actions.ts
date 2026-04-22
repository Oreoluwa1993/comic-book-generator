"use server"

import { randomUUID } from "crypto"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export type InspirationListItem = {
  id: string
  source: string
  title: string | null
  source_url: string | null
  image_source_url: string | null
  notes: string | null
  storage_path: string
  public_url: string | null
  created_at: string
}

const getAuthedUserId = async () => {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    const low = error.message.toLowerCase()
    if (low.includes("session") || low.includes("jwt") || low.includes("auth session")) {
      throw new Error(
        "Sign in required: use “Sign in (magic link)” on this site, open the link in the same browser, add this URL to Supabase Auth redirect allow list if needed, then refresh."
      )
    }
    throw new Error(error.message)
  }
  const userId = data.user?.id
  if (!userId) {
    throw new Error(
      "Sign in required: use “Sign in (magic link)” above, then refresh. Set NEXT_PUBLIC_SITE_URL in .env.local for reliable redirects (e.g. http://localhost:3000)."
    )
  }
  return { supabase, userId }
}

const getPublicUrl = async (storagePath: string) => {
  const supabase = await getSupabaseServerClient()
  const { data } = supabase.storage.from("inspiration-assets").getPublicUrl(storagePath)
  return data.publicUrl ?? null
}

const downloadToBytes = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error("Failed to download image.")
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength <= 0) throw new Error("Empty image.")
  const maxBytes = 6 * 1024 * 1024
  if (buf.byteLength > maxBytes) throw new Error("Image too large (max 6 MB).")
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg"
  return { buf, contentType }
}

const normalizeContentTypeToExt = (contentType: string) => {
  const type = contentType.toLowerCase()
  if (type.includes("png")) return "png"
  if (type.includes("webp")) return "webp"
  if (type.includes("gif")) return "gif"
  return "jpg"
}

export type CaptureInspirationItem = {
  sourceUrl?: string
  imageUrl: string
  title?: string
}

export type CaptureInspirationsResult =
  | { ok: true; imported: number; failed: number }
  | { ok: false; error: string }

export const captureInspirationsFromBrowser = async (
  rawItems: CaptureInspirationItem[]
): Promise<CaptureInspirationsResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const items = Array.isArray(rawItems) ? rawItems.slice(0, 50) : []
    if (items.length === 0) return { ok: false, error: "No items received." }

    let imported = 0
    let failed = 0

    for (const item of items) {
      try {
        const imageUrl = String(item.imageUrl ?? "").trim()
        if (!imageUrl) throw new Error("Missing image URL.")

        const { buf, contentType } = await downloadToBytes(imageUrl)
        const ext = normalizeContentTypeToExt(contentType)
        const inspirationId = randomUUID()
        const filename = `pinterest_${randomUUID()}.${ext}`
        const storagePath = `${userId}/${inspirationId}/${filename}`

        const { error: uploadError } = await supabase.storage.from("inspiration-assets").upload(storagePath, buf, {
          contentType,
          upsert: true,
        })
        if (uploadError) throw new Error(uploadError.message)

        const sourceUrl = typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : null
        const title = typeof item.title === "string" ? item.title.trim().slice(0, 180) : null

        const { error: insertError } = await supabase.from("inspirations").insert({
          id: inspirationId,
          user_id: userId,
          source: "browser_capture",
          source_url: sourceUrl || null,
          image_source_url: imageUrl,
          title,
          storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        if (insertError) throw new Error(insertError.message)

        imported += 1
      } catch {
        failed += 1
      }
    }

    return { ok: true, imported, failed }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to capture inspirations." }
  }
}

export type ListInspirationsResult =
  | { ok: true; inspirations: InspirationListItem[] }
  | { ok: false; error: string }

export const listInspirations = async (input?: { query?: string; limit?: number }): Promise<ListInspirationsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const query = String(input?.query ?? "").trim()
    const limit = Math.min(Math.max(Number(input?.limit ?? 50) || 50, 1), 200)

    let q = supabase
      .from("inspirations")
      .select("id,source,title,source_url,image_source_url,notes,storage_path,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (query) q = q.ilike("title", `%${query}%`)

    const { data, error } = await q
    if (error) return { ok: false, error: error.message }

    const inspirations: InspirationListItem[] = await Promise.all(
      (data ?? []).map(async (row) => {
        const publicUrl = await getPublicUrl(row.storage_path)
        return {
          id: String(row.id),
          source: String(row.source),
          title: row.title ?? null,
          source_url: row.source_url ?? null,
          image_source_url: row.image_source_url ?? null,
          notes: row.notes ?? null,
          storage_path: String(row.storage_path),
          public_url: publicUrl,
          created_at: String(row.created_at),
        }
      })
    )

    return { ok: true, inspirations }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to list inspirations." }
  }
}

