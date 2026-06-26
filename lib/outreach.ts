export type Client = {
  id: string
  user_id: string
  name: string
  description: string | null
  industry: string | null
  website: string | null
  icp_content: string | null
  created_at: string
  updated_at: string
}

export const LEAD_STAGES = ["prospect", "contacted", "interested", "qualified", "proposal", "won", "lost"] as const
export type LeadStage = (typeof LEAD_STAGES)[number]

export const LEAD_SOURCES = ["manual", "website", "referral", "social", "other"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CAMPAIGN_CHANNELS = ["email", "linkedin", "twitter"] as const
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number]

export const MESSAGE_STATUSES = ["draft", "sent", "opened", "clicked", "replied", "bounced"] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const SOCIAL_PLATFORMS = ["twitter", "linkedin", "instagram", "facebook"] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_POST_STATUSES = ["draft", "scheduled", "published"] as const
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number]

export type Lead = {
  id: string
  user_id: string
  name: string
  email: string
  company: string | null
  role: string | null
  source: LeadSource
  stage: LeadStage
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  user_id: string
  name: string
  description: string | null
  subject: string
  body: string
  status: CampaignStatus
  channel: CampaignChannel
  scheduled_at: string | null
  sent_count: number
  open_count: number
  click_count: number
  created_at: string
  updated_at: string
}

export type CampaignLead = {
  id: string
  campaign_id: string
  lead_id: string
  added_at: string
}

export type OutreachMessage = {
  id: string
  user_id: string
  lead_id: string | null
  campaign_id: string | null
  channel: CampaignChannel
  subject: string | null
  body: string
  status: MessageStatus
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

export type SocialPost = {
  id: string
  user_id: string
  platform: SocialPlatform
  content: string
  hashtags: string[]
  status: SocialPostStatus
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  interested: "Interested",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  won: "Won",
  lost: "Lost",
}

export const STAGE_COLORS: Record<LeadStage, string> = {
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  interested: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  qualified: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  proposal: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
}

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
}
