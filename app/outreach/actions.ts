"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import type {
  Client,
  Lead,
  LeadStage,
  LeadSource,
  Campaign,
  CampaignStatus,
  CampaignChannel,
  SocialPost,
  SocialPlatform,
  SocialPostStatus,
} from "@/lib/outreach"

const getAuthedUserId = async () => {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id) {
    throw new Error("Sign in required to use the outreach engine.")
  }
  return { supabase, userId: data.user.id }
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export type ListClientsResult = { ok: true; clients: Client[] } | { ok: false; error: string }

export const listClients = async (): Promise<ListClientsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true })
    if (error) return { ok: false, error: error.message }
    return { ok: true, clients: data as Client[] }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load clients." }
  }
}

export type GetClientResult = { ok: true; client: Client } | { ok: false; error: string }

export const getClient = async (clientId: string): Promise<GetClientResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("user_id", userId)
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, client: data as Client }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load client." }
  }
}

export type CreateClientResult = { ok: true; client: Client } | { ok: false; error: string }

export const createClient = async (input: {
  name: string
  description?: string
  industry?: string
  website?: string
}): Promise<CreateClientResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const name = input.name.trim()
    if (!name) return { ok: false, error: "Client name is required." }
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name,
        description: input.description?.trim() || null,
        industry: input.industry?.trim() || null,
        website: input.website?.trim() || null,
      })
      .select("*")
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, client: data as Client }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create client." }
  }
}

export type UpdateClientResult = { ok: true; client: Client } | { ok: false; error: string }

export const updateClient = async (
  clientId: string,
  patch: Partial<Pick<Client, "name" | "description" | "industry" | "website" | "icp_content">>
): Promise<UpdateClientResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("clients")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, client: data as Client }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update client." }
  }
}

export type DeleteClientResult = { ok: true } | { ok: false; error: string }

export const deleteClient = async (clientId: string): Promise<DeleteClientResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { error } = await supabase.from("clients").delete().eq("id", clientId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete client." }
  }
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export type ListLeadsResult = { ok: true; leads: Lead[] } | { ok: false; error: string }

export const listLeads = async (clientId: string): Promise<ListLeadsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    if (error) return { ok: false, error: error.message }
    return { ok: true, leads: data as Lead[] }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load leads." }
  }
}

export type CreateLeadResult = { ok: true; lead: Lead } | { ok: false; error: string }

export const createLead = async (
  clientId: string,
  input: {
    name: string
    email: string
    company?: string
    role?: string
    source?: LeadSource
    notes?: string
  }
): Promise<CreateLeadResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (!name) return { ok: false, error: "Name is required." }
    if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required." }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: userId,
        client_id: clientId,
        name,
        email,
        company: input.company?.trim() || null,
        role: input.role?.trim() || null,
        source: input.source ?? "manual",
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, lead: data as Lead }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create lead." }
  }
}

export type UpdateLeadStageResult = { ok: true } | { ok: false; error: string }

export const updateLeadStage = async (leadId: string, stage: LeadStage): Promise<UpdateLeadStageResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { error } = await supabase
      .from("leads")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update stage." }
  }
}

export type UpdateLeadResult = { ok: true; lead: Lead } | { ok: false; error: string }

export const updateLead = async (
  leadId: string,
  patch: Partial<Pick<Lead, "name" | "email" | "company" | "role" | "source" | "notes" | "tags">>
): Promise<UpdateLeadResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("leads")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, lead: data as Lead }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update lead." }
  }
}

export type DeleteLeadResult = { ok: true } | { ok: false; error: string }

export const deleteLead = async (leadId: string): Promise<DeleteLeadResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { error } = await supabase.from("leads").delete().eq("id", leadId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete lead." }
  }
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export type ListCampaignsResult = { ok: true; campaigns: Campaign[] } | { ok: false; error: string }

export const listCampaigns = async (clientId: string): Promise<ListCampaignsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    if (error) return { ok: false, error: error.message }
    return { ok: true, campaigns: data as Campaign[] }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load campaigns." }
  }
}

