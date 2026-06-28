-- Multi-client support for the outreach engine
-- Adds a clients table and client_id FK to all outreach tables

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  industry text,
  website text,
  icp_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);

alter table public.leads
  add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.campaigns
  add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.outreach_messages
  add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.social_posts
  add column if not exists client_id uuid references public.clients(id) on delete cascade;

create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists campaigns_client_id_idx on public.campaigns(client_id);
create index if not exists outreach_messages_client_id_idx on public.outreach_messages(client_id);
create index if not exists social_posts_client_id_idx on public.social_posts(client_id);

-- RLS for clients
alter table public.clients enable row level security;

create policy clients_select_own on public.clients for select using (auth.uid() = user_id);
create policy clients_insert_own on public.clients for insert with check (auth.uid() = user_id);
create policy clients_update_own on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clients_delete_own on public.clients for delete using (auth.uid() = user_id);
