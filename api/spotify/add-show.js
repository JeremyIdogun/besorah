import { suggestPillars } from '../../src/lib/classifier.js';
import { requireAdminSession } from '../../lib/server/admin-auth.js';
import {
  createSupabaseAdminClient,
  fetchAllSpotifyShowEpisodes,
  fetchSpotifyShow,
  getSpotifyToken,
} from '../../lib/server/spotify.js';
import { getPostHogClient } from '../../lib/server/posthog.js';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

export default async function handler(req, res) {
  let runId = null;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireAdminSession(req, res)) return;

    const supabase = getSupabase();
    const { showId } = req.body;
    if (!showId) return res.status(400).json({ error: 'showId is required' });

    // Log ingestion run start
    const { data: run } = await supabase
      .from('ingestion_runs')
      .insert({ spotify_show_id: showId, status: 'running' })
      .select()
      .single();
    runId = run?.id || null;

    const token = await getSpotifyToken();
    const show = await fetchSpotifyShow(token, showId);

    // Upsert show
    await supabase.from('spotify_shows').upsert(
      {
        spotify_show_id: show.id,
        title: show.name,
        publisher: show.publisher,
        description: show.description,
        image_url: show.images?.[0]?.url ?? null,
        external_url: show.external_urls?.spotify ?? null,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'spotify_show_id' },
    );

    const episodes = await fetchAllSpotifyShowEpisodes(token, showId);
    let episodesImported = 0;
    let skippedExistingEpisodes = 0;
    let failedEpisodes = 0;

    // Fetch all pillars for slug→id mapping
    const { data: pillars } = await supabase.from('pillars').select('id, slug');
    const pillarBySlug = Object.fromEntries(pillars.map((p) => [p.slug, p.id]));

    for (const ep of episodes) {
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

      const releaseDate = ep.release_date
        ? new Date(ep.release_date).toISOString().split('T')[0]
        : null;

      const sermonPayload = {
        spotify_episode_id: ep.id,
        spotify_show_id: show.id,
        title: ep.name,
        description: ep.description,
        church: show.publisher ?? null,
        date_preached: releaseDate,
        platform: 'spotify',
        external_url: ep.external_urls?.spotify ?? '',
        embed_url: `https://open.spotify.com/embed/episode/${ep.id}`,
        image_url: ep.images?.[0]?.url ?? show.images?.[0]?.url ?? null,
        classification_status: 'pending',
        review_status: 'unreviewed',
      };

      const { data: sermon, error: sermonError } = await supabase
        .from('sermons')
        .insert(sermonPayload)
        .select()
        .single();

      if (sermonError) {
        if (sermonError.code === '23505') {
          skippedExistingEpisodes++;
        } else {
          failedEpisodes++;
        }
        continue;
      }
      episodesImported++;

      // Run classifier
      const suggestions = suggestPillars({
        title: ep.name,
        description: ep.description || '',
        showTitle: show.name,
        publisher: show.publisher || '',
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

    // Complete ingestion run
    await supabase
      .from('ingestion_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_json: {
          new: episodesImported,
          updated: 0,
          skipped_existing: skippedExistingEpisodes,
          failed: failedEpisodes,
        },
      })
      .eq('id', runId);

    getPostHogClient().capture({
      distinctId: 'admin',
      event: 'spotify_show_imported',
      properties: {
        show_id: showId,
        show_title: show.name,
        episodes_imported: episodesImported,
        episodes_skipped: skippedExistingEpisodes,
        episodes_failed: failedEpisodes,
      },
    });
    return res.status(200).json({
      show: { title: show.name },
      episodesImported,
      skippedExistingEpisodes,
      failedEpisodes,
    });
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

    getPostHogClient().captureException(err, 'admin');
    return res.status(500).json({ error: message });
  }
}
