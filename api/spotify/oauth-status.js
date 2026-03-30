import { createSupabaseAdminClient, getStoredSpotifyOAuthToken } from './_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getStoredSpotifyOAuthToken(supabase);
    return res.status(200).json({
      connected: Boolean(token?.refresh_token),
      expiresAt: token?.expires_at || null,
      scope: token?.scope || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

