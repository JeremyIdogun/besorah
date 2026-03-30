import { requireAdminSession } from '../_lib/admin-auth.js';
import { createSupabaseAdminClient } from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdminSession(req, res)) return;

  const [unreviewed, approved, total, shows] = await Promise.all([
    supabase.from('sermons').select('id', { count: 'exact', head: true }).eq('review_status', 'unreviewed'),
    supabase.from('sermons').select('id', { count: 'exact', head: true }).eq('review_status', 'approved'),
    supabase.from('sermons').select('id', { count: 'exact', head: true }),
    supabase.from('spotify_shows').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return res.status(200).json({
    unreviewed: unreviewed.count ?? 0,
    approved: approved.count ?? 0,
    total: total.count ?? 0,
    activeShows: shows.count ?? 0,
  });
}

