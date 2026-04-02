import { suggestPillars } from '../src/lib/classifier.js';
import { requireAdminSession } from '../lib/server/admin-auth.js';
import { createSupabaseAdminClient } from '../lib/server/spotify.js';
import {
  extractYouTubePlaylistId,
  fetchAllYouTubePlaylistVideoIds,
  fetchYouTubePlaylist,
  fetchYouTubeVideosByIds,
} from '../lib/server/youtube.js';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

function getAction(req) {
  const action = req.query?.action;
  return Array.isArray(action) ? action[0] : action;
}

function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}

function toDateOnly(iso) {
  return iso ? new Date(iso).toISOString().split('T')[0] : null;
}

function bestThumbnail(snippet = {}) {
  return (
    snippet?.thumbnails?.maxres?.url ||
    snippet?.thumbnails?.standard?.url ||
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    null
  );
}

async function upsertTrackedPlaylist(supabase, playlist) {
  const snippet = playlist?.snippet || {};
  const payload = {
    youtube_playlist_id: playlist.id,
    title: snippet.title || 'Untitled playlist',
    channel_title: snippet.channelTitle || null,
    description: snippet.description || null,
    image_url: bestThumbnail(snippet),
    external_url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    status: 'active',
    last_synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('youtube_playlists')
    .upsert(payload, { onConflict: 'youtube_playlist_id' });

  if (error) {
    throw new Error(`Failed to upsert YouTube playlist: ${error.message}`);
  }

  return payload;
}

async function ingestPlaylist({ supabase, playlistId }) {
  const playlist = await fetchYouTubePlaylist(playlistId);
  await upsertTrackedPlaylist(supabase, playlist);

  const runInsert = await supabase
    .from('ingestion_runs')
    .insert({ spotify_show_id: `youtube:${playlistId}`, status: 'running' })
    .select()
    .single();

  if (runInsert.error) {
    throw new Error(`Failed to start ingestion run: ${runInsert.error.message}`);
  }

  const runId = runInsert.data?.id;

  try {
    const videoIds = await fetchAllYouTubePlaylistVideoIds(playlistId);
    const videos = await fetchYouTubeVideosByIds(videoIds);
    const videoById = Object.fromEntries(videos.map((video) => [video.id, video]));

    const { data: pillars, error: pillarsError } = await supabase
      .from('pillars')
      .select('id, slug');
    if (pillarsError) {
      throw new Error(`Failed to load pillars: ${pillarsError.message}`);
    }
    const pillarBySlug = Object.fromEntries((pillars || []).map((p) => [p.slug, p.id]));

    let newEpisodes = 0;
    let skippedEpisodes = 0;
    let skippedExistingEpisodes = 0;
    let failedEpisodes = 0;
    const errorSamples = [];

    for (const videoId of videoIds) {
      const video = videoById[videoId];
      if (!video?.id) {
        skippedEpisodes++;
        continue;
      }

      const snippet = video.snippet || {};
      const title = snippet.title || `YouTube video ${videoId}`;
      const description = snippet.description || '';
      const channelTitle = snippet.channelTitle || null;

      const { data: existing, error: existingError } = await supabase
        .from('sermons')
        .select('id')
        .eq('youtube_video_id', videoId)
        .maybeSingle();

      if (existingError) {
        failedEpisodes++;
        if (errorSamples.length < 5) {
          errorSamples.push(`Lookup failed for ${videoId}: ${existingError.message}`);
        }
        continue;
      }

      if (existing) {
        skippedExistingEpisodes++;
        continue;
      }

      const payload = {
        external_episode_id: `youtube:${videoId}`,
        youtube_video_id: videoId,
        spotify_episode_id: null,
        title,
        description,
        church: channelTitle,
        date_preached: toDateOnly(snippet.publishedAt),
        platform: 'youtube',
        external_url: `https://www.youtube.com/watch?v=${videoId}`,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        image_url: bestThumbnail(snippet),
        classification_status: 'pending',
        review_status: 'unreviewed',
      };

      const { data: sermon, error: insertError } = await supabase
        .from('sermons')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          skippedExistingEpisodes++;
          continue;
        }

        failedEpisodes++;
        if (errorSamples.length < 5) {
          errorSamples.push(`Insert failed for ${videoId}: ${insertError.message}`);
        }
        continue;
      }

      newEpisodes++;
      const suggestions = suggestPillars({
        title,
        description,
        showTitle: playlist?.snippet?.title || '',
        publisher: channelTitle || '',
      });

      if (suggestions.length) {
        const tagRows = suggestions
          .map((suggestion) => ({
            sermon_id: sermon.id,
            pillar_id: pillarBySlug[suggestion.pillar_slug],
            source: suggestion.source,
            confidence_score: suggestion.confidence_score,
          }))
          .filter((row) => row.pillar_id);

        if (tagRows.length) {
          await supabase
            .from('sermon_pillars')
            .upsert(tagRows, { onConflict: 'sermon_id,pillar_id', ignoreDuplicates: true });
        }
      }
    }

    const processedEpisodes = newEpisodes + skippedExistingEpisodes;

    if (videoIds.length > 0 && processedEpisodes === 0) {
      if (failedEpisodes > 0) {
        throw new Error(
          `No YouTube videos were ingested. First error: ${errorSamples[0] || 'Unknown insert error'}`,
        );
      }
      throw new Error(
        'No usable videos were found in this playlist. The videos may be unavailable or inaccessible.',
      );
    }

    await supabase
      .from('youtube_playlists')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('youtube_playlist_id', playlistId);

    await supabase
      .from('ingestion_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_json: {
          source: 'youtube_playlist',
          playlistId,
          playlistTitle: playlist?.snippet?.title || null,
          new: newEpisodes,
          updated: 0,
          skipped_existing: skippedExistingEpisodes,
          skipped: skippedEpisodes,
          failed: failedEpisodes,
          processed: processedEpisodes,
          totalVideoIds: videoIds.length,
          error_samples: errorSamples,
        },
      })
      .eq('id', runId);

    return {
      playlist: {
        id: playlistId,
        title: playlist?.snippet?.title || 'Untitled playlist',
      },
      newEpisodes,
      updatedEpisodes: 0,
      skippedEpisodes,
      skippedExistingEpisodes,
      failedEpisodes,
      processedEpisodes,
      totalVideoIds: videoIds.length,
      errorSamples,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    await supabase
      .from('ingestion_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_json: { message },
      })
      .eq('id', runId);
    throw err;
  }
}

async function handlePlaylists(req, res) {
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('youtube_playlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('youtube_playlists')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res);
}

async function handleImportPlaylist(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let playlistId;
  try {
    playlistId = extractYouTubePlaylistId(req.body?.playlistId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid playlistId';
    return res.status(400).json({ error: message });
  }

  const result = await ingestPlaylist({ supabase, playlistId });
  return res.status(200).json(result);
}

async function handleSyncPlaylist(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let playlistId;
  try {
    playlistId = extractYouTubePlaylistId(req.body?.playlistId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid playlistId';
    return res.status(400).json({ error: message });
  }

  const result = await ingestPlaylist({ supabase, playlistId });
  return res.status(200).json(result);
}

export default async function handler(req, res) {
  try {
    const action = getAction(req);
    switch (action) {
      case 'playlists':
        return handlePlaylists(req, res);
      case 'import-playlist':
        return handleImportPlaylist(req, res);
      case 'sync-playlist':
        return handleSyncPlaylist(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
}
