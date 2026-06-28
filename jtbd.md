# Jobs to Be Done — Outreach Engine (Master)

> This is the MASTER JTBD for the Outreach Engine as a product.
> It describes the jobs of people who USE the outreach engine — 
> not the jobs of any specific client's customers.
>
> Per-client JTBD documents live at: clients/{client-slug}/jtbd.md
> Do NOT modify this file for any specific client. Client work belongs in their folder.

---

## Who the outreach engine is for

People who run B2B cold outreach — and want their copy grounded in what
their prospects are actually trying to accomplish.

**Primary users:**
- Founders and CEOs running early-stage outreach themselves
- Sales leads and BDRs at small/mid B2B companies
- Growth marketers responsible for cold email campaigns
- Outreach agencies and consultants managing multiple client campaigns

---

## Core job statement

> **When** I need to send cold outreach to a new segment and I don't know
> what will actually resonate with them,
> **I want to** write copy that speaks to what my prospects are trying to
> accomplish — not what my product does —
> **so I can** get replies, book demos, and move deals forward instead of
> being ignored.

---

## Job layers

**Functional job:** Write outreach copy grounded in the customer's actual job-to-be-done, improve it based on reply data, and stay ahead of competitors by owning the language and angles they're not using.

**Emotional job:** Feel confident sending. Not guessing. Know that the copy is grounded in research — not intuition or a template borrowed from someone else's market.

**Social job:** Be the person who runs the campaign that actually works — not the one who sends 1000 emails and gets 2 replies.

---

## Outcome statements

1. "Cold email copy that passes the JTBD checklist before it goes out — not after"
2. "Know which subject line angles are working before spending more sends on them"
3. "Find the language gaps competitors aren't using — and own them before they do"
4. "Improve copy on every run as reply data accumulates — no starting from scratch"
5. "Onboard a new client and have a JTBD-grounded campaign ready in one session"

---

## The obstacles (what blocks people today)

- Writing copy based on product features, not customer jobs → low reply rates
- Using generic templates that sound like every other cold email → ignored
- No system for learning from what worked — every campaign starts from scratch
- Competitor research is manual and one-off — no persistent intelligence layer
- ICP and JTBD exist in separate tools with no live connection to copy output

---

## The unlock (what the outreach engine does)

- Forces a JTBD pre-flight read before any copy is written or edited — hard rule
- Enforces J1–J8 checklist on every copy variant before it can be presented
- Accumulates per-client learnings in `copy-learnings.md` — compounds over runs
- Runs competitor analysis through the JTBD lens — finds copy gaps, not feature gaps
- Stores per-client context in typed folders — works for one client or fifty

---

## Multi-client architecture

Each client the engine serves gets a dedicated folder with a strict file schema:

```
clients/
  {client-slug}/
    icp.md                   ← who to reach + who not to reach
    jtbd.md                  ← jobs, pains, outcomes (client-specific, never shared)
    brand-voice.md           ← tone, vocabulary, forbidden phrases
    competitor-learnings.md  ← running competitor intelligence log
    copy-learnings.md        ← running copy signal log
    campaigns/               ← per-campaign copy drafts
clients/_index.md            ← clientId/slug routing registry
```

**Cardinal rule:** Never use per-client content from one client folder in another client's copy.
Cross-contamination produces generic output that serves no one. The research agents confirmed
this is the #1 failure mode in multi-client JTBD practice (thrv, AlignICP, Copyhackers).

**Scale note:** Folder-per-client works to ~75 clients. At 40–60 clients, add a thin
`registry.json` with structured ICP fields for cross-client filtering. Above ~75 clients,
migrate to a DB-backed config with optional vector retrieval for long context docs.

---

## Skills

| Skill | What it does | When to run |
|---|---|---|
| `/competitor-analysis {slug}` | Researches competitors through the JTBD lens; appends findings to `clients/{slug}/competitor-learnings.md` | Before first campaign; quarterly refresh |
| `/copy-improver {slug}` | Improves copy based on reply signals; appends learnings to `clients/{slug}/copy-learnings.md` | After each campaign send |

---

## Adding a new client

1. Create `clients/{new-slug}/` with the required file schema above
2. Run `/icp {new-slug}` to generate `icp.md` and `jtbd.md` from research input
3. Add the client to `clients/_index.md` with their Supabase `clientId`
4. Run `/competitor-analysis {new-slug}` to build `competitor-learnings.md`
5. Write first campaign copy using `/copy-improver {new-slug}`
