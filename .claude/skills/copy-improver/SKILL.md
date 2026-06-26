---
name: copy-improver
description: >
  Reads outreach copy (email campaigns, social posts) and improves it based on
  reply and engagement signals from previous sends. Self-improving — each run
  appends new learnings to .claude/copy-learnings.md which is read on the next
  run so insights compound over time. Use when the user wants to sharpen copy,
  understand what's resonating, or get AI rewrites grounded in real response data.
---

# Copy Improver Skill

This skill analyses past outreach performance, extracts what's working, rewrites
copy to be sharper, and records every insight so future runs get smarter.

## Args

Invoked as `/copy-improver [clientId] [--type email|social|all] [--campaign <id>]`

- `clientId` — UUID of the client whose copy to improve. If omitted, ask the user.
- `--type` — Which copy to improve: `email` (campaigns), `social` (posts), or `all`. Default: `email`.
- `--campaign <id>` — Improve a specific campaign. If omitted, targets the most-recent active/draft campaigns.

---

## Step 0 — Parse args and confirm scope

Read the args. If `clientId` is missing, list available clients by reading
`app/outreach/actions.ts` and note that `listClients()` can be called, then ask
the user which client.

Confirm the scope in one sentence before proceeding.

---

## Step 1 — Load accumulated learnings

Check whether `.claude/copy-learnings.md` exists.

- If it exists, read it in full. These are your standing instructions from
  previous runs — treat every bullet point as a hard constraint that must be
  reflected in all rewrites.
- If it doesn't exist yet, note "No prior learnings — this is run #1."

---

## Step 2 — Pull performance data from the database

Use the Supabase CLI to query the database. Find the project's Supabase config
to determine the DB connection string:

```bash
cat supabase/config.toml 2>/dev/null | grep -E "project_id|db_url" | head -5
```

Then run the following queries. Use `supabase db query --local` if running
locally, or use the `SUPABASE_DB_URL` env var if set.

### 2a — Email campaign performance for this client

```sql
SELECT
  c.id,
  c.name,
  c.subject,
  c.body,
  c.channel,
  c.sent_count,
  c.open_count,
  c.click_count,
  c.status,
  c.created_at,
  COUNT(m.id) FILTER (WHERE m.status = 'replied') AS reply_count,
  COUNT(m.id) FILTER (WHERE m.status = 'bounced') AS bounce_count
FROM campaigns c
LEFT JOIN outreach_messages m ON m.campaign_id = c.id
WHERE c.client_id = '<clientId>'
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 10;
```

### 2b — Lead stage progression (proxy for email effectiveness)

```sql
SELECT
  l.name,
  l.company,
  l.stage,
  l.updated_at,
  m.campaign_id,
  m.status AS message_status,
  m.subject
FROM leads l
LEFT JOIN outreach_messages m ON m.lead_id = l.id
WHERE l.client_id = '<clientId>'
  AND l.stage IN ('interested', 'qualified', 'proposal', 'won')
ORDER BY l.updated_at DESC
LIMIT 30;
```

### 2c — Social post engagement (published posts as signal)

```sql
SELECT
  platform,
  content,
  hashtags,
  status,
  created_at
FROM social_posts
WHERE client_id = '<clientId>'
  AND status = 'published'
ORDER BY created_at DESC
LIMIT 20;
```

If `supabase` CLI is unavailable or the queries fail, note the error and skip
to Step 3 using only the learnings from `.claude/copy-learnings.md`. Do not
block on DB access — the learnings file alone is enough to improve copy.

---

## Step 3 — Fetch the copy to improve

### For email type:

If `--campaign <id>` was given, fetch that campaign's subject and body.
Otherwise fetch the 3 most recent campaigns from Step 2a.

Build a "copy inventory" table:

```
| Campaign | Subject | Body (truncated) | Sent | Opens | Replies | Stage wins |
```

### For social type:

Collect the 5 most recent draft/published posts per platform.

### For all:

Do both above.

---

## Step 4 — Analyze signals and extract patterns

Now synthesize what the data says. Think through:

**What's working (positive signals):**
- Which subject lines generated replies? What do they have in common?
  (question vs. statement, short vs. long, personalisation tokens used, urgency)
