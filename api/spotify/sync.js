import { suggestPillars } from '../../src/lib/classifier.js';
import { requireAdminSession } from '../../lib/server/admin-auth.js';
import {
  createSupabaseAdminClient,
  fetchAllSpotifyShowEpisodes,
  fetchSpotifyShow,
  getSpotifyToken,
} from '../../lib/server/spotify.js';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

async function syncShow(supabase, token, showId, pillarBySlug) {
  const show = await fetchSpotifyShow(token, showId);
  const episodes = await fetchAllSpotifyShowEpisodes(token, showId);

  let newEpisodes = 0;
  let skippedExistingEpisodes = 0;
  let failedEpisodes = 0;

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

    const payload = {
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

    const { data: sermon, error } = await supabase
      .from('sermons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        skippedExistingEpisodes++;
      } else {
        failedEpisodes++;
      }
      continue;
    }

    newEpisodes++;
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

  await supabase
    .from('spotify_shows')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('spotify_show_id', showId);

  return { newEpisodes, skippedExistingEpisodes, failedEpisodes };
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

    const { data: run } = await supabase
      .from('ingestion_runs')
      .insert({ spotify_show_id: showId, status: 'running' })
      .select()
      .single();
    runId = run?.id || null;

    const token = await getSpotifyToken();
    const { data: pillars } = await supabase.from('pillars').select('id, slug');
    const pillarBySlug = Object.fromEntries(pillars.map((p) => [p.slug, p.id]));

    const { newEpisodes, skippedExistingEpisodes, failedEpisodes } = await syncShow(
      supabase,
      token,
      showId,
      pillarBySlug,
    );

    await supabase
      .from('ingestion_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_json: {
          new: newEpisodes,
          updated: 0,
          skipped_existing: skippedExistingEpisodes,
          failed: failedEpisodes,
        },
      })
      .eq('id', runId);

    return res.status(200).json({
      newEpisodes,
      updatedEpisodes: 0,
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

    return res.status(500).json({ error: message });
  }
}
