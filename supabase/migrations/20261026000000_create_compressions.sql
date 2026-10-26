-- Records for images people chose to save after compressing.
create table if not exists public.compressions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null,
  file_name text not null,
  format text not null check (format in ('image/jpeg', 'image/webp', 'image/png')),
  original_size bigint not null check (original_size > 0),
  compressed_size bigint not null check (compressed_size > 0),
  original_width integer not null check (original_width > 0),
  original_height integer not null check (original_height > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  storage_path text not null unique
);

create index if not exists compressions_client_created_idx
  on public.compressions (client_id, created_at desc);

-- RLS on with no policies: only the server (service role key) can read or write.
alter table public.compressions enable row level security;

-- Private bucket. Uploads use signed upload URLs issued by the API, downloads use signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compressed-images',
  'compressed-images',
  false,
  26214400,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do nothing;
