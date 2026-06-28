# Client Index

Routing registry for all clients in the outreach engine.
Used by `/copy-improver` and `/competitor-analysis` to resolve `clientSlug` from `clientId`.

To add a new client:
1. Create `clients/{new-slug}/` with: icp.md, jtbd.md, brand-voice.md, competitor-learnings.md, copy-learnings.md
2. Add a row to the table below
3. Run `/competitor-analysis {new-slug}` to populate competitor-learnings.md

---

| Slug | Client Name | Supabase clientId | ICP (one line) | Status |
|---|---|---|---|---|
| cintelytics-terminal | Cintelytics / Terminal | TBD — query `SELECT id FROM clients WHERE name ILIKE '%terminal%'` | Swedish media, PA firms, political party comms — narrative intelligence platform tracking which frames are gaining ground before mainstream coverage | Active |
| pax-axum | Pax Axum / The Wooden Bible | TBD — query `SELECT id FROM clients WHERE name ILIKE '%pax%'` | Epic fantasy series (8+ books), African/ancient civilization-inspired world-building — outreach targets literary agents, ARC readers, serialization readers, and future comics/animation publishers | Active |

---

## How skills resolve client context

When a skill is invoked with `/skill-name cintelytics-terminal`:
- `clientSlug` = `cintelytics-terminal`
- All file reads use `clients/cintelytics-terminal/{file}.md`

When a skill is invoked with `/skill-name {uuid}`:
- Look up the UUID in the `Supabase clientId` column above to find the slug
- Then use `clients/{slug}/{file}.md`

If neither slug nor UUID is recognised:
> ⛔ Client not found in `clients/_index.md`. Add the client first or check the slug spelling.
