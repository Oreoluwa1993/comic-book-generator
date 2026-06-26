---
name: copy-improver
description: >
  Reads outreach copy (email campaigns, social posts) and improves it based on
  reply and engagement signals from previous sends. Self-improving — each run
  appends new learnings to .claude/copy-learnings.md which is read on the next
  run so insights compound over time. MANDATORY: reads icp.md and jtbd.md before
  writing or editing any copy. All variants must pass the JTBD checklist.
---

# Copy Improver Skill

Improves outreach copy by grounding every rewrite in the documented Jobs to Be
Done and Ideal Customer Profile, then reinforcing with live reply-signal data.
The skill never writes a single word of copy without first reading `icp.md` and
`jtbd.md`. That is a hard rule, not a suggestion.

## Args

Invoked as `/copy-improver [clientId] [--type email|social|all] [--campaign <id>]`

- `clientId` — UUID of the client whose copy to improve. If omitted, ask the user.
- `--type` — `email` (campaigns), `social` (posts), or `all`. Default: `email`.
- `--campaign <id>` — Target a specific campaign. Otherwise targets the 3 most recent active/draft campaigns.

---

## PRE-FLIGHT — MANDATORY (complete before any other step)

**Do not proceed to Step 1 until all three files are loaded.
Do not write, edit, suggest, or improve any copy until the pre-flight is complete.**

### PF-1 — Read icp.md

```
Read: icp.md
```

