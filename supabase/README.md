# Supabase schema

This folder contains SQL migrations for the app’s Supabase project.

## Apply migrations

Use the Supabase Dashboard SQL editor (or Supabase CLI if you have it configured) and apply migrations in timestamp order from:

- `supabase/migrations/`

## Character design feature

- Tables + RLS + storage bucket policies: `supabase/migrations/20260408_character_design.sql`

## Auth (magic link + Character Library)

1. In **Supabase Dashboard → Authentication → URL configuration**, set **Site URL** to your app origin (e.g. `http://localhost:3000` in dev).
2. Add the same origin under **Redirect URLs** (wildcard `http://localhost:3000/**` is fine for local dev).
3. In the app’s `.env.local`, set `NEXT_PUBLIC_SITE_URL` to that same origin so magic links return to the correct path after sign-in.

For all environment variables (OpenAI, image retries, stagger, etc.), see the project **[README.md](../README.md)** in the repo root.

