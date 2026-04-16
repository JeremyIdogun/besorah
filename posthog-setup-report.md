<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog server-side event tracking has been added to all five Node.js API handlers using the `posthog-node` SDK. A shared singleton client (`lib/server/posthog.js`) is used across all files. The client is configured for Vercel serverless functions with `flushAt: 1` and `flushInterval: 0` to ensure events are sent immediately. Exception autocapture is enabled. Environment variables (`POSTHOG_API_KEY`, `POSTHOG_HOST`) are stored in `.env`.

| Event | Description | File |
|---|---|---|
| `admin_logged_in` | Admin successfully authenticated | `api/admin.js` |
| `admin_login_failed` | Admin authentication attempt failed | `api/admin.js` |
| `sermon_reviewed` | Admin reviewed a single sermon with a status decision | `api/admin.js` |
| `sermons_reviewed_bulk` | Admin reviewed multiple sermons in one bulk operation | `api/admin.js` |
| `sermon_deleted` | Admin permanently deleted a sermon record | `api/admin.js` |
| `pillar_created` | Admin created a new theological pillar (theme) | `api/admin.js` |
| `pillar_updated` | Admin updated an existing theological pillar | `api/admin.js` |
| `pillar_deleted` | Admin deleted a theological pillar | `api/admin.js` |
| `show_removed` | Admin removed a tracked Spotify show | `api/admin.js` |
| `spotify_show_imported` | Admin imported a new Spotify show and its episodes | `api/spotify/add-show.js` |
| `spotify_show_synced` | Admin manually triggered a Spotify show sync | `api/spotify/sync.js` |
| `youtube_playlist_imported` | Admin imported a YouTube playlist as sermons | `api/youtube.js` |
| `youtube_playlist_synced` | Admin triggered a YouTube playlist sync | `api/youtube.js` |
| `cron_shows_synced` | Automated cron job synced all active Spotify shows | `api/cron/sync-shows.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://eu.posthog.com/project/142622/dashboard/621515
- **Admin Login Activity:** https://eu.posthog.com/project/142622/insights/sXKNeBhs
- **Sermon Review Funnel:** https://eu.posthog.com/project/142622/insights/zmYyaP1y
- **Content Ingestion Over Time:** https://eu.posthog.com/project/142622/insights/HcwfgQcQ
- **Sermon Deletion Rate:** https://eu.posthog.com/project/142622/insights/iRb8GMgd
- **Content Library Changes:** https://eu.posthog.com/project/142622/insights/B95gTz6z

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
