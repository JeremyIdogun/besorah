/* global process */
import { suggestPillars } from '../../src/lib/classifier.js';
import {
  createSupabaseAdminClient,
  fetchAllSpotifyShowEpisodes,
  fetchSpotifyShow,
  getSpotifyToken,
} from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  // Validate cron secret to prevent unauthorised triggers
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: shows, error } = await supabase
    .from('spotify_shows')
    .select('spotify_show_id')
    .eq('status', 'active');

  if (error) return res.status(500).json({ error: error.message });

  const token = await getSpotifyToken();
  const { data: pillars } = await supabase.from('pillars').select('id, slug');
  const pillarBySlug = Object.fromEntries(pillars.map((p) => [p.slug, p.id]));

  const results = [];

  for (const show of shows) {
    const runInsert = await supabase
      .from('ingestion_runs')
      .insert({ spotify_show_id: show.spotify_show_id, status: 'running' })
      .select()
      .single();
    const run = runInsert.data;

    try {
      const showData = await fetchSpotifyShow(token, show.spotify_show_id);
      const episodes = await fetchAllSpotifyShowEpisodes(token, show.spotify_show_id);

      let newEpisodes = 0;
      let updatedEpisodes = 0;

      for (const ep of episodes) {
        const { data: existing } = await supabase
          .from('sermons')
          .select('id')
          .eq('spotify_episode_id', ep.id)
          .single();

        const releaseDate = ep.release_date
          ? new Date(ep.release_date).toISOString().split('T')[0]
          : null;

        const payload = {
          spotify_episode_id: ep.id,
          spotify_show_id: showData.id,
          title: ep.name,
          description: ep.description,
          church: showData.publisher ?? null,
          date_preached: releaseDate,
          platform: 'spotify',
          external_url: ep.external_urls?.spotify ?? '',
          embed_url: `https://open.spotify.com/embed/episode/${ep.id}`,
          image_url: ep.images?.[0]?.url ?? showData.images?.[0]?.url ?? null,
          updated_at: new Date().toISOString(),
        };

        if (!existing) {
          payload.classification_status = 'pending';
          payload.review_status = 'unreviewed';
        }

        const { data: sermon, error: uErr } = await supabase
          .from('sermons')
          .upsert(payload, { onConflict: 'spotify_episode_id' })
          .select()
          .single();

        if (uErr) continue;

        if (!existing) {
          newEpisodes++;
          const suggestions = suggestPillars({
            title: ep.name,
            description: ep.description || '',
            showTitle: showData.name,
            publisher: showData.publisher || '',
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
        } else {
          updatedEpisodes++;
        }
      }

      await supabase
        .from('spotify_shows')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('spotify_show_id', show.spotify_show_id);

      await supabase
        .from('ingestion_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          summary_json: { new: newEpisodes, updated: updatedEpisodes },
        })
        .eq('id', run?.id);

      results.push({ showId: show.spotify_show_id, newEpisodes, updatedEpisodes });
    } catch (err) {
      await supabase
        .from('ingestion_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_json: { message: err.message },
        })
        .eq('id', run?.id);

      results.push({ showId: show.spotify_show_id, error: err.message });
    }
  }

  return res.status(200).json({ results });
}
