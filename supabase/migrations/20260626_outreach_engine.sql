-- Outreach Engine schema
-- Tables: leads, campaigns, campaign_leads, outreach_messages, social_posts

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  company text,
  role text,
  source text not null default 'manual',
  stage text not null default 'prospect',
  notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_email_idx on public.leads(email);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  channel text not null default 'email',
  scheduled_at timestamptz,
  sent_count int not null default 0,
  open_count int not null default 0,
  click_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns(user_id);
create index if not exists campaigns_status_idx on public.campaigns(status);

create table if not exists public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

create index if not exists campaign_leads_campaign_id_idx on public.campaign_leads(campaign_id);
create index if not exists campaign_leads_lead_id_idx on public.campaign_leads(lead_id);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel text not null default 'email',
  subject text,
  body text not null,
  status text not null default 'draft',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists outreach_messages_user_id_idx on public.outreach_messages(user_id);
create index if not exists outreach_messages_lead_id_idx on public.outreach_messages(lead_id);
create index if not exists outreach_messages_campaign_id_idx on public.outreach_messages(campaign_id);
create index if not exists outreach_messages_status_idx on public.outreach_messages(status);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  content text not null,
  hashtags text[] default '{}',
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_user_id_idx on public.social_posts(user_id);
create index if not exists social_posts_platform_idx on public.social_posts(platform);
create index if not exists social_posts_status_idx on public.social_posts(status);

-- RLS
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.social_posts enable row level security;

create policy leads_select_own on public.leads for select using (auth.uid() = user_id);
create policy leads_insert_own on public.leads for insert with check (auth.uid() = user_id);
create policy leads_update_own on public.leads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy leads_delete_own on public.leads for delete using (auth.uid() = user_id);

create policy campaigns_select_own on public.campaigns for select using (auth.uid() = user_id);
create policy campaigns_insert_own on public.campaigns for insert with check (auth.uid() = user_id);
create policy campaigns_update_own on public.campaigns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy campaigns_delete_own on public.campaigns for delete using (auth.uid() = user_id);

create policy campaign_leads_select_own on public.campaign_leads for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy campaign_leads_insert_own on public.campaign_leads for insert
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy campaign_leads_delete_own on public.campaign_leads for delete
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

create policy outreach_messages_select_own on public.outreach_messages for select using (auth.uid() = user_id);
create policy outreach_messages_insert_own on public.outreach_messages for insert with check (auth.uid() = user_id);
create policy outreach_messages_update_own on public.outreach_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy outreach_messages_delete_own on public.outreach_messages for delete using (auth.uid() = user_id);

create policy social_posts_select_own on public.social_posts for select using (auth.uid() = user_id);
create policy social_posts_insert_own on public.social_posts for insert with check (auth.uid() = user_id);
create policy social_posts_update_own on public.social_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy social_posts_delete_own on public.social_posts for delete using (auth.uid() = user_id);
