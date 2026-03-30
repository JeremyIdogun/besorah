import { requireAdminSession } from '../../_lib/admin-auth.js';
import {
  createSupabaseAdminClient,
  exchangeSpotifyAuthCode,
  getSpotifyRedirectUri,
  upsertSpotifyOAuthToken,
} from '../_lib/spotify.js';

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf('=');
      if (index === -1) return acc;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function getQueryValue(input) {
  if (Array.isArray(input)) return input[0];
  return input;
}

function clearStateCookie() {
  return 'spotify_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

function redirectToShows(res, params) {
  const search = new URLSearchParams(params).toString();
  const location = `/admin/shows${search ? `?${search}` : ''}`;
  res.setHeader('Set-Cookie', clearStateCookie());
  res.writeHead(302, { Location: location });
  return res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminSession(req, res)) return;

  const error = getQueryValue(req.query?.error);
  if (error) {
    return redirectToShows(res, { spotifyAuth: 'error', reason: error });
  }

  const code = getQueryValue(req.query?.code);
  const state = getQueryValue(req.query?.state);
  const cookieState = parseCookies(req.headers.cookie || '').spotify_oauth_state;

  if (!code) {
    return redirectToShows(res, { spotifyAuth: 'error', reason: 'missing_code' });
  }

  if (!state || !cookieState || state !== cookieState) {
    return redirectToShows(res, { spotifyAuth: 'error', reason: 'invalid_state' });
  }

  try {
    const redirectUri = getSpotifyRedirectUri(req);
    const tokenData = await exchangeSpotifyAuthCode(code, redirectUri);
    const supabase = createSupabaseAdminClient();

    await upsertSpotifyOAuthToken(supabase, tokenData);
    return redirectToShows(res, { spotifyAuth: 'success' });
  } catch (err) {
    return redirectToShows(res, { spotifyAuth: 'error', reason: err.message });
  }
}
