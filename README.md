# Euangelion

Euangelion ingests Spotify podcast episodes into Supabase as sermon records, auto-classifies them into pillars, and exposes an admin UI for review.

## 1. Environment setup

Copy `.env.example` to `.env.local` and fill these values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_MARKET=US
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/auth/callback
ADMIN_EMAIL=
ADMIN_PASSWORD=
CRON_SECRET=
```

Notes:
- `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` are used for Spotify client credentials flow (server-side only).
- `SPOTIFY_MARKET` controls episode availability lookup (`US` default).
- `SPOTIFY_REDIRECT_URI` must match the Redirect URI configured in your Spotify app dashboard.
- `SUPABASE_SERVICE_ROLE_KEY` is required by API routes that write ingestion data.

## 2. Database setup

Run the initial migration and seed:

- [`supabase/migrations/001_initial.sql`](/Users/jeremyidogun/Desktop/Projects/euangelion/supabase/migrations/001_initial.sql)
- [`supabase/migrations/002_spotify_oauth.sql`](/Users/jeremyidogun/Desktop/Projects/euangelion/supabase/migrations/002_spotify_oauth.sql)
- [`supabase/seed.sql`](/Users/jeremyidogun/Desktop/Projects/euangelion/supabase/seed.sql)

You can run these using Supabase SQL editor or your local Supabase CLI workflow.

## 3. Ingestion flow

### Add a new show (first import)

`POST /api/spotify/add-show`

Body:

```json
{ "showId": "spotify_show_id_here" }
```

What it does:
- Fetches show metadata from Spotify
- Upserts `spotify_shows`
- Fetches all show episodes
- Upserts `sermons` by `spotify_episode_id`
- Adds automatic pillar suggestions into `sermon_pillars`
- Logs status in `ingestion_runs`

### Sync an existing show

`POST /api/spotify/sync`

Body:

```json
{ "showId": "spotify_show_id_here" }
```

What it does:
- Pulls latest show episodes
- Inserts new episodes
- Updates existing episodes
- Updates `spotify_shows.last_synced_at`
- Logs summary in `ingestion_runs`

### Nightly cron sync (all active shows)

`GET /api/cron/sync-shows`

Required header:

```http
Authorization: Bearer <CRON_SECRET>
```

Configured in [`vercel.json`](/Users/jeremyidogun/Desktop/Projects/euangelion/vercel.json) at `0 3 * * *`.

### Saved Episodes (OAuth user import)

1. Visit `/api/spotify/auth/start` (or use the Admin Shows page "Connect Spotify" button).
2. Authorize with your Spotify account.
3. Spotify redirects to `/api/spotify/auth/callback`, which stores refresh/access tokens in Supabase.
4. Trigger `POST /api/spotify/import-saved` (or use "Import Saved Episodes" in Admin Shows).

This imports episodes from Spotify `GET /me/episodes` into `sermons` and `spotify_shows`.

## 4. Local run

```bash
npm install
npm run dev
```

`npm run dev` runs the frontend only (Vite).

For API route testing (`/api/*`), run:

```bash
npx vercel dev
```

Then in admin (via Vercel dev URL):
- `/admin/shows` to add a Spotify show
- Click `Sync` to pull latest episodes
- `/admin/review` to approve/edit pillar tags

## 5. Manual endpoint tests

Add show:

```bash
curl -X POST http://localhost:3000/api/spotify/add-show \
  -H "Content-Type: application/json" \
  -d '{"showId":"<spotify_show_id>"}'
```

Sync show:

```bash
curl -X POST http://localhost:3000/api/spotify/sync \
  -H "Content-Type: application/json" \
  -d '{"showId":"<spotify_show_id>"}'
```

Cron sync:

```bash
curl http://localhost:3000/api/cron/sync-shows \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Import saved episodes:

```bash
curl -X POST http://localhost:3000/api/spotify/import-saved \
  -H "Content-Type: application/json" \
  -d '{}'
```