- Which body paragraphs appear in campaigns where leads moved forward?
- Which CTAs appear to correlate with replies vs. silence?
- Which social posts were published (i.e. the user committed to them)?
  Note tone, length, hashtag patterns.

**What's not working (negative signals):**
- Campaigns with 0 replies despite sends — what do they have in common?
- Leads still stuck in 'contacted' stage — what copy reached them?
- Posts that stayed as drafts (never published) — what pattern?

**ICP alignment:**
If the client has `icp_content` stored, compare the copy against the ICP.
Check: does the copy speak to the triggers, language, and channels the ICP
says to use? Note any mismatches.

Summarise findings in a short "Signal Report" (5–10 bullets).

---

## Step 5 — Rewrite the copy

For each piece of copy being improved, produce **two variants**:

### Variant A — Incremental (safe)
Keep the structure. Tighten sentences. Replace weak verbs. Apply top 3 insights
from the Signal Report. Subject line: 3–7 words, one concrete hook.

### Variant B — Bold reframe
Restructure based on the single strongest ICP trigger. Open with the pain/trigger,
not the product. End with a frictionless CTA. Can change subject line completely.

**Format each variant as:**

```
--- CAMPAIGN: <name> ---

VARIANT A (incremental)
Subject: <subject>
Body:
<body text>

VARIANT B (bold reframe)
Subject: <subject>
Body:
<body text>

Why these changes:
- <bullet explaining each key decision>
```

For social posts, produce two variants per platform similarly, respecting
character limits (twitter: 280, linkedin: 3000, instagram: 2200).

---

## Step 6 — Ask the user which variant to apply

Present the variants. Ask:

> Which variant should I apply? Reply "A", "B", "skip", or paste your own edit.
> You can also reply "both" to save both as separate campaigns.

Wait for the user's response before proceeding to Step 7.

---

## Step 7 — Apply the chosen copy

### For email campaigns:
Call the `updateCampaign` server action or use the Supabase CLI:

```sql
UPDATE campaigns
SET subject = '<new_subject>',
    body = '<new_body>',
    updated_at = NOW()
WHERE id = '<campaign_id>';
```

### For social posts:
Update the chosen post, or insert a new draft:

```sql
UPDATE social_posts SET content = '<new_content>', updated_at = NOW()
WHERE id = '<post_id>';
-- or insert new draft
INSERT INTO social_posts (client_id, user_id, platform, content, hashtags, status)
VALUES ('<clientId>', '<userId>', '<platform>', '<content>', ARRAY[<hashtags>], 'draft');
```

Confirm what was saved.

---

## Step 8 — Update the learnings file

Append to `.claude/copy-learnings.md`. Never delete existing content — only
add. Structure:

```markdown
## Run: <ISO date> — Client: <client name>

### What worked
- <finding grounded in data>

### What didn't work
- <finding grounded in data>

### ICP gaps found
- <any mismatch between copy and ICP>

### Applied changes
- Campaign "<name>": <brief description of what changed and why>

### Standing rules (update if contradicted by new data)
- <rule that should persist into future runs>
```

The "Standing rules" section is critical. It carries forward the most reliable
patterns — e.g. "Subject lines under 6 words get 3x more replies for this
client." Only add a rule when you've seen it hold across at least 2 data points.

---

## Step 9 — Summary to user

Output a clean summary:

```
✅ Copy improved for <client name>

Signal report:
• <top 3 findings from Step 4>

Applied:
• <what was changed>

Learnings file updated: .claude/copy-learnings.md
Run count: <N> (skills improve as more campaigns accumulate data)

Next suggested run: after your next campaign sends — new replies will sharpen
the rules further.
```

---

## Failure modes

- **No campaigns yet**: Skip DB analysis, improve copy using ICP content and
  learnings file alone. Note "0 campaigns with reply data — analysis will
  strengthen on next run."
- **No Supabase CLI**: Work from the learnings file + any copy the user pastes
  directly into the conversation.
- **User pastes copy manually**: Accept it. Treat it as the copy to improve.
  Ask for context (what the goal is, who the recipient is) and improve using
  learnings + ICP.
- **Conflicting signals**: When data conflicts with prior learnings, flag it
  explicitly and update the standing rule rather than silently overriding it.
