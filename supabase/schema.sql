-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  email text,
  avatar_url text,
  bio text,
  skills text[] default '{}',
  badges text[] default '{}',
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Public read profiles"
  on public.profiles
  for select
  using (true);

create policy "Authenticated read profiles"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, username, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  problem_statement text,
  theory text,
  explanation text,
  approach text,
  observations text,
  reflection text,
  feedback_needed text[],
  external_link text,
  wip_status text check (wip_status in ('idea', 'exploring', 'prototype', 'testing', 'completed', 'failed', 'built', 'wip')),
  media_url text,
  created_at timestamp with time zone default now()
);

alter table public.posts
  add column if not exists approach text,
  add column if not exists observations text,
  add column if not exists reflection text,
  add column if not exists feedback_needed text[],
  add column if not exists external_link text;

alter table public.posts
  drop constraint if exists posts_wip_status_check;

alter table public.posts
  add constraint posts_wip_status_check
  check (wip_status in ('idea', 'exploring', 'prototype', 'testing', 'completed', 'failed', 'built', 'wip'));

alter table public.posts enable row level security;

create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

create policy "Public read posts"
  on public.posts
  for select
  using (true);

create policy "Users can create own posts"
  on public.posts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts
  for delete
  using (auth.uid() = user_id);

-- Collaborators
create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamp with time zone default now(),
  unique (requester_id, receiver_id)
);

alter table public.collaborators enable row level security;

create index if not exists collaborators_requester_id_idx on public.collaborators(requester_id);
create index if not exists collaborators_receiver_id_idx on public.collaborators(receiver_id);
create index if not exists collaborators_status_idx on public.collaborators(status);

alter table public.collaborators
  add constraint collaborators_no_self check (requester_id <> receiver_id);

create unique index if not exists collaborators_pair_unique
  on public.collaborators (
    least(requester_id, receiver_id),
    greatest(requester_id, receiver_id)
  );

create policy "Users can read own collaborators (either side)"
  on public.collaborators
  for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy "Only requester can create collaboration request"
  on public.collaborators
  for insert
  with check (auth.uid() = requester_id);

create policy "Only receiver can update collaboration status"
  on public.collaborators
  for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create policy "Either side can delete collaboration"
  on public.collaborators
  for delete
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Validations
create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

alter table public.validations enable row level security;

create index if not exists validations_post_id_idx on public.validations(post_id);
create index if not exists validations_user_id_idx on public.validations(user_id);

create policy "Public read validations"
  on public.validations
  for select
  using (true);

create policy "Users can create validations"
  on public.validations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own validations"
  on public.validations
  for delete
  using (auth.uid() = user_id);

create policy "Post owners can delete validations"
  on public.validations
  for delete
  using (
    auth.uid() = (select user_id from public.posts where public.posts.id = post_id)
  );

-- Solutions
create table if not exists public.solutions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.solutions enable row level security;

create index if not exists solutions_post_id_idx on public.solutions(post_id);
create index if not exists solutions_user_id_idx on public.solutions(user_id);

create policy "Public read solutions"
  on public.solutions
  for select
  using (true);

create policy "Users can create solutions"
  on public.solutions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own solutions"
  on public.solutions
  for delete
  using (auth.uid() = user_id);

create policy "Post owners can delete solutions"
  on public.solutions
  for delete
  using (
    auth.uid() = (select user_id from public.posts where public.posts.id = post_id)
  );


-- Storage bucket for post media
insert into storage.buckets (id, name, public)
  values ('post-media', 'post-media', true)
  on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "Public read post-media"
  on storage.objects
  for select
  using (bucket_id = 'post-media');

create policy "Users can upload to post-media under their folder"
  on storage.objects
  for insert
  with check (bucket_id = 'post-media' and position(auth.uid()::text || '/' in name) = 1);

create policy "Users can update own post-media"
  on storage.objects
  for update
  using (bucket_id = 'post-media' and position(auth.uid()::text || '/' in name) = 1)
  with check (bucket_id = 'post-media' and position(auth.uid()::text || '/' in name) = 1);

create policy "Users can delete own post-media"
  on storage.objects
  for delete
  using (bucket_id = 'post-media' and position(auth.uid()::text || '/' in name) = 1);
