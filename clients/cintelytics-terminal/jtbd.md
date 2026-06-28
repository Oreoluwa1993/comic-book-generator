# Jobs to Be Done — Cintelytics / Terminal

> Grounded in: icp.md (Jun 2026 CRM sprint, ~50 orgs, ~130 email events) + Terminal_Deck_v7.pdf (Jun 2026 investor deck)
> Claims tagged: `(CRM)` = confirmed from CRM data · `(deck)` = from investor deck · `(assumption)` = unverified
> Last updated: 2026-06-27

---

## What Terminal actually does (reference — do not use verbatim as copy)

Six integrated modules, all live:

| Module | Core capability |
|---|---|
| **Media Intelligence Engine** | Real-time ingest, 27+ sources, 800+ articles/hr, AI clustering, narrative velocity scoring, blind-spot detection, political-leaning framing analysis, sentiment per entity |
| **Quote Verifier** | AI classifier cross-references every published quote against official source records; surfaces misrepresentation, reframing, or paraphrase |
| **Source vs Story Gap** | Maps the gap between what institutions officially do and what media actually covers; identifies systematically under-reported areas by municipality |
| **Power & Coalition Analysis** | Riksdag-specific: bill survival funnel, coalition voting matrix, committee power map, rebel-MP detector, contested-vote list |
| **AI Audit & Disinformation Shield** | Monitors commercial and open-weight LLMs for narrative injection, bias, and provenance divergence vs Terminal's verified Swedish media baseline; maps the LLM information supply chain in real-time |
| **Factory** | AI content generation engine: detects 5 content opportunity archetypes from Terminal signals, routes through 4-stage human-in-the-loop pipeline (opportunity → script → storyboard → publish-ready audio/video/PR kit) |

---

## Buyer personas and their distinct jobs

Terminal has five buyer segments with materially different jobs. Copy MUST be segmented by persona — a subject line written for an editorial director will fail with a PA firm. Never blend personas in a single email.

---

### Persona A — Editorial Director / Media Analyst (Swedish independent/specialist media)

**Core job statement:**
> **When** a story I care about is developing and I don't yet know how different outlets are framing it,
> **I want to** see which narrative frame is gaining ground across editorial-leaning categories — and whether my outlet's framing is consensus or outlier —
> **so I can** publish with confidence, correct before going to air, or break from the pack before anyone else does.

**Functional job:** Track narrative velocity and framing divergence in real time, before the story settles into the consensus version. Detect the pre-wave — stories accelerating through alternative media before crossing into mainstream.

**Emotional job:** Be the one who saw it first. Not reactive. The editor whose brief is ready before anyone asks. `(CRM: Rolf van den Brink replied same-day multiple times; Brit Stakston rescheduled proactively — both are "first, not fast followers" identities)`

**Social job:** The editorial director who doesn't miss things. In Swedish media, catching narrative divergence early is how you justify your budget and your title. `(CRM: assumption, inferred from seniority of engaged contacts)`

**Secondary job (Quote Verifier):** When a politician's statement lands differently in three outlets, verify what was actually said vs what's being attributed — before publishing. `(deck: "A measurable share of attributed statements in media misrepresent the original record")`

**Trigger:** A major political event is approaching and their current monitoring tools feel inadequate. `(CRM: Almedalen week was single biggest activation — 3 of 4 demo bookings were Almedalen-framed)`

**Why now (2026):** Swedish election cycle is live. Media trust at historic low (Edelman 2025) — audiences and institutions need verifiable, data-driven accounts of what's actually being reported. `(deck)`

---

### Persona B — Political Party Comms / Strategy Team

**Core job statement:**
> **When** I need to understand how our party's position is being framed across media before a critical vote or announcement,
> **I want to** see framing divergence by editorial-leaning category, power and coalition dynamics in the Riksdag, and which issues are gaining ground in coverage vs parliamentary activity —
> **so I can** brief leadership, anticipate opposition moves, and respond before the narrative is set.

**Functional job:** Monitor the party's narrative across partisan outlets AND track where coalition allies are drifting — parliament activity and media coverage on a single timeline.

**Emotional job:** The strategist who briefs the leader before the leader asks. `(assumption)`

