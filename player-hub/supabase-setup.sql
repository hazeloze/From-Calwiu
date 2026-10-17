-- EF Player Hub database setup. Run this entire file in Supabase Dashboard > SQL Editor.
-- This uses the public anon key in the website with Row Level Security (RLS).
-- NEVER put a service_role key in frontend code.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  rating integer check (rating between 1 and 110),
  position text check (position is null or position in ('CF','SS','LWF','RWF','AMF','CMF','DMF','LMF','RMF','LB','RB','CB','GK')),
  club text check (club is null or char_length(club) <= 100),
  nationality text check (nationality is null or char_length(nationality) <= 80),
  card_type text check (card_type is null or char_length(card_type) <= 80),
  strong_foot text check (strong_foot is null or strong_foot in ('Right','Left')),
  age integer check (age is null or age between 1 and 100),
  description text check (description is null or char_length(description) <= 4000),
  photo_path text,
  card_image_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_public_listing_idx on public.players (is_published, rating desc);
create index if not exists players_created_at_idx on public.players (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at before update on public.players
for each row execute function public.set_updated_at();

-- SECURITY DEFINER avoids recursive RLS when checking admin_users. The function
-- returns only a boolean and checks the currently authenticated user's UUID.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.players enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;

-- Public visitors can only read published player rows. Admins can manage all rows.
drop policy if exists "Public can view published players" on public.players;
create policy "Public can view published players" on public.players
for select to anon, authenticated using (is_published = true or public.is_admin());
drop policy if exists "Admins can insert players" on public.players;
create policy "Admins can insert players" on public.players
for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update players" on public.players;
create policy "Admins can update players" on public.players
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete players" on public.players;
create policy "Admins can delete players" on public.players
for delete to authenticated using (public.is_admin());

-- Images are public to view because the public player gallery needs to render them.
-- Only admin users can upload, update, or delete image objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-images', 'player-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public can view player images" on storage.objects;
create policy "Public can view player images" on storage.objects
for select to anon, authenticated using (bucket_id = 'player-images');
drop policy if exists "Admins can upload player images" on storage.objects;
create policy "Admins can upload player images" on storage.objects
for insert to authenticated with check (bucket_id = 'player-images' and public.is_admin());
drop policy if exists "Admins can update player images" on storage.objects;
create policy "Admins can update player images" on storage.objects
for update to authenticated using (bucket_id = 'player-images' and public.is_admin())
with check (bucket_id = 'player-images' and public.is_admin());
drop policy if exists "Admins can delete player images" on storage.objects;
create policy "Admins can delete player images" on storage.objects
for delete to authenticated using (bucket_id = 'player-images' and public.is_admin());

-- IMPORTANT: Create your first admin account using Authentication > Users in the
-- Supabase dashboard, then copy that user's UUID into the statement below and run it:
-- insert into public.admin_users (user_id) values ('PASTE-AUTH-USER-UUID-HERE');
-- Do NOT enable public sign-ups for this project unless you intentionally need them.
