"use server"

import OpenAI from "openai"
import { generateImageUrlWithFallbacks } from "@/lib/image-fallback"
import { randomUUID } from "crypto"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { ComicStyleProfile } from "@/lib/comic"
import { describeCharacterFromReferences } from "@/app/actions"

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "other"

export type CharacterAssetType = "turnaround" | "expressions" | "outfit" | "reference_upload"

export type CharacterListItem = {
  id: string
  name: string
  role: string | null
  updated_at: string
  locked_version_id: string | null
  locked_preview_url: string | null
}

export type CharacterDetail = {
  id: string
  name: string
  role: string | null
  created_at: string
  updated_at: string
  versions: Array<{
    id: string
    status: "draft" | "locked"
    identity_text: string | null
    style_profile: string | null
    created_at: string
    assets: Array<{
      id: string
      asset_type: CharacterAssetType | string
      storage_path: string
      public_url: string | null
      width: number | null
      height: number | null
      created_at: string
    }>
  }>
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
  const { data } = supabase.storage.from("character-assets").getPublicUrl(storagePath)
  return data.publicUrl ?? null
}

const assertAllowedImageFile = (file: File) => {
  const mime = String(file.type || "").trim()
  const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
  if (!allowed.has(mime)) throw new Error("Unsupported image type. Use PNG, JPEG, WEBP, or GIF.")
  if (file.size <= 0) throw new Error("Empty file.")
  const maxBytes = 5 * 1024 * 1024
  if (file.size > maxBytes) throw new Error("File too large. Max 5 MB per image.")
}

const resolveStyleProfile = (raw: unknown): ComicStyleProfile => {
  const value = String(raw ?? "comic").trim().toLowerCase()
  const allowed = new Set<ComicStyleProfile>(["comic", "manga", "anime", "hybrid"])
  return allowed.has(value as ComicStyleProfile) ? (value as ComicStyleProfile) : "comic"
}

const sanitizeIdentityText = (raw: string) => {
  const cleaned = raw.replaceAll(/\s+/g, " ").trim()
  if (!cleaned) return ""
  const maxChars = 320
  if (cleaned.length <= maxChars) return cleaned
  return cleaned.slice(0, maxChars).trim()
}

const buildSheetPrompt = (input: {
  identityText: string
  styleProfile: ComicStyleProfile
  sheetType: CharacterAssetType
}) => {
  const identity = sanitizeIdentityText(input.identityText)
  const base = [
    "Comic character design sheet. Neutral background. Single character only. No text, no logos, no watermarks.",
    "Keep the same character identity across all images in this request.",
    `Style profile: ${input.styleProfile}.`,
    identity ? `Character identity: ${identity}` : null,
    "Clean linework, consistent proportions, consistent palette. Full body unless specified otherwise.",
  ]
    .filter(Boolean)

  if (input.sheetType === "turnaround") {
    return [...base, "Turnaround sheet: front view, 3/4 view, profile view (same outfit)."].join(" ")
  }
  if (input.sheetType === "expressions") {
    return [...base, "Expression sheet: head-and-shoulders grid showing happy, angry, sad, surprised."].join(" ")
  }
  if (input.sheetType === "outfit") {
    return [...base, "Outfit and props sheet: full-body with key props highlighted by simple callouts (no text)."].join(" ")
  }

  return base.join(" ")
}

const uploadBufferToCharacterAssets = async (input: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
  userId: string
  characterId: string
  versionId: string
  filename: string
  contentType: string
  bytes: Uint8Array
}) => {
  const path = `${input.userId}/${input.characterId}/${input.versionId}/${input.filename}`
  const { error } = await input.supabase.storage.from("character-assets").upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return path
}

const downloadToBytes = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to download generated image.")
  const buf = new Uint8Array(await res.arrayBuffer())
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"
  return { buf, contentType }
}

const DALLE3_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"])

const resolveGeneratedImageSize = (model: string, raw: string | undefined) => {
  if (model.includes("gpt-image") || model.includes("chatgpt-image")) {
    const gptSizes = new Set(["auto", "1024x1024", "1536x1024", "1024x1536"])
    return gptSizes.has(raw ?? "") ? (raw as "auto" | "1024x1024" | "1536x1024" | "1024x1536") : "1024x1024"
  }
  if (DALLE3_SIZES.has(raw ?? "")) return raw as "1024x1024" | "1792x1024" | "1024x1792"
  return "1024x1024"
}