**Social job:** The comms director who caught the rebel-MP defection before it leaked to media. `(assumption — grounded in Power & Coalition capability)`

**Key unique capability:** Power & Coalition Analysis (Riksdag) — bill survival funnel, rebel-MP detector, coalition voting matrix. No other platform has this. `(deck: "The only platform doing this")`

**Trigger:** A contested vote, coalition negotiation, budget week, or election cycle. The 2026 Swedish election is the macro-trigger — Swedish parties spent 400M SEK in 2022, up to 5% on media intelligence. `(deck)`

**Disqualifier caution:** Individual politicians (not party comms) have high gatekeeping and wrong budget authority. `(CRM: 6/6 "Drafted - awaiting approval" — zero conversions)` Target the comms director or strategy lead, not the MP directly.

---

### Persona C — PA Firm / Corporate Comms (Swedish political or institutional clients)

**Core job statement:**
> **When** an issue affecting my client is developing in media and parliament simultaneously,
> **I want to** see the gap between what institutions are doing and what media is reporting — and which narrative frame is winning —
> **so I can** advise my client before the story lands and respond faster than the opposition.

**Functional job:** Track issue narratives across media and institutional activity in parallel; identify story gaps the client can exploit or needs to defend against.

**Emotional job:** The PA adviser who has the brief ready before the client calls. `(CRM: "respond to your client's question before they finish asking it" — hook that generated exchanges)`

**Key capabilities:** Blind Spot Detector, Source vs Story Gap, Cross-domain Analysis (parliament + media + incident data).

**Trigger:** A regulatory change, policy announcement, competitor's media play, or client crisis. `(assumption — consistent with PA buying patterns)`

---

### Persona D — Research Institute / News Agency / Academic

**Core job statement:**
> **When** I'm studying media coverage patterns, political reporting bias, or the gap between official records and public narrative,
> **I want to** systematically measure what's being covered, what's being ignored, and how quotes are being transformed in coverage —
> **so I can** produce credible, data-driven research that can't be dismissed as anecdotal.

**Functional job:** Quantify the information gap. Source vs Story Gap, Quote Verifier, Geographic Reality Gap — systematic evidence at scale.

**Trigger:** A research grant deadline, a media trust study, or a major election cycle.

**Pricing context:** Essential tier (€10–15K/yr) is accessible for research institutes. `(deck)`

---

### Persona E — Government / Enterprise Security (AI Audit module — B2G market)

**Core job statement:**
> **When** AI-generated summaries and conversational search are shaping public understanding of events involving our institution,
> **I want to** know when LLM outputs diverge from the verified factual record — and detect coordinated narrative injection before it becomes the mainstream AI answer —
> **so I can** defend our institution's factual record and respond before the AI narrative is set.

**Functional job:** Audit commercial and open-weight LLM outputs for bias, provenance divergence, and coordinated narrative injection vs. Terminal's verified Swedish media baseline.

**Why now:** Conversational AI is replacing search engines as the primary news source. The public narrative is no longer shaped by newsrooms alone — it's synthesised by algorithm runtimes susceptible to narrative injection. `(deck)`

**Trigger:** A major policy decision, election, or crisis where the institution's official record is likely to be misrepresented in AI summaries. The 2026 Swedish election cycle is the wedge trigger. `(deck)`

**Buyer:** Government research offices, investigative watchdogs, enterprise security teams. `(deck: "New Market Unlock: B2G + Corporate Security")`

**Note for copy:** This is a separate sales motion from Personas A–D. Do not blend with editorial or PA copy. B2G procurement cycles differ entirely.

---

## Outcome statements (write copy that names at least one per persona)

### Persona A (Media / Editorial):
1. "Know which frame is winning before it becomes the consensus" `(CRM: tracker hook)`
2. "Catch narrative shifts before they reach mainstream coverage" `(CRM)`
3. "Detect the pre-wave — the story accelerating through alternative media before it crosses to mainstream" `(deck: Narrative Velocity & Pre-wave)`
4. "Verify the quote before you publish — not after" `(deck: Quote Verifier)`
5. "Brief your team in minutes, not a morning of monitoring" `(CRM: tracker hook)`
6. "See where your framing diverges from left, center, and right — before you go to print"

