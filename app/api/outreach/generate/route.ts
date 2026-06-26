import Anthropic from "@anthropic-ai/sdk"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { SocialPlatform } from "@/lib/outreach"
import { PLATFORM_CHAR_LIMITS } from "@/lib/outreach"

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Sign in required." }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { type } = body as { type?: string }

  if (type === "email") {
    return generateEmail(body as EmailGenerateInput)
  }

  if (type === "social") {
    return generateSocialPost(body as SocialGenerateInput)
  }

  if (type === "icp") {
    return generateIcp(body as IcpGenerateInput)
  }

  return Response.json({ error: "Invalid generation type. Use 'email', 'social', or 'icp'." }, { status: 400 })
}

type EmailGenerateInput = {
  type: "email"
  leadName: string
  leadEmail: string
  leadCompany?: string
  leadRole?: string
  topic?: string
  tone?: "professional" | "friendly" | "casual"
}

async function generateEmail(input: EmailGenerateInput) {
  const { leadName, leadCompany, leadRole, topic, tone = "professional" } = input

  const toneGuide = {
    professional: "formal and professional",
    friendly: "warm and friendly",
    casual: "casual and conversational",
  }[tone]

  const contextParts = [
    `Lead name: ${leadName}`,
    leadCompany ? `Company: ${leadCompany}` : null,
    leadRole ? `Role: ${leadRole}` : null,
    topic ? `Outreach topic: ${topic}` : "Topic: introducing the Comic Book Generator app",
  ].filter(Boolean).join("\n")

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Write a concise outreach email for the Comic Book Generator app. Tone: ${toneGuide}.

Context:
${contextParts}

The Comic Book Generator lets creators generate full comic scripts, panel art, and PDF exports using AI.

Return ONLY a JSON object with two keys: "subject" (string) and "body" (string). The body should be plain text, 3-4 short paragraphs, with a clear CTA. Do not include any markdown.`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return Response.json({ error: "Failed to parse AI response." }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { subject?: string; body?: string }
    if (!parsed.subject || !parsed.body) throw new Error("Missing fields")
    return Response.json({ subject: parsed.subject, body: parsed.body })
  } catch {
    return Response.json({ error: "Failed to parse AI response." }, { status: 500 })
  }
}

type SocialGenerateInput = {
  type: "social"
  platform: SocialPlatform
  topic?: string
  angle?: string
  includeHashtags?: boolean
}

async function generateSocialPost(input: SocialGenerateInput) {
  const { platform, topic = "AI comic book generation", angle, includeHashtags = true } = input
  const charLimit = PLATFORM_CHAR_LIMITS[platform]

  const platformGuide: Record<SocialPlatform, string> = {
    twitter: "short, punchy, max 280 chars, conversational",
    linkedin: "professional, thought-leadership style, 150-300 words",
    instagram: "visual storytelling, enthusiastic, emoji-friendly",
    facebook: "community-oriented, engaging, 100-200 words",
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Write a ${platform} post for the Comic Book Generator app.

Platform style: ${platformGuide[platform]}
Character limit: ${charLimit}
Topic: ${topic}${angle ? `\nAngle: ${angle}` : ""}

The Comic Book Generator lets anyone create full comic scripts, AI-generated panel art, and export complete PDFs.

Return ONLY a JSON object with:
- "content": the post text (must fit within ${charLimit} characters)
${includeHashtags ? '- "hashtags": array of 3-5 relevant hashtags (without the # symbol)' : '- "hashtags": []'}

Do not include hashtags inside the content string — put them in the hashtags array only.`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return Response.json({ error: "Failed to parse AI response." }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { content?: string; hashtags?: string[] }
    if (!parsed.content) throw new Error("Missing content")
    return Response.json({ content: parsed.content, hashtags: parsed.hashtags ?? [] })
  } catch {
    return Response.json({ error: "Failed to parse AI response." }, { status: 500 })
  }
}

type IcpGenerateInput = {
  type: "icp"
  clientName: string
  industry?: string
  description?: string
  topic?: string
}

async function generateIcp(input: IcpGenerateInput) {
  const { clientName, industry, description, topic } = input

  const context = [
    `Business name: ${clientName}`,
    industry ? `Industry: ${industry}` : null,
    description ? `What they do: ${description}` : null,
    topic ? `Focus area: ${topic}` : null,
  ].filter(Boolean).join("\n")

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `Write a structured Ideal Customer Profile (ICP) in markdown for this business:

${context}

Format it with these sections:
# Ideal Customer Profile — [Business name]

## 1. Who they are
(firmographics or demographics — industry, size, role, region)

## 2. What triggers them
(the event or pain that starts the buying process)

## 3. How they talk
(real language and phrases they use to describe their problem)

## 4. Where to reach them
(channels, communities, events)

## 5. Who this is NOT
(disqualifiers — looks like a fit but isn't)

## 6. Open questions to verify
(what we don't know yet and how to find out)

Be concise and specific. Tag assumptions with (assumption). Return only the markdown, no extra text.`,
      },
    ],
  })

  const icp = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  if (!icp) return Response.json({ error: "Failed to generate ICP." }, { status: 500 })
  return Response.json({ icp })
}
