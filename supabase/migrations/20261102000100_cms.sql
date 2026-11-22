create extension if not exists pgcrypto with schema extensions;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.content_type as enum ('article', 'project', 'research', 'experiment', 'now');

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type public.content_type not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  excerpt text not null default '' check (length(excerpt) <= 500),
  body_markdown text not null default '',
  cover_image_url text,
  thumbnail_url text,
  tags text[] not null default '{}',
  category text,
  seo_title text check (seo_title is null or length(seo_title) <= 200),
  seo_description text check (seo_description is null or length(seo_description) <= 320),
  og_image_url text,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, slug),
  check (status <> 'published' or published_at is not null)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  width integer,
  height integer,
  alt_text text not null default '',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.content_media (
  content_id uuid not null references public.content_entries (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, media_id)
);

create index content_entries_public_listing_idx
  on public.content_entries (content_type, published_at desc)
  where status = 'published';
create index content_entries_admin_listing_idx
  on public.content_entries (updated_at desc);
create index content_entries_tags_idx
  on public.content_entries using gin (tags);
create index content_media_media_id_idx on public.content_media (media_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_entries_set_updated_at
before update on public.content_entries
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.content_entries enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_media enable row level security;

revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
create policy "Administrators can read their own allowlist record"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));

revoke all on public.content_entries from public, anon, authenticated;
grant select on public.content_entries to anon, authenticated;
grant insert (content_type, title, slug, excerpt, body_markdown, cover_image_url, thumbnail_url,
  tags, category, seo_title, seo_description, og_image_url, featured, position, metadata)
  on public.content_entries to authenticated;
grant update (content_type, title, slug, excerpt, body_markdown, cover_image_url, thumbnail_url,
  tags, category, seo_title, seo_description, og_image_url, featured, position, metadata)
  on public.content_entries to authenticated;
grant delete on public.content_entries to authenticated;

create policy "Visitors can read published entries"
  on public.content_entries for select to anon, authenticated
  using (status = 'published');
create policy "Administrators can read all entries"
  on public.content_entries for select to authenticated
  using ((select public.is_admin()));
create policy "Administrators can create draft entries"
  on public.content_entries for insert to authenticated
  with check ((select public.is_admin()) and status = 'draft' and created_by = (select auth.uid()));
create policy "Administrators can edit entries without changing publication state"
  on public.content_entries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Administrators can delete entries"
  on public.content_entries for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.media_assets from public, anon, authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
create policy "Administrators can manage media metadata"
  on public.media_assets for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

revoke all on public.content_media from public, anon, authenticated;
grant select, insert, delete on public.content_media to authenticated;
create policy "Administrators can manage content media links"
  on public.content_media for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('draft-media', 'draft-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('published-media', 'published-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Administrators can manage private draft media"
  on storage.objects for all to authenticated
  using (bucket_id = 'draft-media' and (select public.is_admin()))
  with check (bucket_id = 'draft-media' and (select public.is_admin()));

create policy "Anyone can read promoted published media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'published-media');

-- Only the trusted publishing Worker uses the service role to write to published-media.