export type GetCampaignResult =
  | { ok: true; campaign: Campaign; leads: Lead[] }
  | { ok: false; error: string }

export const getCampaign = async (campaignId: string): Promise<GetCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data: campaign, error: ce } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()
    if (ce) return { ok: false, error: ce.message }

    const { data: cl, error: cle } = await supabase
      .from("campaign_leads")
      .select("lead_id")
      .eq("campaign_id", campaignId)
    if (cle) return { ok: false, error: cle.message }

    const leadIds = (cl ?? []).map((r: { lead_id: string }) => r.lead_id)
    let leads: Lead[] = []
    if (leadIds.length > 0) {
      const { data: ld, error: le } = await supabase.from("leads").select("*").in("id", leadIds)
      if (le) return { ok: false, error: le.message }
      leads = (ld ?? []) as Lead[]
    }

    return { ok: true, campaign: campaign as Campaign, leads }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load campaign." }
  }
}

export type CreateCampaignResult = { ok: true; campaign: Campaign } | { ok: false; error: string }

export const createCampaign = async (
  clientId: string,
  input: {
    name: string
    description?: string
    subject: string
    body: string
    channel?: CampaignChannel
  }
): Promise<CreateCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const name = input.name.trim()
    const subject = input.subject.trim()
    const body = input.body.trim()
    if (!name) return { ok: false, error: "Campaign name is required." }
    if (!subject) return { ok: false, error: "Subject is required." }
    if (!body) return { ok: false, error: "Message body is required." }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        client_id: clientId,
        name,
        description: input.description?.trim() || null,
        subject,
        body,
        channel: input.channel ?? "email",
      })
      .select("*")
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, campaign: data as Campaign }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create campaign." }
  }
}

export type UpdateCampaignResult = { ok: true; campaign: Campaign } | { ok: false; error: string }

export const updateCampaign = async (
  campaignId: string,
  patch: Partial<Pick<Campaign, "name" | "description" | "subject" | "body" | "status" | "channel" | "scheduled_at">>
): Promise<UpdateCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("campaigns")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, campaign: data as Campaign }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update campaign." }
  }
}

export type DeleteCampaignResult = { ok: true } | { ok: false; error: string }

export const deleteCampaign = async (campaignId: string): Promise<DeleteCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete campaign." }
  }
}

export type AddLeadsToCampaignResult = { ok: true; added: number } | { ok: false; error: string }

export const addLeadsToCampaign = async (
  campaignId: string,
  leadIds: string[]
): Promise<AddLeadsToCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data: camp, error: ce } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()
    if (ce || !camp) return { ok: false, error: "Campaign not found." }

    const rows = leadIds.map((lead_id) => ({ campaign_id: campaignId, lead_id }))
    const { error } = await supabase.from("campaign_leads").upsert(rows, { onConflict: "campaign_id,lead_id" })
    if (error) return { ok: false, error: error.message }
    return { ok: true, added: leadIds.length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add leads." }
  }
}

export type RemoveLeadFromCampaignResult = { ok: true } | { ok: false; error: string }

export const removeLeadFromCampaign = async (
  campaignId: string,
  leadId: string
): Promise<RemoveLeadFromCampaignResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    const { error } = await supabase
      .from("campaign_leads")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to remove lead." }
  }
}

export type SendCampaignResult = { ok: true; sent: number } | { ok: false; error: string }

