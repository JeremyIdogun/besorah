import { requireAdminSession } from '../_lib/admin-auth.js';
import { createSupabaseAdminClient } from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdminSession(req, res)) return;

  const { data, error } = await supabase
    .from('spotify_shows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data || []);
}

