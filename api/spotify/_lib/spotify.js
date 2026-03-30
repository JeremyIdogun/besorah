/* global Buffer, process */
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SPOTIFY_MARKET = 'US';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_OAUTH_PROVIDER = 'spotify';
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;

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

function spotifyClientCredentialsHeader() {
  const clientId = requireEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = requireEnv('SPOTIFY_CLIENT_SECRET');
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${creds}`;
}

function tokenErrorDetail(data) {
  return data?.error_description || data?.error?.message || data?.error || 'Unknown token error';
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

function getRequestOrigin(req) {
  const forwardedHost = req?.headers?.['x-forwarded-host'];
  const host = forwardedHost || req?.headers?.host;
  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https';
  if (!host) throw new Error('Unable to determine request host for Spotify redirect URI');
  return `${proto}://${host}`;
}

export function getSpotifyRedirectUri(req) {
  return readEnv('SPOTIFY_REDIRECT_URI') || `${getRequestOrigin(req)}/api/spotify/auth/callback`;
}

export function getSpotifyAuthUrl(req) {
  const clientId = requireEnv('SPOTIFY_CLIENT_ID');
  const redirectUri = getSpotifyRedirectUri(req);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-library-read',
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getSpotifyToken() {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: spotifyClientCredentialsHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await parseJsonSafely(res);
  if (!res.ok || !data?.access_token) {
    const detail = tokenErrorDetail(data);
    throw new Error(`Spotify token error: ${detail}`);
  }
  return data.access_token;
}

export async function exchangeSpotifyAuthCode(code, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: spotifyClientCredentialsHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await parseJsonSafely(res);
  if (!res.ok || !data?.access_token) {
    throw new Error(`Spotify OAuth code exchange failed: ${tokenErrorDetail(data)}`);
  }
  return data;
}

export async function refreshSpotifyUserToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: spotifyClientCredentialsHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await parseJsonSafely(res);
  if (!res.ok || !data?.access_token) {
    throw new Error(`Spotify token refresh failed: ${tokenErrorDetail(data)}`);
  }
  return data;
}

export async function getStoredSpotifyOAuthToken(supabase) {
  const { data, error } = await supabase
    .from('spotify_oauth_tokens')
    .select('provider, access_token, refresh_token, token_type, scope, expires_at')
    .eq('provider', SPOTIFY_OAUTH_PROVIDER)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify OAuth token: ${error.message}`);
  }
  return data;
}

export async function upsertSpotifyOAuthToken(supabase, tokenData) {
  const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString();
  const row = {
    provider: SPOTIFY_OAUTH_PROVIDER,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type || 'Bearer',
    scope: tokenData.scope || null,
    expires_at: expiresAt,
  };

  const { error } = await supabase
    .from('spotify_oauth_tokens')
    .upsert(row, { onConflict: 'provider' });

  if (error) {
    throw new Error(`Failed to store Spotify OAuth token: ${error.message}`);
  }

  return row;
}

export async function getSpotifyUserAccessToken(supabase) {
  const token = await getStoredSpotifyOAuthToken(supabase);
  if (!token?.refresh_token) {
    throw new Error('Spotify account is not connected. Connect it from Admin > Shows first.');
  }

  const tokenExpiresAtMs = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (token.access_token && tokenExpiresAtMs - Date.now() > ACCESS_TOKEN_EXPIRY_BUFFER_MS) {
    return token.access_token;
  }

  const refreshed = await refreshSpotifyUserToken(token.refresh_token);
  const resolvedRefreshToken = refreshed.refresh_token || token.refresh_token;
  const stored = await upsertSpotifyOAuthToken(supabase, {
    ...refreshed,
    refresh_token: resolvedRefreshToken,
    scope: refreshed.scope || token.scope || null,
  });

  return stored.access_token;
}

export async function fetchSpotifyShow(token, showId) {
  if (!/^[A-Za-z0-9]+$/.test(showId)) {
    throw new Error(
      'Invalid Spotify show ID. Use a show URL like https://open.spotify.com/show/... or a raw show ID.',
    );
  }

  const market = getSpotifyMarket();
  const res = await fetch(`https://api.spotify.com/v1/shows/${showId}?market=${market}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(`Spotify show error (${showId}): ${data.error?.message || 'Unknown error'}`);
  }
  if (!data?.id) {
    throw new Error(`Spotify show error (${showId}): Empty response payload`);
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
    const data = await parseJsonSafely(res);
    if (!res.ok) {
      throw new Error(
        `Spotify episodes error (${showId}): ${data.error?.message || 'Unknown error'}`,
      );
    }
    episodes.push(...(data?.items || []));
    url = data?.next || null;
  }

  return episodes;
}