export const sendCampaign = async (campaignId: string): Promise<SendCampaignResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()

    const { data: campaign, error: ce } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()
    if (ce || !campaign) return { ok: false, error: "Campaign not found." }

    const { data: cl, error: cle } = await supabase
      .from("campaign_leads")
      .select("lead_id")
      .eq("campaign_id", campaignId)
    if (cle) return { ok: false, error: cle.message }

    const leadIds = (cl ?? []).map((r: { lead_id: string }) => r.lead_id)
    if (leadIds.length === 0) return { ok: false, error: "No leads in this campaign." }

    const { data: leadsData, error: le } = await supabase.from("leads").select("*").in("id", leadIds)
    if (le) return { ok: false, error: le.message }

    const now = new Date().toISOString()
    const messages = (leadsData ?? []).map((lead: Lead) => ({
      user_id: userId,
      client_id: campaign.client_id,
      lead_id: lead.id,
      campaign_id: campaignId,
      channel: campaign.channel,
      subject: campaign.subject,
      body: campaign.body
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{company\}\}/g, lead.company ?? ""),
      status: "sent",
      sent_at: now,
    }))

    const { error: me } = await supabase.from("outreach_messages").insert(messages)
    if (me) return { ok: false, error: me.message }

    const { error: ue } = await supabase
      .from("campaigns")
      .update({
        status: "active",
        sent_count: (campaign.sent_count ?? 0) + messages.length,
        updated_at: now,
      })
      .eq("id", campaignId)
      .eq("user_id", userId)
    if (ue) return { ok: false, error: ue.message }

    return { ok: true, sent: messages.length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send campaign." }
  }
}

// ─── Social Posts ─────────────────────────────────────────────────────────────

export type ListSocialPostsResult = { ok: true; posts: SocialPost[] } | { ok: false; error: string }

export const listSocialPosts = async (
  clientId: string,
  platform?: SocialPlatform
): Promise<ListSocialPostsResult> => {
  try {
    const { supabase } = await getAuthedUserId()
    let q = supabase
      .from("social_posts")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    if (platform) q = q.eq("platform", platform)
    const { data, error } = await q
    if (error) return { ok: false, error: error.message }
    return { ok: true, posts: data as SocialPost[] }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load posts." }
  }
}

export type SaveSocialPostResult = { ok: true; post: SocialPost } | { ok: false; error: string }

export const saveSocialPost = async (
  clientId: string,
  input: {
    platform: SocialPlatform
    content: string
    hashtags?: string[]
    status?: SocialPostStatus
    scheduled_at?: string
  }
): Promise<SaveSocialPostResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const content = input.content.trim()
    if (!content) return { ok: false, error: "Post content is required." }

    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        user_id: userId,
        client_id: clientId,
        platform: input.platform,
        content,
        hashtags: input.hashtags ?? [],
        status: input.status ?? "draft",
        scheduled_at: input.scheduled_at ?? null,
      })
      .select("*")
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, post: data as SocialPost }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save post." }
  }
}

export type UpdateSocialPostResult = { ok: true; post: SocialPost } | { ok: false; error: string }

export const updateSocialPost = async (
  postId: string,
  patch: Partial<Pick<SocialPost, "content" | "hashtags" | "status" | "scheduled_at">>
): Promise<UpdateSocialPostResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { data, error } = await supabase
      .from("social_posts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", postId)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, post: data as SocialPost }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update post." }
  }
}

export type DeleteSocialPostResult = { ok: true } | { ok: false; error: string }

export const deleteSocialPost = async (postId: string): Promise<DeleteSocialPostResult> => {
  try {
    const { supabase, userId } = await getAuthedUserId()
    const { error } = await supabase.from("social_posts").delete().eq("id", postId).eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete post." }
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export type OutreachStats = {
  totalLeads: number
  leadsByStage: Record<string, number>
  totalCampaigns: number
  messagesSent: number
  totalSocialPosts: number
}

export type GetStatsResult = { ok: true; stats: OutreachStats } | { ok: false; error: string }

export const getOutreachStats = async (clientId: string): Promise<GetStatsResult> => {
  try {
    const { supabase } = await getAuthedUserId()

    const [leadsRes, campaignsRes, messagesRes, socialRes] = await Promise.all([
      supabase.from("leads").select("stage").eq("client_id", clientId),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "sent"),
      supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    ])

    const leads = (leadsRes.data ?? []) as { stage: string }[]
    const leadsByStage: Record<string, number> = {}
    for (const l of leads) {
      leadsByStage[l.stage] = (leadsByStage[l.stage] ?? 0) + 1
    }

    return {
      ok: true,
      stats: {
        totalLeads: leads.length,
        leadsByStage,
        totalCampaigns: campaignsRes.count ?? 0,
        messagesSent: messagesRes.count ?? 0,
        totalSocialPosts: socialRes.count ?? 0,
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to load stats." }
  }
}
