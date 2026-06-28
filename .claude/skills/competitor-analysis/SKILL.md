---
name: competitor-analysis
description: >
  Researches competitors for a given client across ads, SEO, social media,
  and content marketing. Synthesises findings through the JTBD and ICP
  frameworks — never copies, always analyses and repositions. Outputs a
  structured intelligence report and appends standing rules to
  .claude/competitor-learnings.md, which the copy-improver reads on every run.
  Works for any industry or business type.
---

# Competitor Analysis Skill

Turns competitor intelligence into outreach edge. Every finding is filtered
through the client's JTBD and ICP before becoming a recommendation — the goal
is to find the jobs competitors are NOT addressing well and own that gap.

## Args

`/competitor-analysis [clientSlug|clientId] [--focus ads|seo|social|content|all] [--competitors domain1.com,domain2.com]`

- `clientSlug` — folder name under `clients/` (e.g. `cintelytics-terminal`). Preferred.
- `clientId` — Supabase UUID. If provided instead of slug, look up the slug in `clients/_index.md`.
- `--focus` — which channels to research. Default: `all`.
- `--competitors` — comma-separated competitor domains. If omitted, the skill
  identifies them from the client's icp.md and the DB, or asks the user.

---

## PRE-FLIGHT — MANDATORY

Do not research anything until all four files are loaded.

### PF-0 — Resolve client slug and folder

```
Read: clients/_index.md
```

From the arg provided:
- If a slug (e.g. `cintelytics-terminal`) was passed: confirm it exists in `_index.md`. Set `{clientFolder} = clients/{slug}`.
- If a UUID was passed: find the matching row in `_index.md` and extract the slug. Set `{clientFolder} = clients/{slug}`.
- If neither matches: STOP — `⛔ Client not found in clients/_index.md. Add the client first.`

All subsequent file reads in this skill use `{clientFolder}/`.

### PF-1 — Read icp.md

Extract:
- Client's business / product / service
- Primary ICP segments and their pain points
- Language the ICP uses (exact phrases from icp.md)
- Channels that worked for the client

If `{clientFolder}/icp.md` is missing:
> ⛔ icp.md not found at {clientFolder}/icp.md. Run `/icp {clientSlug}` first to generate the ICP for this client.

### PF-2 — Read jtbd.md

```
Read: {clientFolder}/jtbd.md
```

