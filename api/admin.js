import {
  clearAdminSessionCookie,
  getAdminSession,
  requireAdminSession,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from '../lib/server/admin-auth.js';
import { createSupabaseAdminClient } from '../lib/server/spotify.js';

const supabase = createSupabaseAdminClient();
const VALID_REVIEW_STATUSES = new Set(['approved', 'rejected', 'unreviewed']);

function getAction(req) {
  const action = req.query?.action;
  return Array.isArray(action) ? action[0] : action;
}

function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!verifyAdminCredentials(email, password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  setAdminSessionCookie(req, res, email);
  return res.status(200).json({ ok: true });
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  clearAdminSessionCookie(req, res);
  return res.status(200).json({ ok: true });
}

async function handleSession(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const session = getAdminSession(req);
  return res.status(200).json({
    authenticated: Boolean(session),
    email: session?.email || null,
  });
}

async function handleStats(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
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

async function handleShows(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
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

async function handleIngestionRuns(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
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

async function handlePendingSermons(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;

  const { data, error } = await supabase
    .from('sermons')
    .select('*, sermon_pillars(pillar_id, source, confidence_score, pillars(*))')
    .eq('review_status', 'unreviewed')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data || []);
}

async function handleSermon(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
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

async function handleReviewSermon(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
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

export default async function handler(req, res) {
  try {
    const action = getAction(req);

    switch (action) {
      case 'login':
        return handleLogin(req, res);
      case 'logout':
        return handleLogout(req, res);
      case 'session':
        return handleSession(req, res);
      case 'stats':
        return handleStats(req, res);
      case 'shows':
        return handleShows(req, res);
      case 'ingestion-runs':
        return handleIngestionRuns(req, res);
      case 'pending-sermons':
        return handlePendingSermons(req, res);
      case 'sermon':
        return handleSermon(req, res);
      case 'review-sermon':
        return handleReviewSermon(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
}
