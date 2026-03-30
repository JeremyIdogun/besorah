import { requireAdminSession } from '../_lib/admin-auth.js';
import { createSupabaseAdminClient } from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdminSession(req, res)) return;

  const id = String(req.query?.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const { data, error } = await supabase
    .from('sermons')
    .select('*, sermon_pillars(pillar_id, source, confidence_score, pillars(*))')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}

