-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
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

alter table profiles enable row level security;

create policy "read profiles"
  on profiles
  for select
  using (true);

create policy "Authenticated read profiles"
  on profiles
  for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own profile"
  on profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = as $$
begin
  insert into profiles (id, email, username, full_name, avatar_url)
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
  for each row execute procedure handle_new_user();

insert into profiles (id, email, username, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- Posts
create table if not exists posts (
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
  is_published boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table posts
  add column if not exists approach text,
  add column if not exists observations text,
  add column if not exists reflection text,
  add column if not exists feedback_needed text[],
  add column if not exists external_link text,
  add column if not exists is_published boolean not null default true;

alter table posts
  drop constraint if exists posts_wip_status_check;

alter table posts
  add constraint posts_wip_status_check
  check (wip_status in ('idea', 'exploring', 'prototype', 'testing', 'completed', 'failed', 'built', 'wip'));

alter table posts enable row level security;

create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists posts_created_at_idx on posts(created_at desc);

drop policy if exists "read posts" on posts;

create policy "read published posts"
  on posts
  for select
  using (is_published = true or auth.uid() = user_id);

create policy "Users can create own posts"
  on posts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on posts
  for delete
  using (auth.uid() = user_id);

-- Problems
create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  affected_group text not null,
  frequency text not null,
  current_workaround text not null,
  solution_type text not null,
  is_real_confirmation boolean not null default true,
  expected_outcome text,
  additional_context text,
  is_published boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table problems
  add column if not exists is_real_confirmation boolean not null default true,
  add column if not exists expected_outcome text,
  add column if not exists additional_context text,
  add column if not exists is_published boolean not null default true;

alter table problems enable row level security;

create index if not exists problems_user_id_idx on problems(user_id);
create index if not exists problems_created_at_idx on problems(created_at desc);

drop policy if exists "read problems" on problems;
drop policy if exists "Users can create own problems" on problems;
drop policy if exists "Users can update own problems" on problems;
drop policy if exists "Users can delete own problems" on problems;

create policy "read published problems"
  on problems
  for select
  using (is_published = true or auth.uid() = user_id);

create policy "Users can create own problems"
  on problems
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own problems"
  on problems
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own problems"
  on problems
  for delete
  using (auth.uid() = user_id);

-- Problem validations
create table if not exists problem_validations (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (problem_id, user_id)
);

alter table problem_validations enable row level security;

create index if not exists problem_validations_problem_id_idx on problem_validations(problem_id);
create index if not exists problem_validations_user_id_idx on problem_validations(user_id);

drop policy if exists "read problem validations" on problem_validations;
drop policy if exists "Users can create problem validations" on problem_validations;
drop policy if exists "Users can delete own problem validations" on problem_validations;

create policy "read problem validations"
  on problem_validations
  for select
  using (
    exists (
      select 1
      from problems p
      where p.id = problem_validations.problem_id
        and (p.is_published = true or p.user_id = auth.uid())
    )
  );

create policy "Users can create problem validations"
  on problem_validations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own problem validations"
  on problem_validations
  for delete
  using (auth.uid() = user_id);

-- Problem comments
create table if not exists problem_comments (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  parent_id uuid references problem_comments(id) on delete cascade,
  created_at timestamp with time zone default now(),
  check (length(trim(content)) > 0)
);

create index if not exists problem_comments_problem_id_idx on problem_comments(problem_id);
create index if not exists problem_comments_parent_id_idx on problem_comments(parent_id);
create index if not exists problem_comments_user_id_idx on problem_comments(user_id);

create or replace function ensure_problem_comment_reply_depth()
returns trigger
language plpgsql
as $$
declare
  parent_comment problem_comments;
begin
  if new.parent_id is null then
    return new;
  end if;

  select *
  into parent_comment
  from problem_comments
  where id = new.parent_id;

  if not found then
    raise exception 'Parent comment does not exist';
  end if;

  if parent_comment.problem_id <> new.problem_id then
    raise exception 'Reply must belong to the same problem';
  end if;

  if parent_comment.parent_id is not null then
    raise exception 'Replies can only be nested one level deep';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_problem_comment_reply_depth on problem_comments;
create trigger ensure_problem_comment_reply_depth
  before insert or update on problem_comments
  for each row execute function ensure_problem_comment_reply_depth();

alter table problem_comments enable row level security;

drop policy if exists "read problem comments" on problem_comments;
drop policy if exists "Users can create problem comments" on problem_comments;
drop policy if exists "Users can update own problem comments" on problem_comments;
drop policy if exists "Users can delete own problem comments" on problem_comments;

create policy "read problem comments"
  on problem_comments
  for select
  using (
    exists (
      select 1
      from problems p
      where p.id = problem_comments.problem_id
        and (p.is_published = true or p.user_id = auth.uid())
    )
  );

create policy "Users can create problem comments"
  on problem_comments
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own problem comments"
  on problem_comments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own problem comments"
  on problem_comments
  for delete
  using (auth.uid() = user_id);

-- Collaborators
create table if not exists collaborators (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamp with time zone default now(),
  unique (requester_id, receiver_id)
);

alter table collaborators enable row level security;

create index if not exists collaborators_requester_id_idx on collaborators(requester_id);
create index if not exists collaborators_receiver_id_idx on collaborators(receiver_id);
create index if not exists collaborators_status_idx on collaborators(status);

alter table collaborators
  add constraint collaborators_no_self check (requester_id <> receiver_id);

create unique index if not exists collaborators_pair_unique
  on collaborators (
    least(requester_id, receiver_id),
    greatest(requester_id, receiver_id)
  );

create policy "Users can read own collaborators (either side)"
  on collaborators
  for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy "Only requester can create collaboration request"
  on collaborators
  for insert
  with check (auth.uid() = requester_id);

create policy "Only receiver can update collaboration status"
  on collaborators
  for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create policy "Either side can delete collaboration"
  on collaborators
  for delete
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Validations
create table if not exists validations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

alter table validations enable row level security;

create index if not exists validations_post_id_idx on validations(post_id);
create index if not exists validations_user_id_idx on validations(user_id);

drop policy if exists "read validations" on validations;

create policy "read validations for published posts"
  on validations
  for select
  using (
    exists (
      select 1
      from posts p
      where p.id = validations.post_id
        and (p.is_published = true or p.user_id = auth.uid())
    )
  );

create policy "Users can create validations"
  on validations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own validations"
  on validations
  for delete
  using (auth.uid() = user_id);

create policy "Post owners can delete validations"
  on validations
  for delete
  using (
    auth.uid() = (select user_id from posts where posts.id = post_id)
  );

-- Solutions
create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table solutions enable row level security;

create index if not exists solutions_post_id_idx on solutions(post_id);
create index if not exists solutions_user_id_idx on solutions(user_id);

drop policy if exists "read solutions" on solutions;

create policy "read solutions for published posts"
  on solutions
  for select
  using (
    exists (
      select 1
      from posts p
      where p.id = solutions.post_id
        and (p.is_published = true or p.user_id = auth.uid())
    )
  );

create policy "Users can create solutions"
  on solutions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own solutions"
  on solutions
  for delete
  using (auth.uid() = user_id);

create policy "Post owners can delete solutions"
  on solutions
  for delete
  using (
    auth.uid() = (select user_id from posts where posts.id = post_id)
  );


-- Storage bucket for post media
insert into storage.buckets (id, name, 
  values ('post-media', 'post-media', true)
  on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "read post-media"
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
