-- Blog section — articles and embedded clips in one feed

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content_type text not null default 'article' check (content_type in ('article', 'clip')),
  title text not null,
  excerpt text,
  cover_image_url text,
  body text,                          -- markdown, articles only
  platform text check (platform in ('youtube', 'instagram')),  -- clips only
  external_url text,                  -- clips only
  embed_url text,                     -- clips only
  pillar_id uuid references pillars(id) on delete set null,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists posts_status_published_idx on posts (status, published_at desc);
create index if not exists posts_content_type_idx on posts (content_type);

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
  before update on posts
  for each row execute procedure update_updated_at();

alter table posts enable row level security;

drop policy if exists "Public can read published posts" on posts;
create policy "Public can read published posts"
  on posts for select
  to anon, authenticated
  using (status = 'published');
