-- Spotify OAuth token storage for user-authorized ingestion (/me/episodes)

create table if not exists spotify_oauth_tokens (
  provider      text primary key,
  access_token  text not null,
  refresh_token text not null,
  token_type    text not null default 'Bearer',
  scope         text,
  expires_at    timestamptz not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists spotify_oauth_tokens_updated_at on spotify_oauth_tokens;
create trigger spotify_oauth_tokens_updated_at
  before update on spotify_oauth_tokens
  for each row execute procedure update_updated_at();

