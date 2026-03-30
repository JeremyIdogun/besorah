import { requireAdminSession } from '../_lib/admin-auth.js';
import { createSupabaseAdminClient } from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdminSession(req, res)) return;

  const requestedLimit = Number(req.query?.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 10;

  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data || []);
}

