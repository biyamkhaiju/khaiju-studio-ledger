-- Khaiju Studio Ledger — initial Supabase schema
-- Run this file once in the Supabase SQL Editor before using account sign-up.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'NPR',
  time_zone text not null default 'Asia/Kathmandu',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.clients (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('wedding', 'business', 'internal')),
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  created_at date not null default current_date,
  unique (workspace_id, id)
);

create table if not exists public.projects (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  division text not null check (division in ('wedding', 'website', 'ml')),
  client_id text not null,
  status text not null check (status in ('planning', 'in_progress', 'in_review', 'completed', 'on_hold', 'cancelled')),
  budget numeric(14, 2) not null default 0 check (budget >= 0),
  start_date date not null default current_date,
  deadline date not null,
  description text not null default '',
  manual_progress integer not null default 0 check (manual_progress between 0 and 100),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete restrict
);

create table if not exists public.project_milestones (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  title text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create table if not exists public.payments (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create table if not exists public.expenses (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  project_id text,
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create table if not exists public.activity_log (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  text text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists projects_workspace_status_idx on public.projects(workspace_id, status);
create index if not exists projects_workspace_deadline_idx on public.projects(workspace_id, deadline);
create index if not exists payments_workspace_date_idx on public.payments(workspace_id, date desc);
create index if not exists expenses_workspace_date_idx on public.expenses(workspace_id, date desc);
create index if not exists activity_workspace_date_idx on public.activity_log(workspace_id, occurred_at desc);
create index if not exists milestones_project_position_idx on public.project_milestones(workspace_id, project_id, position);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_access_workspace_row(target_workspace_id uuid, record_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_member(target_workspace_id)
    and (public.is_workspace_admin(target_workspace_id) or record_owner_id = auth.uid());
$$;

create or replace function public.can_access_project(target_workspace_id uuid, target_project_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where workspace_id = target_workspace_id
      and id = target_project_id
      and public.can_access_workspace_row(workspace_id, created_by)
  );
$$;

create or replace function public.handle_new_ledger_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  insert into public.workspaces (name, owner_id)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'workspace_name', ''), 'Khaiju Studio'),
    new.id
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, created_by)
  values (new_workspace_id, new.id, 'admin', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ledger on auth.users;
create trigger on_auth_user_created_ledger
after insert on auth.users
for each row execute procedure public.handle_new_ledger_user();

-- Backfill users that already existed before this migration was applied.
insert into public.profiles (id, email, full_name)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.workspaces (name, owner_id)
select coalesce(nullif(u.raw_user_meta_data ->> 'workspace_name', ''), 'Khaiju Studio'), u.id
from auth.users u
where not exists (
  select 1 from public.workspace_members m where m.user_id = u.id
);

insert into public.workspace_members (workspace_id, user_id, role, created_by)
select w.id, w.owner_id, 'admin', w.owner_id
from public.workspaces w
where not exists (
  select 1 from public.workspace_members m where m.workspace_id = w.id and m.user_id = w.owner_id
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "workspace_members_read_workspace" on public.workspace_members;
create policy "workspace_members_read_workspace" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "workspace_members_admin_insert" on public.workspace_members;
create policy "workspace_members_admin_insert" on public.workspace_members for insert to authenticated with check (public.is_workspace_admin(workspace_id));
drop policy if exists "workspace_members_admin_update" on public.workspace_members;
create policy "workspace_members_admin_update" on public.workspace_members for update to authenticated using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
drop policy if exists "workspace_members_admin_delete" on public.workspace_members;
create policy "workspace_members_admin_delete" on public.workspace_members for delete to authenticated using (public.is_workspace_admin(workspace_id));

drop policy if exists "workspaces_member_read" on public.workspaces;
create policy "workspaces_member_read" on public.workspaces for select to authenticated using (public.is_workspace_member(id));
drop policy if exists "workspaces_admin_update" on public.workspaces;
create policy "workspaces_admin_update" on public.workspaces for update to authenticated using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

drop policy if exists "clients_select_accessible" on public.clients;
create policy "clients_select_accessible" on public.clients for select to authenticated using (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "clients_insert_member" on public.clients;
create policy "clients_insert_member" on public.clients for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
drop policy if exists "clients_update_accessible" on public.clients;
create policy "clients_update_accessible" on public.clients for update to authenticated using (public.can_access_workspace_row(workspace_id, created_by)) with check (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "clients_delete_accessible" on public.clients;
create policy "clients_delete_accessible" on public.clients for delete to authenticated using (public.can_access_workspace_row(workspace_id, created_by));

drop policy if exists "projects_select_accessible" on public.projects;
create policy "projects_select_accessible" on public.projects for select to authenticated using (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
drop policy if exists "projects_update_accessible" on public.projects;
create policy "projects_update_accessible" on public.projects for update to authenticated using (public.can_access_workspace_row(workspace_id, created_by)) with check (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "projects_delete_accessible" on public.projects;
create policy "projects_delete_accessible" on public.projects for delete to authenticated using (public.can_access_workspace_row(workspace_id, created_by));

drop policy if exists "milestones_select_accessible" on public.project_milestones;
create policy "milestones_select_accessible" on public.project_milestones for select to authenticated using (public.can_access_project(workspace_id, project_id));
drop policy if exists "milestones_insert_accessible" on public.project_milestones;
create policy "milestones_insert_accessible" on public.project_milestones for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and public.can_access_project(workspace_id, project_id));
drop policy if exists "milestones_update_accessible" on public.project_milestones;
create policy "milestones_update_accessible" on public.project_milestones for update to authenticated using (public.can_access_project(workspace_id, project_id)) with check (public.can_access_project(workspace_id, project_id));
drop policy if exists "milestones_delete_accessible" on public.project_milestones;
create policy "milestones_delete_accessible" on public.project_milestones for delete to authenticated using (public.can_access_project(workspace_id, project_id));

drop policy if exists "payments_select_accessible" on public.payments;
create policy "payments_select_accessible" on public.payments for select to authenticated using (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "payments_insert_member" on public.payments;
create policy "payments_insert_member" on public.payments for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and public.can_access_project(workspace_id, project_id));
drop policy if exists "payments_update_accessible" on public.payments;
create policy "payments_update_accessible" on public.payments for update to authenticated using (public.can_access_workspace_row(workspace_id, created_by)) with check (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "payments_delete_accessible" on public.payments;
create policy "payments_delete_accessible" on public.payments for delete to authenticated using (public.can_access_workspace_row(workspace_id, created_by));

drop policy if exists "expenses_select_accessible" on public.expenses;
create policy "expenses_select_accessible" on public.expenses for select to authenticated using (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member" on public.expenses for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and (project_id is null or public.can_access_project(workspace_id, project_id)));
drop policy if exists "expenses_update_accessible" on public.expenses;
create policy "expenses_update_accessible" on public.expenses for update to authenticated using (public.can_access_workspace_row(workspace_id, created_by)) with check (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "expenses_delete_accessible" on public.expenses;
create policy "expenses_delete_accessible" on public.expenses for delete to authenticated using (public.can_access_workspace_row(workspace_id, created_by));

drop policy if exists "activity_select_accessible" on public.activity_log;
create policy "activity_select_accessible" on public.activity_log for select to authenticated using (public.can_access_workspace_row(workspace_id, created_by));
drop policy if exists "activity_insert_member" on public.activity_log;
create policy "activity_insert_member" on public.activity_log for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
drop policy if exists "activity_delete_accessible" on public.activity_log;
create policy "activity_delete_accessible" on public.activity_log for delete to authenticated using (public.can_access_workspace_row(workspace_id, created_by));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.activity_log to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.can_access_workspace_row(uuid, uuid) to authenticated;
grant execute on function public.can_access_project(uuid, text) to authenticated;