export type CreateCharacterResult =
  | { ok: true; characterId: string; versionId: string }
  | { ok: false; error: string }

export const createCharacter = async (formData: FormData): Promise<CreateCharacterResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return { ok: false, error: "Character name is required." }
    const role = String(formData.get("role") ?? "").trim() || null

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .insert({ user_id: userId, name, role })
      .select("id")
      .single()
    if (characterError) return { ok: false, error: characterError.message }

    const { data: version, error: versionError } = await supabase
      .from("character_versions")
      .insert({ character_id: character.id, status: "draft" })
      .select("id")
      .single()
    if (versionError) return { ok: false, error: versionError.message }

    return { ok: true, characterId: character.id, versionId: version.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create character." }
  }
}

export type UpdateCharacterResult =
  | { ok: true }
  | { ok: false; error: string }

export const updateCharacter = async (input: { characterId: string; name?: string; role?: string | null }): Promise<UpdateCharacterResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const characterId = String(input.characterId ?? "").trim()
    if (!characterId) return { ok: false, error: "Missing character id." }

    const name = typeof input.name === "string" ? input.name.trim() : undefined
    const role = typeof input.role === "string" ? input.role.trim() : input.role === null ? null : undefined
    if (!name && role === undefined) return { ok: false, error: "Nothing to update." }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name) patch.name = name
    if (role !== undefined) patch.role = role

    const { error } = await supabase.from("characters").update(patch).eq("id", characterId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update character." }
  }
}

export type CreateCharacterVersionResult =
  | { ok: true; versionId: string }
  | { ok: false; error: string }

export const createCharacterVersion = async (input: { characterId: string }): Promise<CreateCharacterVersionResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const characterId = String(input.characterId ?? "").trim()
    if (!characterId) return { ok: false, error: "Missing character id." }

    const { data, error } = await supabase
      .from("character_versions")
      .insert({ character_id: characterId, status: "draft" })
      .select("id")
      .single()
    if (error) return { ok: false, error: error.message }

    const { error: touchError } = await supabase.from("characters").update({ updated_at: new Date().toISOString() }).eq("id", characterId)
    if (touchError) return { ok: false, error: touchError.message }

    return { ok: true, versionId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create version." }
  }
}

export type UploadCharacterReferencesResult =
  | { ok: true; assetIds: string[] }
  | { ok: false; error: string }

export const uploadCharacterReferenceImages = async (
  input: {
    characterId: string
    versionId: string
    files: File[]
  }
): Promise<UploadCharacterReferencesResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const characterId = String(input.characterId).trim()
    const versionId = String(input.versionId).trim()
    if (!characterId || !versionId) return { ok: false, error: "Missing character/version." }

    const files = Array.isArray(input.files) ? input.files.slice(0, 10) : []
    if (files.length === 0) return { ok: false, error: "No files selected." }

    const assetIds: string[] = []
    for (const file of files) {
      assertAllowedImageFile(file)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const ext = file.type.includes("png") ? "png" : file.type.includes("jpeg") ? "jpg" : file.type.includes("webp") ? "webp" : "gif"
      const filename = `ref_${randomUUID()}.${ext}`
      const storagePath = await uploadBufferToCharacterAssets({
        supabase,
        userId,
        characterId,
        versionId,
        filename,
        contentType: file.type || "image/png",
        bytes,
      })

      const { data: asset, error } = await supabase
        .from("character_assets")
        .insert({
          version_id: versionId,
          asset_type: "reference_upload",
          storage_path: storagePath,
        })
        .select("id")
        .single()

      if (error) return { ok: false, error: error.message }
      assetIds.push(asset.id)
    }

    return { ok: true, assetIds }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to upload reference images." }
  }
}

export type GenerateCharacterDesignResult =
  | {
      ok: true
      identityText: string
      createdAssetIds: string[]
    }
  | { ok: false; error: string }