### Persona B (Political Party Comms):
1. "Know which coalition MPs are drifting before they go public" `(deck: rebel-MP detector)`
2. "Brief leadership before the question is asked" `(assumption)`
3. "Own the story gap your opponent hasn't spotted yet" `(CRM: tracker hook)`
4. "See parliament activity and media coverage on a single timeline" `(deck: cross-domain)`
5. "Know which issues media is amplifying vs what's actually moving in committee"

### Persona C (PA / Corporate Comms):
1. "Respond to your client's question before they finish asking it" `(CRM: hook that generated exchanges)`
2. "See the gap between what your client's sector is doing and what media is covering" `(deck: Source vs Story Gap)`
3. "Track sentiment per entity — not just topic-level monitoring" `(deck)`
4. "Identify the story nobody's covering — before your competitor's client does" `(assumption)`

### Persona D (Research / News Agency):
1. "Measure the information gap — not anecdotally, but at scale" `(deck: structural framing)`
2. "Cross-reference every attributed quote against the official record" `(deck: Quote Verifier)`
3. "Map which municipalities are systematically under-reported" `(deck: Geographic Reality Gap)`
4. "Compare parliament activity, media coverage, and incident data in a single view" `(deck: cross-domain)`

### Persona E (B2G / AI Audit):
1. "Know when an LLM is misrepresenting your institution's record before it becomes the default answer" `(deck)`
2. "Detect coordinated narrative injection before it becomes mainstream AI output" `(deck: Narrative Injection module)`
3. "Audit the entire LLM information supply chain for your named entities — in real time" `(deck: AI Supply Chain Capture)`

---

## The obstacles (sentence 1 of every email — name the consequence, not the tool)

**Persona A (Media):**
- Reading the news the same morning everyone else does → no lead time, no differentiation
- Manual monitoring returns volume, not signal → can't tell what's gaining ground `(CRM: "narrative early-warning layer" was the hook language that landed)`
- No way to verify what a politician actually said vs what's being attributed → publish risk
- Framing divergence across partisan outlets is invisible until the story has set `(deck)`

**Persona B (Political Comms):**
- Coalition dynamics are opaque until they leak to media — too late to respond
- Parliament data and media coverage exist in separate silos — no cross-domain view
- Comms teams spend the morning monitoring instead of briefing leadership

**Persona C (PA / Corporate):**
- Issues move in parliament before media picks them up — clients are always behind
- Sentiment monitoring is topic-level, not entity-level — too coarse for institutional clients

**Persona E (B2G / AI Audit):**
- No tool cross-references LLM outputs against official records at scale `(deck: "distortions go entirely unchallenged")`
- Narrative injection in AI outputs is invisible until it is the default answer

---

## Disqualifiers

| Disqualifier | Why | Signal |
|---|---|---|
| Individual politicians (not party comms) | High gatekeeping, wrong budget authority | `(CRM: 6/6 "Drafted - awaiting approval" — zero conversions)` |
| One-event institutions (e.g. Gotland municipality) | No recurring monitoring mandate | `(CRM: 2/2 "Responded - closed" post-Almedalen)` |
| Contacts framing interest as "only for Almedalen" | No standing monitoring need | Gotland pattern |
| Generic PR firms (no political/PA/institutional clients) | Terminal's value is institutional narrative, not brand comms | `(assumption — verify)` |
| US-only legislative orgs | Terminal is Swedish/Nordic-first in Phase 1 | `(deck: Phase 1 = National Market Leadership)` |

---

## Language rules

### Use — confirmed language that landed or maps directly to product:
- "narratives gaining or losing traction" `(CRM: tracker hook)`
- "narrative early-warning layer" `(CRM: hook language that landed)`
- "frames" / "framing divergence" / "framing analysis" `(CRM + deck)`
- "story gaps" `(CRM: tracker hook)`
- "issue ownership" `(CRM: tracker hook)`
- "pre-wave" — detecting stories before they cross from alternative to mainstream `(deck: Narrative Velocity & Pre-wave)`
- "narrative velocity" — how fast a story is accelerating `(deck)`
- "blind spot" — what institutions do that media doesn't cover `(deck: Blind Spot Detector)`
- "quote verification" — cross-referencing attributed statements against source records `(deck)`
- "source vs story gap" — the measurable distance between institutional record and media output `(deck)`
- "information gap" — structural, not a media failure `(deck: "structural information problem with no current solution")`
- "cross-domain" — parliament activity + media coverage + incident data simultaneously `(deck)`
- Swedish subject lines or opening phrases for Swedish media and political targets `(CRM: 2 confirmed fast responders)`

