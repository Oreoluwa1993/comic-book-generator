-- Character design feature schema (Supabase)
-- Creates character library tables + storage bucket policies.

-- Tables
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters (user_id);

create table if not exists public.character_versions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  status text not null default 'draft',
  identity_text text null,
  style_profile text null,
  created_at timestamptz not null default now()
);

create index if not exists character_versions_character_id_idx on public.character_versions (character_id);
create index if not exists character_versions_status_idx on public.character_versions (status);

create table if not exists public.character_assets (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.character_versions (id) on delete cascade,
  asset_type text not null,
  storage_path text not null,
  width int null,
  height int null,
  created_at timestamptz not null default now()
);

create index if not exists character_assets_version_id_idx on public.character_assets (version_id);
create index if not exists character_assets_asset_type_idx on public.character_assets (asset_type);

-- RLS
alter table public.characters enable row level security;
alter table public.character_versions enable row level security;
alter table public.character_assets enable row level security;

-- characters policies
drop policy if exists characters_select_own on public.characters;
create policy characters_select_own
  on public.characters for select
  using (auth.uid() = user_id);

drop policy if exists characters_insert_own on public.characters;
create policy characters_insert_own
  on public.characters for insert
  with check (auth.uid() = user_id);

drop policy if exists characters_update_own on public.characters;
create policy characters_update_own
  on public.characters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists characters_delete_own on public.characters;
create policy characters_delete_own
  on public.characters for delete
  using (auth.uid() = user_id);

-- character_versions policies (through parent character ownership)
drop policy if exists character_versions_select_own on public.character_versions;
create policy character_versions_select_own
  on public.character_versions for select
  using (
    exists (
      select 1
      from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_versions_insert_own on public.character_versions;
create policy character_versions_insert_own
  on public.character_versions for insert
  with check (
    exists (
      select 1
      from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_versions_update_own on public.character_versions;
create policy character_versions_update_own
  on public.character_versions for update
  using (
    exists (
      select 1
      from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_versions_delete_own on public.character_versions;
create policy character_versions_delete_own
  on public.character_versions for delete
  using (
    exists (
      select 1
      from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

-- character_assets policies (through parent version -> character ownership)
drop policy if exists character_assets_select_own on public.character_assets;
create policy character_assets_select_own
  on public.character_assets for select
  using (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_assets_insert_own on public.character_assets;
create policy character_assets_insert_own
  on public.character_assets for insert
  with check (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_assets_update_own on public.character_assets;
create policy character_assets_update_own
  on public.character_assets for update
  using (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.character_versions v
      join public.characters c on c.id = v.character_id
      where v.id = version_id and c.user_id = auth.uid()
    )
  );

drop policy if exists character_assets_delete_own on public.character_assets;
create policy character_assets_delete_own
  on public.character_assets for delete
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
values ('character-assets', 'character-assets', false)
on conflict (id) do nothing;

-- The path convention is: {userId}/{characterId}/{versionId}/{filename}
drop policy if exists character_assets_read_own on storage.objects;
create policy character_assets_read_own
  on storage.objects for select
  using (
    bucket_id = 'character-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists character_assets_write_own on storage.objects;
create policy character_assets_write_own
  on storage.objects for insert
  with check (
    bucket_id = 'character-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists character_assets_update_own_object on storage.objects;
create policy character_assets_update_own_object
  on storage.objects for update
  using (
    bucket_id = 'character-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'character-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists character_assets_delete_own_object on storage.objects;
create policy character_assets_delete_own_object
  on storage.objects for delete
  using (
    bucket_id = 'character-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

