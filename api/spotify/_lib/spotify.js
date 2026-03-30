/* global Buffer, process */
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SPOTIFY_MARKET = 'US';

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

export function getSpotifyMarket() {
  return readEnv('SPOTIFY_MARKET')?.toUpperCase() || DEFAULT_SPOTIFY_MARKET;
}

export function createSupabaseAdminClient() {
  const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) environment variable');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getSpotifyToken() {
  const clientId = requireEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = requireEnv('SPOTIFY_CLIENT_SECRET');

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || 'Unknown token error';
    throw new Error(`Spotify token error: ${detail}`);
  }
  return data.access_token;
}

export async function fetchSpotifyShow(token, showId) {
  const market = getSpotifyMarket();
  const res = await fetch(`https://api.spotify.com/v1/shows/${showId}?market=${market}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Spotify show error (${showId}): ${data.error?.message || 'Unknown error'}`);
  }
  return data;
}

export async function fetchAllSpotifyShowEpisodes(token, showId) {
  const market = getSpotifyMarket();
  const episodes = [];
  let url = `https://api.spotify.com/v1/shows/${showId}/episodes?market=${market}&limit=50`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Spotify episodes error (${showId}): ${data.error?.message || 'Unknown error'}`,
      );
    }
    episodes.push(...(data.items || []));
    url = data.next;
  }

  return episodes;
}