Extract:
- Core job statement
- Outcome statements (the wins the client's product delivers)
- Obstacle (what blocks customers today)
- JTBD language rules (Use / Avoid lists)
- Disqualifier table

If `{clientFolder}/jtbd.md` is missing: create it from icp.md, then continue.

### PF-3 — Load competitor learnings

```
Read: {clientFolder}/competitor-learnings.md
```

- If it exists: load all standing rules. These constrain recommendations —
  don't contradict a standing rule without flagging the conflict.
- If missing: note "Run #1 — no prior competitor intelligence."

### PF-4 — Load copy learnings

```
Read: {clientFolder}/copy-learnings.md
```

Cross-reference: competitor tactics that contradict a copy standing rule
must be flagged, not silently merged.

### PF-5 — Confirm client and scope

State:
1. Client name + what they sell.
2. The channels being researched.
3. The competitors being analysed (list them or say you'll identify them).

Wait for user confirmation before proceeding.

---

## Step 1 — Identify competitors

### 1a — Query known competitors from DB

```sql
SELECT id, name, website, last_analyzed_at, positioning_notes
FROM competitors
WHERE client_id = '<clientId>'
ORDER BY last_analyzed_at DESC NULLS FIRST;
```

### 1b — Identify from ICP if DB is empty

Read icp.md for competitor mentions. If none: ask the user:
> Who are the top 2–4 competitors for [client name]? Paste their domains.

### 1c — Web discovery (if competitors still unknown)

Search:
```
"[client product/service] alternatives" OR "[client product] vs" OR
"best [client category] tools" site:g2.com OR site:capterra.com OR site:trustpilot.com
```

Extract the top 3–4 recurring names. Confirm with user before researching.

---

## Step 2 — Research each competitor

### Research philosophy (from "AI Competitors Analysis: The Only AI Workflow I Trust")

The core methodology is **persistent tracking over time, not one-off snapshots**.
Generic AI tools fail competitor research because they return stale training data or
PR statements. The approach here uses real public signals — actual ads running now,
real review language, live website copy — then synthesises through the JTBD lens.

**Key principle:** An ad that has been running for 3+ months is a proven winner.
A landing page that hasn't changed in 6 months is their stable positioning.
These are the signals that matter, not their press releases.

Run every sub-step for every competitor. Use WebSearch + WebFetch for each.
Do NOT skip a channel because it's harder — use the free proxy methods listed.

---

### RESEARCH ENGINE STACK

These are the tools the skill uses, organised by channel. Free tools run first.
Paid tools are flagged — use them if the client has access, otherwise use the
free proxy methods.

#### Ads
| Tool | Cost | What it gives you |
|---|---|---|
| Meta Ad Library | Free | Every active FB/IG/Reels ad — hook, creative, duration |
| Google Ads Transparency | Free | Search + display + YouTube ads |
| LinkedIn Ad Library | Free | B2B sponsored content |
| TikTok Ad Library | Free (some regions) | TikTok creatives and hooks |
| Wayback Machine | Free | Historical landing pages — see how they've evolved |
| Panoramata | Paid | Automated tracking of ads + emails + website changes over time |
| SimilarWeb | Freemium | Traffic estimates, referral sources, paid vs organic split |

#### SEO & Content
| Tool | Cost | What it gives you |
|---|---|---|
| Google site: search | Free | Indexed page count, content structure |
| Google search | Free | What they rank for (infer from SERP snippets) |
| Ubersuggest | Freemium | Keyword rankings, traffic estimates |
| SEMrush | Freemium (10 free/day) | Organic keywords, competitor gap analysis |
| Ahrefs | Paid | Backlink profile, DR, top pages |
| Really Good Emails | Free | Email design and copy benchmarks |

#### Email marketing
| Tool | Cost | What it gives you |
|---|---|---|
| Sign up to their list manually | Free | Real emails, subject lines, send frequency |
| Owletter | Paid | Automated competitor email capture and archiving |
| Mailcharts | Paid | Email frequency, subject line patterns, flow structure |

**Free proxy:** Search `"[competitor name]" email subject line OR newsletter`
and `site:reallygoodemails.com "[competitor name]"` for captured examples.

#### Social media
| Tool | Cost | What it gives you |
|---|---|---|
| Platform search (LinkedIn, X, IG) | Free | Post frequency, content types, engagement |
| SocialBlade | Free | YouTube growth, upload frequency |
| Metricool | Freemium | Cross-platform benchmarks |

#### Reviews & customer voice
| Tool | Cost | What it gives you |
|---|---|---|
| G2 | Free | Feature-level reviews, switching reasons |
| Capterra | Free | SMB buyer language |
| Trustpilot | Free | Consumer sentiment |
| Reddit | Free | Unfiltered real customer conversations |
| Product Hunt | Free | Launch positioning, early-adopter reaction |

#### Hiring & growth signals
| Tool | Cost | What it gives you |
|---|---|---|
| LinkedIn Jobs | Free | Where they're investing (hiring = growth signal) |
| Crunchbase | Freemium | Funding rounds, headcount, investor signals |

---

### 2a — Ads intelligence

**Meta Ad Library:**
```
WebSearch: site:facebook.com/ads/library "[competitor name]"
```
Then:
```
WebFetch: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=[competitor+name]&search_type=keyword_unordered
```

Extract:
- Are they running ads? How many active?
- **Duration signal:** Ads running 60+ days = proven winners. Note the oldest.
- Hook style: pain-first / outcome-first / social-proof-first / offer-first?
- CTA: what action do they ask for?
- Creative format: video, static, carousel?
- Landing page destination (if visible)

**Google Ads Transparency:**
```
WebFetch: https://adstransparency.google.com/advertiser/search?query=[competitor+name]&region=anywhere
```
Also:
```
WebSearch: "[competitor name]" google ads OR PPC -site:[competitor domain]
```

Extract:
- Are they running search/display/YouTube ads?
- What headlines and descriptions appear in search ads?
- What landing page do they send paid traffic to?

**LinkedIn Ad Library (especially for B2B clients):**
```
WebFetch: https://www.linkedin.com/ad-library/search?q=[competitor+name]
```

**Historical positioning (Wayback Machine):**
```
WebFetch: https://web.archive.org/web/*/[competitor domain]
```
Compare the most recent snapshot against one from 12 months ago.
Extract: Has their headline changed? Have they pivoted positioning?

### 2b — SEO and content intelligence

**Homepage — live positioning:**
```
WebFetch: https://[competitor domain]
```
Extract:
- H1 / hero headline (their #1 claim)
- What job/outcome they lead with
- Navigation: which pages they surface first
- Social proof: logos, numbers, testimonials language
- CTA: what they ask for on the homepage

**Blog / content hub:**
```
WebFetch: https://[competitor domain]/blog
```
(Also try /resources, /insights, /content, /learn)
Extract:
- Top 5 most prominent topics
- Format preference: long-form guides, listicles, case studies, videos
- SEO signals: keyword-rich titles visible

**Search footprint:**
```
WebSearch: site:[competitor domain]
```
Count indexed pages. 1000+ = heavy SEO investment.

```
WebSearch: "[competitor brand]" how to OR guide OR review OR "I use"
```
What third-party content exists? What questions is their audience asking?

**Keyword gap proxy (free):**
```
WebSearch: [competitor brand] keyword ranking OR SEO traffic
```
Also search Ubersuggest free:
```
WebFetch: https://app.neilpatel.com/en/traffic_analyzer/overview?lang=en&locId=2826&domain=[competitor domain]
```

### 2c — Email intelligence

**Sign-up proxy check:**
```
WebFetch: https://[competitor domain]/newsletter (or /subscribe, /free-trial, /signup)
```
Note: Does their lead magnet reveal their top funnel strategy?

**Email archive search:**
```
WebSearch: site:reallygoodemails.com "[competitor name]"
```
```
WebSearch: "[competitor name]" email subject line OR newsletter subject
```

Extract:
- Subject line patterns: question, number, urgency, personalisation?
- Send frequency signals (if visible from archived examples)
- Onboarding hook: what do they promise immediately post sign-up?
- Tone: formal/informal, feature-heavy/outcome-heavy?

### 2d — Social media intelligence

**LinkedIn (most important for B2B):**
```
WebFetch: https://www.linkedin.com/company/[competitor-slug]/posts/
```
```
WebSearch: [competitor name] site:linkedin.com post OR article
```

Extract:
- Posting frequency
- Content type breakdown: thought leadership / product / case study / behind-scenes
- Engagement pattern: which content gets most likes/comments?
- Employee advocacy: are staff posting too?

**Twitter/X, Instagram:**
```
WebSearch: [competitor name] site:twitter.com OR site:x.com
```
```
WebSearch: [competitor name] site:instagram.com
```

**YouTube (if video-active):**
```
WebSearch: [competitor name] site:youtube.com channel
```
```
WebFetch: https://www.socialbladeurl.com/youtube/c/[channel-name]
```
Extract upload frequency, subscriber growth trend.

### 2e — Customer voice (reviews)

```
WebSearch: "[competitor name]" review site:g2.com
WebSearch: "[competitor name]" review site:capterra.com
WebSearch: "[competitor name]" site:reddit.com
WebSearch: "[competitor name]" site:producthunt.com
```

For each source, extract:
- **Positive reviews:** exact phrases customers use to describe the value
  (this is their proven outcome language — what jobs they're winning)
- **Negative reviews:** exact complaints — these are the jobs they're FAILING
  (this is the gap your client can own)
- **Switching reason (if visible):** why did people leave? What pulled them?

### 2f — Growth and hiring signals

```
WebSearch: [competitor name] site:linkedin.com/jobs OR hiring
WebFetch: https://www.crunchbase.com/organization/[competitor-slug]
```

Extract:
- Are they hiring in sales/marketing? (= they're pushing growth)
- Are they hiring in product/eng? (= new features coming, potential positioning shift)
- Funding stage + recent rounds (= budget signal, urgency)

### 2g — PR and earned media

```
WebSearch: "[competitor name]" site:techcrunch.com OR site:forbes.com OR site:wired.com
WebSearch: "[competitor name]" press release OR announcement 2025 OR 2026
WebSearch: "[competitor name]" podcast interview OR webinar
```

Extract:
- What stories do they pitch to media?
- What narrative frame do journalists adopt about them?
- Are they investing in thought leadership (podcasts, webinars)?

### 2h — Set up ongoing monitoring (Panoramata approach)

For each competitor, generate the following monitoring setup the user can activate:

**Free monitoring stack:**
```
Google Alert: "[competitor name]" — set to "As it happens", all results
Google Alert: "[competitor product]" review — weekly digest
```

**Manual cadence to recommend to user:**
- Weekly: Check Meta Ad Library for new creatives
- Monthly: Re-fetch their homepage + blog for positioning changes
- Quarterly: Re-run full competitor analysis → append to competitor-learnings.md

**Paid option (if client budget allows):**
- Panoramata (panoramata.co) — automates email + ad + website change tracking
  across all competitors. Saves ~20 hours/month vs manual. Recommend if the
  client runs more than 2 active campaigns per month.

---

## Step 3 — JTBD filter

For every competitor tactic found, run it through the JTBD lens:

**Job coverage check:**
- Which of the 5 outcome statements from jtbd.md does this tactic address?
- Which outcome statements are competitors NOT addressing? → These are gaps.

**Language audit:**
- Does the competitor use language from the ICP "Use" list? → They've found the same signal. Match or differentiate.
- Do they use language from the "Avoid" list? → Opportunity: our copy can stand out by using real job language.

**Obstacle framing:**
- Do competitors lead with the obstacle (pain-first) or the product (feature-first)?
- Pain-first competitors are strong; feature-first competitors are beatable on copy.

**Channel alignment:**
- Are competitors strong on channels the client's ICP responds to (from icp.md §5)?
- Are they weak or absent on channels the ICP uses? → Channel opportunity.

**Disqualifier check:**
- Are competitors explicitly targeting segments that your client's ICP §6 marks as disqualifiers?
- If yes: note — they're diluting their signal. Your client can be more targeted and win on relevance.

---

## Step 4 — Output: Competitor Intelligence Report

```
══════════════════════════════════════════════════════════
COMPETITOR INTELLIGENCE REPORT
Client: [name] | Date: [ISO date] | Focus: [channels]
══════════════════════════════════════════════════════════

COMPETITORS ANALYSED:
[name] — [domain] — [brief what they do]

─────────────────────────────────────────────
ADS INTELLIGENCE
─────────────────────────────────────────────
[Competitor A]:
• Running ads: Yes/No | Platforms: [list]
• Ad hook style: [pain-first / product-first / social proof / urgency]
• Sample headline (paraphrased): [...]
• CTA pattern: [...]
• JTBD coverage: Addresses J[n] — [outcome]. Misses J[n].

[Competitor B]: [same format]

GAP: [What job / outcome is NO competitor addressing in their ads?]

─────────────────────────────────────────────
SEO & CONTENT INTELLIGENCE
─────────────────────────────────────────────
[Competitor A]:
• Hero claim: [H1 paraphrased]
• Content focus: [top 3 topics]
• Estimated SEO footprint: [# indexed pages]
• Customer language from reviews: "[exact quote]"
• Review gap (what unhappy customers say): "[...]"

GAP: [What content angle / keyword / narrative is no competitor owning?]

─────────────────────────────────────────────
SOCIAL INTELLIGENCE
─────────────────────────────────────────────
[Competitor A]:
• Active platforms: [list]
• Posting cadence: [approx. frequency]
• Content type: [educational / promotional / community]
• Engagement hook style: [question / stat / story]

GAP: [Which platform or content style is underserved?]

─────────────────────────────────────────────
POSITIONING ANALYSIS
─────────────────────────────────────────────
• Dominant narrative in the market: [what story everyone is telling]
• Language they all use: [common phrases]
• Language none of them use (from our ICP "Use" list): [gaps]
• Counter-position opportunity: [the angle our client can own]

─────────────────────────────────────────────
JTBD GAP SUMMARY
─────────────────────────────────────────────
Outcome statements competitors address well:
• J[n]: [outcome] — [who covers it and how]

Outcome statements NO competitor addresses:
• J[n]: [outcome] — THIS IS THE COPY OPPORTUNITY

─────────────────────────────────────────────
RECOMMENDATIONS
─────────────────────────────────────────────
IMMEDIATE (apply to next campaign):
1. [Specific subject line angle / hook derived from gap]
2. [Channel to add or double down on]
3. [Positioning claim to test]

MEDIUM-TERM (next 30 days):
1. [Content piece to create that fills SEO/narrative gap]
2. [Social content type to test]

WATCH LIST (monitor but don't act yet):
1. [Tactic a competitor is testing that might be worth tracking]
══════════════════════════════════════════════════════════
```

---

## Step 5 — Save competitors to DB

For each newly identified or updated competitor:

```sql
-- Upsert competitor record
INSERT INTO public.competitors (client_id, name, website, positioning_notes, last_analyzed_at)
VALUES ('<clientId>', '<name>', '<domain>', '<one-line positioning summary>', NOW())
ON CONFLICT (client_id, website) DO UPDATE
  SET positioning_notes = EXCLUDED.positioning_notes,
      last_analyzed_at = NOW();
```

---

## Step 6 — Update competitor-learnings.md

Append to `{clientFolder}/competitor-learnings.md`. Never delete existing content.

```markdown
## Run: <ISO date> — Client: <client name>

### Competitors analysed
- [name] ([domain])

### Market narrative (what everyone is saying)
- <the dominant story in this market>

### Language gaps (ICP "Use" words competitors avoid)
- <exact phrase from jtbd.md "Use" list that no competitor uses>

### JTBD gaps (outcomes no competitor addresses)
- J[n]: <outcome statement> — confirmed unaddressed across [n] competitors

### Strongest competitor tactic (analyse, don't copy)
- <tactic> [Competitor: X] — [Why it works: which JTBD check it passes]
- [Counter-position: how to address the same job differently]

### Weakest competitor tactic
- <tactic> [Competitor: X] — [Which JTBD check it fails and why]
- [Opportunity: the job it's failing to address]

### Channel opportunities
- <platform/channel> — [Competitors present: Y/N | Our ICP uses it: Y/N | Verdict]

### Standing rules (only add when confirmed across 2+ competitors)
- <rule> [Source: <competitor names>]

### Copy-improver feed
- <1–3 specific insights to carry into the next /copy-improver run>
  These are JTBD-anchored, not generic tips.
```

---

## Step 7 — Summary to user

```
✅ Competitor analysis complete — <client name>

Competitors researched: [list]
Channels covered: [ads / seo / social / content]

Top 3 findings:
• [Finding 1 — JTBD-anchored]
• [Finding 2 — channel gap]
• [Finding 3 — language opportunity]

Biggest gap: J[n] — "<outcome statement>" — no competitor addresses this.
Recommended next copy angle: [one sentence]

Intelligence saved to: {clientFolder}/competitor-learnings.md
DB updated: competitors table

Run /copy-improver after this to apply competitive insights to live campaigns.
```

---

## Failure modes

- **icp.md missing:** Hard stop. Run `/icp` first.
- **No competitors identified:** Ask user for 2–4 domain names. Do not proceed blind.
- **Ad library blocked / no data:** Note it. Continue with SEO and social. Never skip the whole run.
- **Competitor in a disqualifier segment:** Flag it. Still analyse — knowing what the disqualifier segment is doing helps avoid it.
- **New competitor found mid-research:** Add to the run. Do not truncate the report.
- **Tactic that contradicts a copy-learnings standing rule:** Flag the conflict explicitly. Ask user which takes precedence before appending a new standing rule.
- **Private competitor (no public data):** Use review sites, LinkedIn, and press coverage as proxies. State confidence level clearly.
