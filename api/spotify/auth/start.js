import crypto from 'node:crypto';
import { requireAdminSession } from '../../_lib/admin-auth.js';
import { getSpotifyAuthUrl } from '../_lib/spotify.js';

function isSecureRequest(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (!forwardedProto) return false;
  return String(forwardedProto).split(',')[0].trim() === 'https';
}

function buildStateCookie(req, state) {
  const parts = [
    `spotify_oauth_state=${encodeURIComponent(state)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminSession(req, res)) return;

  try {
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL(getSpotifyAuthUrl(req));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('show_dialog', 'true');

    res.setHeader('Set-Cookie', buildStateCookie(req, state));
    res.writeHead(302, { Location: authUrl.toString() });
    return res.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
