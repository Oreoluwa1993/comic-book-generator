-- Inspirations library (Supabase)
-- Stores user-owned inspiration items + optional links to character versions.

-- Tables
create table if not exists public.inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'browser_capture',
  source_url text null,
  image_source_url text null,
  title text null,
  notes text null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspirations_user_id_idx on public.inspirations (user_id);
create index if not exists inspirations_created_at_idx on public.inspirations (created_at desc);

create table if not exists public.character_version_inspirations (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.character_versions (id) on delete cascade,
  inspiration_id uuid not null references public.inspirations (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists character_version_inspirations_unique_idx
  on public.character_version_inspirations (version_id, inspiration_id);

create index if not exists character_version_inspirations_version_id_idx
  on public.character_version_inspirations (version_id);

create index if not exists character_version_inspirations_inspiration_id_idx
  on public.character_version_inspirations (inspiration_id);

-- RLS
alter table public.inspirations enable row level security;
alter table public.character_version_inspirations enable row level security;

-- inspirations policies
drop policy if exists inspirations_select_own on public.inspirations;
create policy inspirations_select_own
  on public.inspirations for select
  using (auth.uid() = user_id);

drop policy if exists inspirations_insert_own on public.inspirations;
create policy inspirations_insert_own
  on public.inspirations for insert
  with check (auth.uid() = user_id);

drop policy if exists inspirations_update_own on public.inspirations;
create policy inspirations_update_own
  on public.inspirations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists inspirations_delete_own on public.inspirations;
create policy inspirations_delete_own
  on public.inspirations for delete
  using (auth.uid() = user_id);

-- character_version_inspirations policies (through parent version -> character ownership)
drop policy if exists character_version_inspirations_select_own on public.character_version_inspirations;
create policy character_version_inspirations_select_own
  on public.character_version_inspirations for select
  using (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_version_inspirations_insert_own on public.character_version_inspirations;
create policy character_version_inspirations_insert_own
  on public.character_version_inspirations for insert
  with check (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_version_inspirations_delete_own on public.character_version_inspirations;
create policy character_version_inspirations_delete_own
  on public.character_version_inspirations for delete
  using (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

-- Storage bucket + policies
insert into storage.buckets (id, name, public)
values ('inspiration-assets', 'inspiration-assets', false)
on conflict (id) do nothing;

-- The path convention is: {userId}/{inspirationId}/{filename}
drop policy if exists inspiration_assets_read_own on storage.objects;
create policy inspiration_assets_read_own
  on storage.objects for select
  using (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists inspiration_assets_write_own on storage.objects;
create policy inspiration_assets_write_own
  on storage.objects for insert
  with check (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists inspiration_assets_update_own_object on storage.objects;
create policy inspiration_assets_update_own_object
  on storage.objects for update
  using (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists inspiration_assets_delete_own_object on storage.objects;
create policy inspiration_assets_delete_own_object
  on storage.objects for delete
  using (
    bucket_id = 'inspiration-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

