-- Thiệp cưới đơn lẻ: schema, RLS, quyền admin, RSVP, lời chúc và storage.
-- Chạy trong Supabase SQL Editor sau khi tạo project.
create extension if not exists pgcrypto;

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  groom_name text not null default '',
  bride_name text not null default '',
  wedding_date timestamptz,
  ceremony_time text default '',
  venue_name text default '',
  venue_address text default '',
  story text default '',
  hero_image text default '',
  gallery text[] not null default '{}',
  accent_color text default '#a98767',
  music_url text default '',
  gift_title text default 'Lời chúc phúc là món quà quý giá nhất',
  gift_bank_name text default '',
  gift_account_name text default '',
  gift_account_number text default '',
  gift_qr_url text default '',
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null,
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  attending boolean not null default true,
  guest_count integer not null default 1 check (guest_count between 0 and 10),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null,
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  message text not null check (char_length(message) between 1 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.weddings enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;

-- IMPORTANT: replace this UUID with the admin user's auth.users.id after creating
-- the admin user in Supabase Authentication > Users.
create or replace function public.is_wedding_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) = 'REPLACE_WITH_ADMIN_USER_UUID'::uuid;
$$;

-- Public read access only to published wedding.
drop policy if exists "Public can view published wedding" on public.weddings;
create policy "Public can view published wedding"
on public.weddings for select to anon, authenticated using (published = true or public.is_wedding_admin());

drop policy if exists "Admin can insert wedding" on public.weddings;
create policy "Admin can insert wedding"
on public.weddings for insert to authenticated with check (public.is_wedding_admin());

drop policy if exists "Admin can update wedding" on public.weddings;
create policy "Admin can update wedding"
on public.weddings for update to authenticated using (public.is_wedding_admin()) with check (public.is_wedding_admin());

drop policy if exists "Admin can delete wedding" on public.weddings;
create policy "Admin can delete wedding"
on public.weddings for delete to authenticated using (public.is_wedding_admin());

-- Public visitors can submit RSVP. They cannot read RSVP rows.
drop policy if exists "Public can submit RSVP" on public.rsvps;
create policy "Public can submit RSVP"
on public.rsvps for insert to anon, authenticated
with check (
  char_length(trim(guest_name)) between 1 and 100
  and char_length(note) <= 500
  and guest_count between 0 and 10
  and exists (select 1 from public.weddings w where w.slug = wedding_slug and w.published = true)
);

drop policy if exists "Admin can read RSVP" on public.rsvps;
create policy "Admin can read RSVP"
on public.rsvps for select to authenticated using (public.is_wedding_admin());

drop policy if exists "Admin can update RSVP" on public.rsvps;
create policy "Admin can update RSVP"
on public.rsvps for update to authenticated using (public.is_wedding_admin()) with check (public.is_wedding_admin());

drop policy if exists "Admin can delete RSVP" on public.rsvps;
create policy "Admin can delete RSVP"
on public.rsvps for delete to authenticated using (public.is_wedding_admin());

-- Public visitors submit unapproved wishes; only admin can view all / approve them.
drop policy if exists "Public can submit wishes" on public.wishes;
create policy "Public can submit wishes"
on public.wishes for insert to anon, authenticated
with check (
  approved = false
  and char_length(trim(guest_name)) between 1 and 100
  and char_length(message) between 1 and 1000
  and exists (select 1 from public.weddings w where w.slug = wedding_slug and w.published = true)
);

drop policy if exists "Public can read approved wishes" on public.wishes;
create policy "Public can read approved wishes"
on public.wishes for select to anon, authenticated using (approved = true or public.is_wedding_admin());

drop policy if exists "Admin can update wishes" on public.wishes;
create policy "Admin can update wishes"
on public.wishes for update to authenticated using (public.is_wedding_admin()) with check (public.is_wedding_admin());

drop policy if exists "Admin can delete wishes" on public.wishes;
create policy "Admin can delete wishes"
on public.wishes for delete to authenticated using (public.is_wedding_admin());

-- Public read bucket for album images. Uploads/deletes restricted to admin UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-gallery', 'wedding-gallery', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "Public can view wedding gallery" on storage.objects;
create policy "Public can view wedding gallery" on storage.objects
for select to anon, authenticated using (bucket_id = 'wedding-gallery');

drop policy if exists "Admin can upload wedding gallery" on storage.objects;
create policy "Admin can upload wedding gallery" on storage.objects
for insert to authenticated with check (bucket_id = 'wedding-gallery' and public.is_wedding_admin());

drop policy if exists "Admin can update wedding gallery" on storage.objects;
create policy "Admin can update wedding gallery" on storage.objects
for update to authenticated using (bucket_id = 'wedding-gallery' and public.is_wedding_admin())
with check (bucket_id = 'wedding-gallery' and public.is_wedding_admin());

drop policy if exists "Admin can delete wedding gallery" on storage.objects;
create policy "Admin can delete wedding gallery" on storage.objects
for delete to authenticated using (bucket_id = 'wedding-gallery' and public.is_wedding_admin());

-- Seed one draft record. Update it in /admin, then publish when ready.
insert into public.weddings (slug, groom_name, bride_name, wedding_date, ceremony_time, venue_name, venue_address, story, published)
values ('minh-quan-ngoc-uyen','Minh Quân','Ngọc Uyên','2026-12-12 10:30:00+07','10:30','Tên nhà hàng / địa điểm','Địa chỉ tổ chức tiệc cưới','Viết câu chuyện của hai bạn tại đây.',false)
on conflict (slug) do nothing;

-- SECURITY CHECKLIST:
-- 1. Replace REPLACE_WITH_ADMIN_USER_UUID above with the admin user's UUID from Auth > Users.
-- 2. Create only your own admin account; disable public signups after creating it.
-- 3. Never expose service_role keys in browser or NEXT_PUBLIC env vars.
-- 4. Add CAPTCHA/rate limits to public RSVP/wish forms before a high-traffic launch.