Extract and hold in working memory:
- **Primary segments** (who we sell to and who we don't)
- **JTBD trigger** (the event or pain that starts the buying process)
- **How they talk** (exact phrases from inbound responses)
- **Channels that worked** (email, warm intro, LinkedIn — and which didn't)
- **Disqualifiers** (individual politicians, one-event institutions, generic PR)
- **Optimal outreach window** (event-proximity timing rule)

If `icp.md` is missing: STOP. Tell the user:
> ⛔ icp.md not found. Run `/icp` first to generate the ICP for this client,
> or create icp.md manually. The copy-improver cannot run without it.

### PF-2 — Read jtbd.md

```
Read: jtbd.md
```

Extract and hold in working memory:
- **Core job statement** (the full "when / I want to / so I can" statement)
- **Functional, emotional, social job layers**
- **Outcome statements** (the 5 numbered outcomes — copy must name at least one)
- **Obstacle** (what blocks them today — must appear before the product)
- **Language rules** (Use / Avoid word lists)
- **JTBD copy checklist** (J1–J7 — every variant must pass all 7)
- **Channel rules** (which channels to use per segment)
- **Disqualifier table** (reinforces icp.md disqualifiers)

If `jtbd.md` is missing: STOP. Tell the user:
> ⛔ jtbd.md not found. Creating it now from icp.md...
> Then create jtbd.md by following the JTBD document structure in icp.md
> Section 3 ("What they're trying to do") and sections 4–6. After creating it,
> continue with PF-2.

### PF-3 — Load accumulated learnings

```
Read: .claude/copy-learnings.md
```

- If it exists: load all standing rules. These are hard constraints — every
  variant must comply. If a standing rule contradicts something in icp.md or
  jtbd.md, flag the conflict to the user before proceeding.
- If it doesn't exist: note "Run #1 — no prior learnings."

### PF-4 — Confirm scope

State in two sentences:
1. The ICP segment(s) this copy targets (named from icp.md).
2. The primary JTBD trigger the copy will speak to.

Do not proceed until the user confirms or corrects.

---

## Step 1 — Parse args and confirm

Read the args. If `clientId` is missing, ask the user.
Confirm: client name, copy type (email/social/all), specific campaign if given.

---

## Step 2 — Pull performance data from the database

Use the Supabase CLI to query the database:

```bash
cat supabase/config.toml 2>/dev/null | grep -E "project_id|db_url" | head -5
```

Use `supabase db query --local` or `SUPABASE_DB_URL` env var if set.

### 2a — Email campaign performance

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

### 2c — Social post engagement

```sql
SELECT platform, content, hashtags, status, created_at
FROM social_posts
WHERE client_id = '<clientId>' AND status = 'published'
ORDER BY created_at DESC
LIMIT 20;
```

If the Supabase CLI is unavailable: note the error, continue using
Pre-Flight data alone. Do not block.

---

## Step 3 — Fetch the copy to improve

### For email:

If `--campaign <id>` was given, fetch that campaign's subject and body.
Otherwise use the 3 most recent campaigns from Step 2a.

Build a copy inventory table:

```
| Campaign | Subject | Body (first 80 chars) | Sent | Opens | Replies | Stage wins |
```

### For social:

Collect the 5 most recent draft/published posts per platform.

### For all:

Do both.

---

## Step 4 — JTBD × signal analysis

This step cross-references the live reply data against the JTBD and ICP
frameworks loaded in Pre-Flight. Generic "what worked" analysis is not enough —
every finding must be anchored to a specific JTBD or ICP rule.

Work through these questions for each campaign:

**JTBD signal checks:**
- Did the subject line name the trigger, outcome, or obstacle? (J1)
  → Compare against campaigns that got replies vs. silence.
- Did the campaign that opened with the pain (not the product) get more replies? (J2)
  → Note which body structure correlates with stage movement.
- Did any outcome statement appear verbatim or close-paraphrase? (J3)
  → Which campaigns named "traction," "early-warning," "before coverage"?
- Did campaign bodies that included ICP language ("frames," "narrative shift,"
  "story gaps") outperform bodies that used generic language? (J5)

**ICP signal checks:**
- Did event-framed subjects (Almedalen, specific date) outperform evergreen? (ICP §5)
- Were there any disqualifier-pattern contacts in the sent list who didn't
  convert — individual politicians, one-event institutions? (ICP §6 / JTBD disqualifier table)
- Did any lead who was sent copy move forward from 'contacted' to 'interested+'?
  What copy reached them?

**Negative signals:**
- Campaigns with 0 replies: which JTBD checks did they fail? Name the failures.
- Leads stuck in 'contacted': what was the subject/body pattern? Which J-checks
  did the copy miss?

Output a **JTBD Signal Report** in this format:

```
JTBD Signal Report — <client name> — <date>

✅ JTBD checks confirmed working (with data):
- <finding + which campaign + which J-check it validates>

❌ JTBD checks failing (with data):
- <finding + which campaign + which J-check it violated>

🔍 ICP alignment gaps:
- <any place where copy ignored icp.md language rules, segment rules, or channel rules>

📊 Top converting pattern (if data exists):
- <the single strongest pattern in 1 sentence>
```

---

## Step 5 — Rewrite the copy

For each piece of copy, produce **two variants**.
Both variants must pass ALL 7 JTBD checklist items before being shown to the user.
If a variant fails any check, fix it. Do not present a failing variant.

### Variant A — Incremental (safe)

Keep the structural shape. Apply the JTBD fixes only:
- Rewrite subject to pass J1 (trigger/outcome/obstacle — not product name)
- Move product mention to sentence 3+ to pass J2 (pain first)
- Inject one outcome statement to pass J3
- Replace any word from the "Avoid" list with a word from the "Use" list (J5)
- Add event hook if one is imminent (J6)
- Sharpen CTA to name the proof point, not just the action (J7)

### Variant B — Full JTBD reframe

Rebuild from the job statement up:
- **Subject:** Names the trigger or outcome. Under 7 words.
  Optional: test a Swedish-language subject if the target is Swedish media (ICP §4).
- **Sentence 1:** Describes their current reality — the obstacle (the consequence
  of their current tools failing at the job). No brand mention.
- **Sentence 2–3:** Names the trigger (the event making this urgent now).
- **Sentence 4+:** Introduces Terminal/the product as the mechanism that
  enables the job — briefly, without feature-listing.
- **Proof point:** One specific, concrete example of the outcome (a narrative caught
  early, a frame shift surfaced before it hit mainstream). Not a general claim.
- **CTA:** Offer the demo or the specific proof — not "let me know if interested."
  Match the channel rule from ICP §5.

**Format:**

```
--- CAMPAIGN: <name> ---

JTBD SCORE (pre-rewrite):
J1 Subject names trigger/outcome/obstacle:  ✅/❌
J2 Pain before product:                     ✅/❌
J3 Outcome statement present:               ✅/❌
J4 Disqualifier clean:                      ✅/❌
J5 ICP language used:                       ✅/❌
J6 Event hook (if applicable):              ✅/❌
J7 Low-friction CTA:                        ✅/❌

VARIANT A (incremental)
Subject: <subject>
Body:
<body text>
JTBD checks: J1✅ J2✅ J3✅ J4✅ J5✅ J6✅ J7✅

VARIANT B (full JTBD reframe)
Subject: <subject>
Body:
<body text>
JTBD checks: J1✅ J2✅ J3✅ J4✅ J5✅ J6✅ J7✅

Why these changes:
- <bullet per JTBD check changed, naming the icp.md or jtbd.md rule applied>
```

For social posts, produce two variants per platform, respecting character limits
(twitter: 280, linkedin: 3000, instagram: 2200, facebook: 63206).
Social variants must still pass J1 (narrative trigger hook), J3 (outcome named),
J5 (ICP language), and J7 (CTA or engagement hook). J4 and J6 apply where relevant.

---

## Step 6 — Ask the user which variant to apply

Present the JTBD Signal Report first, then the variants.

Ask:

> Which variant should I apply? Reply "A", "B", "skip", or paste your own edit.
> You can also reply "both" to save both as separate campaigns.
> If you paste your own edit, I'll run the JTBD checklist on it before saving.

Wait for the user's response.

If the user pastes their own edit: run the J1–J7 checklist on it.
If it fails any check, show the failures and ask: "Fix these before saving, or save as-is?"

---

## Step 7 — Apply the chosen copy

### For email campaigns:

```sql
UPDATE campaigns
SET subject = '<new_subject>',
    body    = '<new_body>',
    updated_at = NOW()
WHERE id = '<campaign_id>';
```

### For social posts:

```sql
-- Update existing:
UPDATE social_posts SET content = '<new_content>', updated_at = NOW()
WHERE id = '<post_id>';

-- Or insert new draft:
INSERT INTO social_posts (client_id, user_id, platform, content, hashtags, status)
VALUES ('<clientId>', '<userId>', '<platform>', '<content>', ARRAY[<hashtags>], 'draft');
```

Confirm what was saved.

---

## Step 8 — Update the learnings file

Append to `.claude/copy-learnings.md`. Never delete or overwrite existing content.

```markdown
## Run: <ISO date> — Client: <client name>

### JTBD checks (pre-run baseline)
- Campaigns that passed all 7: <n>/<total>
- Most common failing check: <J1–J7 label>

### What worked (JTBD-anchored)
- <finding — must name which J-check it validates and which campaign>

### What didn't work (JTBD-anchored)
- <finding — must name which J-check failed and which campaign>

### ICP gaps found
- <any mismatch between copy and icp.md / jtbd.md rules>

### Applied changes
- Campaign "<name>": variant <A/B>, <brief JTBD-framed reason>

### Standing rules (only add when confirmed across 2+ data points)
- <rule> [Source: <campaign names that confirmed it>]

### JTBD rule updates
- <any JTBD standing rule that was confirmed, challenged, or refined this run>
```

The "Standing rules" section carries forward indefinitely.
Only add a rule when at least 2 campaigns confirm it.
If new data contradicts a standing rule, flag it explicitly and update.

---

## Step 9 — Summary to user

```
✅ Copy improved for <client name>

Pre-flight:  icp.md ✅  jtbd.md ✅  copy-learnings.md ✅

JTBD Signal Report:
• <top 3 findings from Step 4>

Variants produced:
• Campaign "<name>": Variant <X> applied
  JTBD checks passed: J1–J7 ✅

Learnings file updated: .claude/copy-learnings.md
Run count: <N>

Next run: after your next campaign sends — each round of reply data
sharpens the standing rules.
```

---

## Failure modes

- **icp.md missing:** STOP. Do not generate any copy. Tell the user to run
  `/icp` first or create the file manually. This is a hard block.

- **jtbd.md missing:** Create it from icp.md (Section 3 "What they're trying to do"
  + Sections 4–6) using the JTBD document structure, then continue.

- **No campaigns yet:** Skip DB analysis. Run the J1–J7 checklist on any copy
  the user pastes in. Improve using icp.md + jtbd.md alone.
  Note: "0 campaigns with reply data — JTBD check will strengthen on next run."

- **No Supabase CLI:** Work from learnings + icp.md + jtbd.md + any copy the
  user pastes directly. The JTBD pre-flight still runs.

- **User pastes copy manually:** Accept it. Run J1–J7 checklist before producing
  any rewrite. Ask for context (target segment from ICP, trigger event) if not obvious.

- **Conflicting signals:** When live data contradicts a standing rule or a JTBD
  principle, flag it explicitly. Do not silently override. Ask the user which
  takes precedence and update the learnings file accordingly.

- **Copy targets a disqualifier segment:** Flag it immediately.
  > ⚠️ This copy appears to target [individual politician / one-event institution /
  > generic PR firm] — a documented disqualifier in icp.md §6.
  > Recommend redirecting to [party comms team / media editorial / PA firm with
  > political clients]. Proceed anyway?
