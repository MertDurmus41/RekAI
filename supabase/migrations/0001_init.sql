create table public.ads (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  category text not null,
  title text,
  body_text text,
  image_path text not null unique,
  width int not null,
  height int not null,
  started_at timestamptz,
  source_url text unique,
  created_at timestamptz not null default now()
);
create index ads_category_idx on public.ads (category);
create index ads_brand_idx on public.ads (brand);

create table public.remixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete cascade,
  prompt text not null,
  upload_path text,
  result_path text not null,
  ad_copy jsonb,
  created_at timestamptz not null default now()
);
create index remixes_user_idx on public.remixes (user_id, created_at desc);

alter table public.ads enable row level security;
alter table public.remixes enable row level security;

create policy "ads readable by signed-in users" on public.ads
  for select to authenticated using (true);

create policy "remixes select own" on public.remixes
  for select to authenticated using (auth.uid() = user_id);
create policy "remixes insert own" on public.remixes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "remixes update own" on public.remixes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values
  ('ads', 'ads', true),
  ('uploads', 'uploads', false),
  ('remixes', 'remixes', false)
on conflict (id) do nothing;

-- uploads/ ve remixes/ icinde herkes sadece kendi {user_id}/ klasorunu gorur
create policy "own files select" on storage.objects
  for select to authenticated
  using (bucket_id in ('uploads', 'remixes') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('uploads', 'remixes') and (storage.foldername(name))[1] = auth.uid()::text);