export const generateCharacterDesignDraft = async (input: {
  characterId: string
  versionId: string
  userNotes: string
  referenceUrls?: string[]
  styleProfile?: ComicStyleProfile
}): Promise<GenerateCharacterDesignResult> => {
  try {
    const { supabase } = await getAuthedUserId()

    const characterId = String(input.characterId ?? "").trim()
    const versionId = String(input.versionId ?? "").trim()
    if (!characterId || !versionId) return { ok: false, error: "Missing character/version." }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id,name,role")
      .eq("id", characterId)
      .single()
    if (characterError) return { ok: false, error: characterError.message }

    const userNotes = String(input.userNotes ?? "").trim()
    if (!userNotes) return { ok: false, error: "Please add a few notes about the character first." }

    // Pull stored reference uploads (we use signed URLs implicitly via Storage download from server if needed later).
    const { data: refAssets, error: refError } = await supabase
      .from("character_assets")
      .select("storage_path")
      .eq("version_id", versionId)
      .eq("asset_type", "reference_upload")
      .limit(10)
    if (refError) return { ok: false, error: refError.message }

    const publicUrls = await Promise.all((refAssets ?? []).map(async (a) => getPublicUrl(a.storage_path)))
    const referenceUrls = [...(Array.isArray(input.referenceUrls) ? input.referenceUrls : []), ...publicUrls.filter(Boolean)].slice(0, 6)

    // Ask vision model to distill references into stable design text.
    const described = await describeCharacterFromReferences({
      name: character.name,
      notes: userNotes,
      referenceUrls,
    })
    if (!described.ok) return { ok: false, error: described.error }
    const canonicalIdentityText = sanitizeIdentityText(described.description)
    const identityForPrompts = sanitizeIdentityText([userNotes, canonicalIdentityText].filter(Boolean).join(" "))

    // Store identity text on version (canonical).
    const { data: updatedVersion, error: updateError } = await supabase
      .from("character_versions")
      .update({
        identity_text: canonicalIdentityText,
        style_profile: resolveStyleProfile(input.styleProfile),
      })
      .eq("id", versionId)
      .select("identity_text,style_profile")
      .single()
    if (updateError) return { ok: false, error: updateError.message }

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) return { ok: false, error: "Missing OPENAI_API_KEY (required to generate character sheets)." }

    const client = new OpenAI({ apiKey })
    const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3"
    const size = resolveGeneratedImageSize(imageModel, process.env.OPENAI_IMAGE_SIZE)
    const styleProfile = resolveStyleProfile(updatedVersion.style_profile)

    const sheetTypes: CharacterAssetType[] = ["turnaround", "expressions", "outfit"]
    const createdAssetIds: string[] = []

    for (const sheetType of sheetTypes) {
      const prompt = buildSheetPrompt({
        identityText: identityForPrompts,
        styleProfile,
        sheetType,
      })

      const generated = await generateImageUrlWithFallbacks({
        openaiClient: client,
        openaiModel: imageModel,
        openaiSize: String(size),
        prompt,
      })
      if (!generated.ok) return { ok: false, error: generated.error }

      const bytesAndType =
        generated.imageUrl.startsWith("data:")
          ? { buf: Uint8Array.from(Buffer.from(generated.imageUrl.split(",")[1] ?? "", "base64")), contentType: "image/png" }
          : await downloadToBytes(generated.imageUrl)
      const filename = `${sheetType}_${randomUUID()}.png`
      const { supabase: supabase2, userId } = await getAuthedUserId()
      const storagePath = await uploadBufferToCharacterAssets({
        supabase: supabase2,
        userId,
        characterId,
        versionId,
        filename,
        contentType: bytesAndType.contentType,
        bytes: bytesAndType.buf,
      })

      const { data: asset, error } = await supabase2
        .from("character_assets")
        .insert({
          version_id: versionId,
          asset_type: sheetType,
          storage_path: storagePath,
        })
        .select("id")
        .single()
      if (error) return { ok: false, error: error.message }
      createdAssetIds.push(asset.id)
    }

    return { ok: true, identityText: updatedVersion.identity_text ?? canonicalIdentityText, createdAssetIds }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to generate character design." }
  }
}

export type LockCharacterVersionResult =
  | { ok: true }
  | { ok: false; error: string }

