-- Projects + revision snapshots for saved comics
-- Panel/page layout is derived from stored Comic JSON; we only persist snapshots + a "current" pointer.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  current_revision_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  label text null,
  schema_version int not null default 1,
  comic_json jsonb not null
);

alter table public.projects
  add constraint projects_current_revision_fk
  foreign key (current_revision_id) references public.project_revisions(id)
  on delete set null;

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists project_revisions_project_id_idx on public.project_revisions(project_id);

alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;

-- Projects: only the owning user can read/write.
create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Revisions: permitted iff the user owns the parent project.
create policy "project_revisions_select_own"
  on public.project_revisions for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_revisions_insert_own"
  on public.project_revisions for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_revisions_update_own"
  on public.project_revisions for update
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_revisions_delete_own"
  on public.project_revisions for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

