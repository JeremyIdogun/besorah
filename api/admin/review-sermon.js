import { requireAdminSession } from '../_lib/admin-auth.js';
import { createSupabaseAdminClient } from '../spotify/_lib/spotify.js';

const supabase = createSupabaseAdminClient();
const VALID_REVIEW_STATUSES = new Set(['approved', 'rejected', 'unreviewed']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdminSession(req, res)) return;

  const sermonId = String(req.body?.sermonId || '').trim();
  const reviewStatus = String(req.body?.reviewStatus || '').trim();
  const preacher = req.body?.preacher ?? '';
  const church = req.body?.church ?? '';
  const description = req.body?.description ?? '';
  const pillarIds = Array.isArray(req.body?.pillarIds) ? req.body.pillarIds : [];

  if (!sermonId) {
    return res.status(400).json({ error: 'sermonId is required' });
  }
  if (!VALID_REVIEW_STATUSES.has(reviewStatus)) {
    return res.status(400).json({ error: 'Invalid reviewStatus' });
  }

  const { error: updateError } = await supabase
    .from('sermons')
    .update({
      review_status: reviewStatus,
      preacher,
      church,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sermonId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  const { error: deleteError } = await supabase
    .from('sermon_pillars')
    .delete()
    .eq('sermon_id', sermonId)
    .eq('source', 'manual');

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  if (pillarIds.length) {
    const rows = pillarIds.map((pid) => ({
      sermon_id: sermonId,
      pillar_id: pid,
      source: 'manual',
      confidence_score: 1.0,
    }));

    const { error: upsertError } = await supabase
      .from('sermon_pillars')
      .upsert(rows, { onConflict: 'sermon_id,pillar_id' });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }
  }

  const { error: logError } = await supabase.from('admin_review_log').insert({
    sermon_id: sermonId,
    action: reviewStatus,
    notes: '',
  });

  if (logError) {
    return res.status(500).json({ error: logError.message });
  }

  return res.status(200).json({ ok: true });
}

