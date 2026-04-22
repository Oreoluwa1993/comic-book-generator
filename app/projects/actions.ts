"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { Comic } from "@/lib/comic"

type ProjectRow = {
  id: string
  user_id: string
  title: string
  status: string
  current_revision_id: string | null
  created_at: string
  updated_at: string
}

type ProjectRevisionRow = {
  id: string
  project_id: string
  created_at: string
  label: string | null
  schema_version: number
  comic_json: unknown
}

const PROJECT_SCHEMA_VERSION = 1

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

const isComicLike = (value: unknown): value is Comic => {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.title === "string" && Array.isArray(v.panels) && typeof v.sourceStory === "string"
}

export type CreateProjectResult = { ok: true; projectId: string } | { ok: false; error: string }

export const createProject = async (input: { title: string }): Promise<CreateProjectResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const title = String(input.title ?? "").trim()
    if (!title) return { ok: false, error: "Project title is required." }

    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: userId, title })
      .select("id")
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, projectId: String(data.id) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create project." }
  }
}

export type ListProjectsResult = { ok: true; projects: ProjectRow[] } | { ok: false; error: string }

export const listProjects = async (): Promise<ListProjectsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("projects")
      .select("id,user_id,title,status,current_revision_id,created_at,updated_at")
      .order("updated_at", { ascending: false })

    if (error) return { ok: false, error: error.message }
    return { ok: true, projects: (data ?? []) as ProjectRow[] }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load projects." }
  }
}

export type GetProjectResult =
  | { ok: true; project: ProjectRow; revision: (ProjectRevisionRow & { comic: Comic }) | null }
  | { ok: false; error: string }

export const getProject = async (projectIdRaw: string): Promise<GetProjectResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const projectId = String(projectIdRaw ?? "").trim()
    if (!projectId) return { ok: false, error: "Missing project id." }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,title,status,current_revision_id,created_at,updated_at")
      .eq("id", projectId)
      .single()
    if (projectError) return { ok: false, error: projectError.message }

    const currentRevisionId = (project as ProjectRow).current_revision_id
    if (!currentRevisionId) return { ok: true, project: project as ProjectRow, revision: null }

    const { data: revision, error: revisionError } = await supabase
      .from("project_revisions")
      .select("id,project_id,created_at,label,schema_version,comic_json")
      .eq("id", currentRevisionId)
      .eq("project_id", projectId)
      .single()
    if (revisionError) return { ok: true, project: project as ProjectRow, revision: null }

    const comicJson = (revision as ProjectRevisionRow).comic_json
    if (!isComicLike(comicJson)) {
      return { ok: false, error: "Saved comic data is invalid or incompatible (schema mismatch)." }
    }

    return {
      ok: true,
      project: project as ProjectRow,
      revision: { ...(revision as ProjectRevisionRow), comic: comicJson },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load project." }
  }
}

export type SaveProjectRevisionResult = { ok: true; revisionId: string } | { ok: false; error: string }

export const saveProjectRevision = async (input: {
  projectId: string
  label?: string
  comic: Comic
}): Promise<SaveProjectRevisionResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const projectId = String(input.projectId ?? "").trim()
    if (!projectId) return { ok: false, error: "Missing project id." }
    const label = typeof input.label === "string" ? input.label.trim() : null
    const comic = input.comic
    if (!comic || !Array.isArray(comic.panels) || comic.panels.length === 0) {
      return { ok: false, error: "Nothing to save yet — generate a script first." }
    }

    const { data: revision, error: revError } = await supabase
      .from("project_revisions")
      .insert({
        project_id: projectId,
        label: label && label.length > 0 ? label : null,
        schema_version: PROJECT_SCHEMA_VERSION,
        comic_json: comic,
      })
      .select("id")
      .single()
    if (revError) return { ok: false, error: revError.message }

    const revisionId = String(revision.id)
    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update({ current_revision_id: revisionId, updated_at: new Date().toISOString() })
      .eq("id", projectId)
    if (projectUpdateError) return { ok: false, error: projectUpdateError.message }

    return { ok: true, revisionId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save project." }
  }
}

export type RenameProjectResult = { ok: true } | { ok: false; error: string }

export const renameProject = async (input: { projectId: string; title: string }): Promise<RenameProjectResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const projectId = String(input.projectId ?? "").trim()
    if (!projectId) return { ok: false, error: "Missing project id." }
    const title = String(input.title ?? "").trim()
    if (!title) return { ok: false, error: "Project title is required." }

    const { error } = await supabase
      .from("projects")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", projectId)
    if (error) return { ok: false, error: error.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to rename project." }
  }
}

export type DeleteProjectResult = { ok: true } | { ok: false; error: string }

export const deleteProject = async (input: { projectId: string }): Promise<DeleteProjectResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const projectId = String(input.projectId ?? "").trim()
    if (!projectId) return { ok: false, error: "Missing project id." }

    const { error } = await supabase.from("projects").delete().eq("id", projectId)
    if (error) return { ok: false, error: error.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete project." }
  }
}

