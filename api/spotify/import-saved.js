import { suggestPillars } from '../../src/lib/classifier.js';
import { requireAdminSession } from '../../lib/server/admin-auth.js';
import {
  createSupabaseAdminClient,
  getSpotifyMarket,
  getSpotifyUserAccessToken,
} from '../../lib/server/spotify.js';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

function toDateOnly(spotifyDate) {
  return spotifyDate ? new Date(spotifyDate).toISOString().split('T')[0] : null;
}

async function upsertShow(supabase, show) {
  if (!show?.id) return;

  const { error } = await supabase.from('spotify_shows').upsert(
    {
      spotify_show_id: show.id,
      title: show.name || 'Untitled show',
      publisher: show.publisher || null,
      description: show.description || null,
      image_url: show.images?.[0]?.url ?? null,
      external_url: show.external_urls?.spotify ?? null,
      status: 'active',
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'spotify_show_id' },
  );

  if (error) {
    throw new Error(`Failed to upsert show ${show.id}: ${error.message}`);
  }
}

async function fetchSavedEpisodesPage(token, url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Spotify saved episodes fetch failed: ${data.error?.message || 'Unknown error'}`);
  }
  return data;
}

async function importSavedEpisodes(supabase, token, pillarBySlug, maxEpisodes = null) {
  const market = getSpotifyMarket();
  let url = `https://api.spotify.com/v1/me/episodes?market=${market}&limit=50`;

  let processedEpisodes = 0;
  let newEpisodes = 0;
  let skippedEpisodes = 0;
  let skippedExistingEpisodes = 0;
  let failedEpisodes = 0;
  let pages = 0;

  while (url) {
    const page = await fetchSavedEpisodesPage(token, url);
    pages++;

    for (const item of page.items || []) {
      if (maxEpisodes && processedEpisodes >= maxEpisodes) {
        break;
      }

      const ep = item.episode;
      if (!ep?.id) {
        skippedEpisodes++;
        continue;
      }

      const show = ep.show || null;
      await upsertShow(supabase, show);

      const { data: existing, error: existingError } = await supabase
        .from('sermons')
        .select('id')
        .eq('spotify_episode_id', ep.id)
        .maybeSingle();

      if (existingError) {
        failedEpisodes++;
        continue;
      }

      if (existing) {
        skippedExistingEpisodes++;
        continue;
      }

      const payload = {
        spotify_episode_id: ep.id,
        spotify_show_id: show?.id || null,
        title: ep.name,
        description: ep.description,
        church: show?.publisher ?? null,
        date_preached: toDateOnly(ep.release_date),
        platform: 'spotify',
        external_url: ep.external_urls?.spotify ?? '',
        embed_url: `https://open.spotify.com/embed/episode/${ep.id}`,
        image_url: ep.images?.[0]?.url ?? show?.images?.[0]?.url ?? null,
        classification_status: 'pending',
        review_status: 'unreviewed',
      };

      const { data: sermon, error: upsertError } = await supabase
        .from('sermons')
        .insert(payload)
        .select()
        .single();

      if (upsertError) {
        if (upsertError.code === '23505') {
          skippedExistingEpisodes++;
        } else {
          failedEpisodes++;
        }
        continue;
      }

      processedEpisodes++;
      newEpisodes++;
      const suggestions = suggestPillars({
        title: ep.name,
        description: ep.description || '',
        showTitle: show?.name || '',
        publisher: show?.publisher || '',
      });

      if (suggestions.length) {
        const tagRows = suggestions
          .map((s) => ({
            sermon_id: sermon.id,
            pillar_id: pillarBySlug[s.pillar_slug],
            source: s.source,
            confidence_score: s.confidence_score,
          }))
          .filter((r) => r.pillar_id);

        if (tagRows.length) {
          await supabase
            .from('sermon_pillars')
            .upsert(tagRows, { onConflict: 'sermon_id,pillar_id', ignoreDuplicates: true });
        }
      }
    }

    if (maxEpisodes && processedEpisodes >= maxEpisodes) {
      break;
    }

    url = page.next;
  }

  return {
    newEpisodes,
    updatedEpisodes: 0,
    skippedEpisodes,
    skippedExistingEpisodes,
    failedEpisodes,
    processedEpisodes,
    pages,
  };
}

export default async function handler(req, res) {
  let runId = null;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdminSession(req, res)) return;

    const supabase = getSupabase();
    const requestedMaxEpisodes = Number(req.body?.maxEpisodes);
    const maxEpisodes =
      Number.isFinite(requestedMaxEpisodes) && requestedMaxEpisodes > 0
        ? Math.floor(requestedMaxEpisodes)
        : null;

    const runInsert = await supabase
      .from('ingestion_runs')
      .insert({ spotify_show_id: null, status: 'running' })
      .select()
      .single();

    if (runInsert.error) {
      return res.status(500).json({ error: `Failed to start ingestion run: ${runInsert.error.message}` });
    }

    const run = runInsert.data;
    runId = run?.id || null;
    const token = await getSpotifyUserAccessToken(supabase);
    const { data: pillars } = await supabase.from('pillars').select('id, slug');
    const pillarBySlug = Object.fromEntries((pillars || []).map((p) => [p.slug, p.id]));

    const result = await importSavedEpisodes(supabase, token, pillarBySlug, maxEpisodes);

    await supabase
      .from('ingestion_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_json: {
          source: 'saved_episodes',
          new: result.newEpisodes,
          updated: 0,
          skipped_existing: result.skippedExistingEpisodes,
          skipped: result.skippedEpisodes,
          failed: result.failedEpisodes,
          processed: result.processedEpisodes,
          pages: result.pages,
        },
      })
      .eq('id', runId);

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';

    if (runId) {
      const supabase = getSupabase();
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_json: { message },
        })
        .eq('id', runId);
    }

    return res.status(500).json({ error: message });
  }
}
