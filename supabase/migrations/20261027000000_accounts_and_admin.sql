-- Accounts, roles, app settings and dashboard statistics.

-- One profile per auth user. Role and status are only changed by the server with the service role key.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for users that signed up before this migration.
insert into public.profiles (id, email, created_at)
select id, coalesce(email, ''), created_at from auth.users
on conflict (id) do nothing;

-- Saved images now belong to an account when the person was signed in.
alter table public.compressions
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists compressions_user_created_idx
  on public.compressions (user_id, created_at desc);

create index if not exists compressions_created_idx
  on public.compressions (created_at desc);

-- Single row of settings the dashboard can change.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  saving_enabled boolean not null default true,
  max_upload_mb integer not null default 25 check (max_upload_mb between 1 and 25),
  retention_days integer check (retention_days is null or retention_days >= 1),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Totals and daily series for the dashboard overview, computed in one round trip.
create or replace function public.admin_stats(period_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total_images', (select count(*) from public.compressions),
    'bytes_before', (select coalesce(sum(original_size), 0) from public.compressions),
    'bytes_after', (select coalesce(sum(compressed_size), 0) from public.compressions),
    'images_in_period', (
      select count(*) from public.compressions
      where created_at >= current_date - (period_days - 1)
    ),
    'total_users', (select count(*) from public.profiles),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'suspended', (select count(*) from public.profiles where status = 'suspended'),
    'new_users_in_period', (
      select count(*) from public.profiles
      where created_at >= current_date - (period_days - 1)
    ),
    'anonymous_images', (select count(*) from public.compressions where user_id is null),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'images', coalesce(c.images, 0),
        'bytes_saved', coalesce(c.bytes_saved, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(current_date - (period_days - 1), current_date, interval '1 day') as d (day)
      left join (
        select created_at::date as day, count(*) as images, sum(original_size - compressed_size) as bytes_saved
        from public.compressions
        where created_at >= current_date - (period_days - 1)
        group by 1
      ) c on c.day = d.day::date
    ),
    'formats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'format', f.format,
        'images', f.images,
        'bytes_before', f.bytes_before,
        'bytes_after', f.bytes_after
      ) order by f.images desc), '[]'::jsonb)
      from (
        select format, count(*) as images, sum(original_size) as bytes_before, sum(compressed_size) as bytes_after
        from public.compressions
        group by format
      ) f
    )
  );
$$;

revoke execute on function public.admin_stats(integer) from public, anon, authenticated;
grant execute on function public.admin_stats(integer) to service_role;
