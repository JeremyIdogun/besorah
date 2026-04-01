/* global process */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function readEnv(name) {
  return process.env[name]?.trim();
}

function requireEnv(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getYouTubeApiKey() {
  return requireEnv('YOUTUBE_API_KEY');
}

function buildUrl(path, params = {}) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set('key', getYouTubeApiKey());
  return url.toString();
}

async function parseJsonSafely(res) {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function youtubeGet(path, params = {}) {
  const res = await fetch(buildUrl(path, params));
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    const detail = data?.error?.message || data?.error || 'Unknown YouTube API error';
    throw new Error(`YouTube API error: ${detail}`);
  }
  return data;
}

export function extractYouTubePlaylistId(input) {
  const value = String(input || '').trim();
  if (!value) {
    throw new Error('playlistId is required');
  }

  // Bare playlist ID
  if (!/^https?:\/\//i.test(value) && !/youtube\.com/i.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const fromQuery = url.searchParams.get('list');
    if (fromQuery) return fromQuery;
  } catch {
    // Fallback to regex parsing below.
  }

  const listMatch = value.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  throw new Error('Invalid YouTube playlist URL or ID');
}

export async function fetchYouTubePlaylist(playlistId) {
  const data = await youtubeGet('playlists', {
    part: 'snippet,contentDetails,status',
    id: playlistId,
    maxResults: 1,
  });
  const playlist = data?.items?.[0];
  if (!playlist?.id) {
    throw new Error(
      'Playlist not found. For unlisted playlists, ensure the playlist ID/URL is correct.',
    );
  }
  return playlist;
}

export async function fetchAllYouTubePlaylistVideoIds(playlistId) {
  const videoIds = [];
  const seen = new Set();
  let pageToken = null;

  while (true) {
    const data = await youtubeGet('playlistItems', {
      part: 'snippet,contentDetails,status',
      playlistId,
      maxResults: 50,
      pageToken,
    });

    for (const item of data?.items || []) {
      const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      videoIds.push(videoId);
    }

    if (!data?.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videoIds;
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function fetchYouTubeVideosByIds(videoIds) {
  if (!videoIds.length) return [];

  const videos = [];
  const chunks = chunk(videoIds, 50);

  for (const ids of chunks) {
    const data = await youtubeGet('videos', {
      part: 'snippet,contentDetails,status',
      id: ids.join(','),
      maxResults: 50,
    });
    videos.push(...(data?.items || []));
  }

  return videos;
}