### Avoid:
- "AI-powered" in subject lines — Signal AI owns this lane; mechanism framing, not outcome `(competitor rule)`
- "platform" as standalone noun — table stakes
- Generic monitoring language any Meltwater competitor could claim
- "comprehensive coverage" or "all sources" — Meltwater and Retriever own this `(competitor rule)`
- "stay informed" or "monitor everything" — saturated market claim, implies reactive not predictive
- "Narrative ROI" — Terminal's investor framing, not customer language
- Passive urgency ("whenever you're ready", "let me know if interested")

---

## Channel rules

| Channel | Works? | Notes |
|---|---|---|
| Direct cold email | Yes | Personalised subject + event hook; 2–5 days `(CRM: confirmed)` |
| Warm intro | Yes, best | Same-day conversion; priority channel `(CRM: confirmed)` |
| LinkedIn | No data | Test with PA firms who didn't reply to email |
| Ads / content | No data | Assumption: relationship-led market at this stage |

---

## JTBD copy checklist (J1–J8)

Every variant produced by copy-improver MUST pass all checks before it can be presented.

- [ ] **J1 — Job in subject:** Subject line names the trigger, outcome, or obstacle for the specific persona. NOT the product name. NOT "AI-powered".
- [ ] **J2 — Pain first:** Sentence 1 names their current reality (the obstacle's *consequence*, not the tool). Product not mentioned until sentence 3 at the earliest.
- [ ] **J3 — Outcome named:** At least one outcome statement from the relevant persona section appears — verbatim or close paraphrase.
- [ ] **J4 — Disqualifier clean:** Copy is not addressed to individual politicians, one-event institutions, or generic PR contacts.
- [ ] **J5 — Language match:** At least one phrase from the "Use" language list appears naturally in the body.
- [ ] **J6 — Event hook (if applicable):** If a time-bound event is within 6 weeks, copy names it and the deadline. In 2026: Swedish election cycle is live — use it. Evergreen framing only when no event is imminent.
- [ ] **J7 — CTA is low-friction:** CTA offers concrete evidence of the outcome — a demo showing real Terminal data: a narrative velocity chart on a live story, a quote verification example, a blind-spot report. NOT "learn more" or "let's chat."
- [ ] **J8 — Persona locked:** Confirm copy is written for a single persona. No blending. Persona B (political) copy must address comms director or strategy team — never the MP directly.

---

## Standing JTBD rules (update as data confirms or contradicts)

1. Event-framed subject lines outperform evergreen by ~3x on demo conversion speed `(CRM: confirmed)`
2. Warm intro > cold email for conversion speed (same-day vs 2–5 days) `(CRM: confirmed)`
3. Individual politician direct email = zero conversion `(CRM: confirmed, n=6)`
4. Swedish-language subject line or opener for Swedish media and political contacts `(CRM: 2 confirmed fast responders)`
5. Pain sentence must precede product mention `(CRM: assumption — inferred from which hooks generated exchanges)`
6. Demo CTA must show real Terminal data — not a generic product tour `(CRM: "fullt fungerande" — Rolf van den Brink; implies he tested it and it worked)`
7. Persona segmentation is required — Persona A (media) copy will fail with Persona B (political) and vice versa `(assumption — confirmed by distinct job structures)`
8. "Pre-wave" is the highest-value copy hook for Persona A — unique, verifiable, no competitor claims it `(deck: Narrative Velocity & Pre-wave)`
9. For Persona E (AI audit/B2G) — copy must reference the 2026 Swedish election cycle as the wedge trigger `(deck)`
10. Quote Verifier is the strongest hook for news agencies and investigative media — unique capability that addresses a credibility job no competitor touches `(deck: only platform doing this)`