export const lockCharacterVersion = async (input: { characterId: string; versionId: string }): Promise<LockCharacterVersionResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const characterId = String(input.characterId ?? "").trim()
    const versionId = String(input.versionId ?? "").trim()
    if (!characterId || !versionId) return { ok: false, error: "Missing character/version." }

    // Only one locked version per character.
    const { error: unlockError } = await supabase
      .from("character_versions")
      .update({ status: "draft" })
      .eq("character_id", characterId)
      .eq("status", "locked")
    if (unlockError) return { ok: false, error: unlockError.message }

    const { error: lockError } = await supabase
      .from("character_versions")
      .update({ status: "locked" })
      .eq("id", versionId)
      .eq("character_id", characterId)
    if (lockError) return { ok: false, error: lockError.message }

    // Touch character updated_at
    const { error: touchError } = await supabase.from("characters").update({ updated_at: new Date().toISOString() }).eq("id", characterId)
    if (touchError) return { ok: false, error: touchError.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to lock version." }
  }
}

export type ListCharactersResult =
  | { ok: true; characters: CharacterListItem[] }
  | { ok: false; error: string }

export const listCharacters = async (): Promise<ListCharactersResult> => {
  try {
    const { supabase } = await getAuthedUserId()

    // Fetch characters + their locked version + 1 preview asset if present.
    const { data: characters, error } = await supabase
      .from("characters")
      .select("id,name,role,updated_at")
      .order("updated_at", { ascending: false })
    if (error) return { ok: false, error: error.message }

    const out: CharacterListItem[] = []
    for (const c of characters ?? []) {
      const { data: locked } = await supabase
        .from("character_versions")
        .select("id")
        .eq("character_id", c.id)
        .eq("status", "locked")
        .order("created_at", { ascending: false })
        .limit(1)
      const lockedId = locked?.[0]?.id ?? null

      let previewUrl: string | null = null
      if (lockedId) {
        const { data: assets } = await supabase
          .from("character_assets")
          .select("storage_path,asset_type")
          .eq("version_id", lockedId)
          .in("asset_type", ["turnaround", "expressions", "outfit"])
          .order("created_at", { ascending: false })
          .limit(1)
        const storagePath = assets?.[0]?.storage_path
        if (storagePath) previewUrl = await getPublicUrl(storagePath)
      }

      out.push({
        id: c.id,
        name: c.name,
        role: c.role,
        updated_at: c.updated_at,
        locked_version_id: lockedId,
        locked_preview_url: previewUrl,
      })
    }

    return { ok: true, characters: out }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load characters." }
  }
}

export type GetCharacterDetailResult =
  | { ok: true; character: CharacterDetail }
  | { ok: false; error: string }

export const getCharacterDetail = async (characterIdRaw: string): Promise<GetCharacterDetailResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const characterId = String(characterIdRaw ?? "").trim()
    if (!characterId) return { ok: false, error: "Missing character id." }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id,name,role,created_at,updated_at")
      .eq("id", characterId)
      .single()
    if (characterError) return { ok: false, error: characterError.message }

    const { data: versions, error: versionsError } = await supabase
      .from("character_versions")
      .select("id,status,identity_text,style_profile,created_at")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
    if (versionsError) return { ok: false, error: versionsError.message }

    const hydratedVersions: CharacterDetail["versions"] = []
    for (const v of versions ?? []) {
      const { data: assets, error: assetsError } = await supabase
        .from("character_assets")
        .select("id,asset_type,storage_path,width,height,created_at")
        .eq("version_id", v.id)
        .order("created_at", { ascending: false })
      if (assetsError) return { ok: false, error: assetsError.message }

      const withUrls: CharacterDetail["versions"][number]["assets"] = await Promise.all(
        (assets ?? []).map(async (a) => {
          const publicUrl = await getPublicUrl(a.storage_path)
          return {
            id: String(a.id),
            asset_type: String(a.asset_type),
            storage_path: String(a.storage_path),
            public_url: publicUrl,
            width: (a.width ?? null) as number | null,
            height: (a.height ?? null) as number | null,
            created_at: String(a.created_at),
          }
        })
      )

      hydratedVersions.push({
        id: String(v.id),
        status: v.status === "locked" ? "locked" : "draft",
        identity_text: v.identity_text ?? null,
        style_profile: v.style_profile ?? null,
        created_at: String(v.created_at),
        assets: withUrls,
      })
    }

    return {
      ok: true,
      character: {
        ...character,
        versions: hydratedVersions,
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load character." }
  }
}

