import {
  clearAdminSessionCookie,
  getAdminSession,
  requireAdminSession,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from '../lib/server/admin-auth.js';
import { createSupabaseAdminClient } from '../lib/server/spotify.js';
import { getPostHogClient } from '../lib/server/posthog.js';

const VALID_REVIEW_STATUSES = new Set(['approved', 'rejected', 'unreviewed']);
let supabaseClient = null;

function getAction(req) {
  const action = req.query?.action;
  return Array.isArray(action) ? action[0] : action;
}

function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

function parsePillarPayload(input) {
  const name = String(input?.name || '').trim();
  const requestedSlug = String(input?.slug || '').trim();
  const slug = normalizeSlug(requestedSlug || name);
  const description = String(input?.description || '').trim();
  const icon = String(input?.icon || '').trim() || null;
  const colorInput = String(input?.color || '').trim();
  const color = /^#[0-9A-Fa-f]{6}$/.test(colorInput) ? colorInput.toUpperCase() : '#8B4513';

  if (!name) {
    throw new Error('name is required');
  }
  if (!slug) {
    throw new Error('A valid slug is required');
  }

  return { name, slug, description, icon, color };
}

function parsePillarId(input) {
  const id = String(input || '').trim();
  if (!id) {
    throw new Error('id is required');
  }
  return id;
}

function parseSermonId(input) {
  const id = String(input || '').trim();
  if (!id) {
    throw new Error('id is required');
  }
  return id;
}

function parseReviewPayload(input) {
  const sermonId = String(input?.sermonId || '').trim();
  const reviewStatus = String(input?.reviewStatus || '').trim();
  const preacher = input?.preacher ?? '';
  const church = input?.church ?? '';
  const description = input?.description ?? '';
  const hasCustomTitle = Object.prototype.hasOwnProperty.call(input || {}, 'customTitle');
  const normalizedCustomTitle = String(input?.customTitle ?? '').trim();
  const customTitle = normalizedCustomTitle || null;
  const rawPillarIds = Array.isArray(input?.pillarIds) ? input.pillarIds : [];
  const pillarIds = [...new Set(rawPillarIds.filter(Boolean))];

  if (!sermonId) {
    throw new Error('sermonId is required');
  }
  if (!VALID_REVIEW_STATUSES.has(reviewStatus)) {
    throw new Error('Invalid reviewStatus');
  }

  return {
    sermonId,
    reviewStatus,
    preacher,
    church,
    description,
    customTitle,
    hasCustomTitle,
    pillarIds,
  };
}

async function applyReviewDecision(supabase, payload) {
  const {
    sermonId,
    reviewStatus,
    preacher,
    church,
    description,
    customTitle,
    hasCustomTitle,
    pillarIds,
  } = payload;
  const updateFields = {
    review_status: reviewStatus,
    preacher,
    church,
    description,
    updated_at: new Date().toISOString(),
  };
  if (hasCustomTitle) {
    updateFields.custom_title = customTitle;
  }

  const { error: updateError } = await supabase
    .from('sermons')
    .update(updateFields)
    .eq('id', sermonId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const pillarDeleteQuery = supabase
    .from('sermon_pillars')
    .delete()
    .eq('sermon_id', sermonId);

  // Approved sermons should have deterministic, admin-owned themes only.
  // For other review states, keep existing model suggestions and replace manual rows only.
  if (reviewStatus !== 'approved') {
    pillarDeleteQuery.eq('source', 'manual');
  }

  const { error: deleteError } = await pillarDeleteQuery;

  if (deleteError) {
    throw new Error(deleteError.message);
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
      throw new Error(upsertError.message);
    }
  }

  const { error: logError } = await supabase.from('admin_review_log').insert({
    sermon_id: sermonId,
    action: reviewStatus,
    notes: '',
  });

  if (logError) {
    throw new Error(logError.message);
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!verifyAdminCredentials(email, password)) {
    getPostHogClient().capture({
      distinctId: email,
      event: 'admin_login_failed',
      properties: { email },
    });
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  setAdminSessionCookie(req, res, email);
  getPostHogClient().identify({
    distinctId: email,
    properties: { $set: { email, role: 'admin' } },
  });
  getPostHogClient().capture({
    distinctId: email,
    event: 'admin_logged_in',
    properties: { email },
  });
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
  const supabase = getSupabase();

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
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('spotify_shows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('spotify_shows')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().capture({
      distinctId,
      event: 'show_removed',
      properties: { show_id: id },
    });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res);
}

async function handlePillars(req, res) {
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pillars')
      .select('*')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    let payload;
    try {
      payload = parsePillarPayload(req.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      return res.status(400).json({ error: message });
    }

    const { data, error } = await supabase
      .from('pillars')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A theme with this name or slug already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().capture({
      distinctId,
      event: 'pillar_created',
      properties: { pillar_id: data.id, name: data.name, slug: data.slug },
    });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    let id;
    let payload;

    try {
      id = parsePillarId(req.body?.id);
      payload = parsePillarPayload(req.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      return res.status(400).json({ error: message });
    }

    const { data, error } = await supabase
      .from('pillars')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A theme with this name or slug already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().capture({
      distinctId,
      event: 'pillar_updated',
      properties: { pillar_id: data.id, name: data.name, slug: data.slug },
    });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    let id;
    try {
      id = parsePillarId(req.query?.id || req.body?.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      return res.status(400).json({ error: message });
    }

    const { count, error: countError } = await supabase
      .from('sermon_pillars')
      .select('sermon_id', { count: 'exact', head: true })
      .eq('pillar_id', id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: 'This theme is assigned to sermons. Remove or retag those sermons before deleting.',
      });
    }

    const { error } = await supabase
      .from('pillars')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().capture({
      distinctId,
      event: 'pillar_deleted',
      properties: { pillar_id: id },
    });
    return res.status(200).json({ ok: true, id });
  }

  return methodNotAllowed(res);
}

async function handleIngestionRuns(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

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
  const supabase = getSupabase();

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

async function handleApprovedSermons(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  const requestedLimit = Number(req.query?.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(Math.floor(requestedLimit), 100)
    : 50;

  const requestedOffset = Number(req.query?.offset);
  const offset = Number.isFinite(requestedOffset) && requestedOffset >= 0
    ? Math.floor(requestedOffset)
    : 0;

  const { data, error, count } = await supabase
    .from('sermons')
    .select('id, title, custom_title, preacher, church, created_at, updated_at', { count: 'exact' })
    .eq('review_status', 'approved')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ sermons: data || [], total: count ?? 0 });
}

async function handleSermon(req, res) {
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  if (req.method === 'GET') {
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

  if (req.method === 'DELETE') {
    let id;
    try {
      id = parseSermonId(req.query?.id || req.body?.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      return res.status(400).json({ error: message });
    }

    const { error } = await supabase
      .from('sermons')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().capture({
      distinctId,
      event: 'sermon_deleted',
      properties: { sermon_id: id },
    });
    return res.status(200).json({ ok: true, id });
  }

  return methodNotAllowed(res);
}

async function handleReviewSermon(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();
  let payload;
  try {
    payload = parseReviewPayload(req.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }

  await applyReviewDecision(supabase, payload);
  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  getPostHogClient().capture({
    distinctId,
    event: 'sermon_reviewed',
    properties: {
      sermon_id: payload.sermonId,
      review_status: payload.reviewStatus,
      pillar_count: payload.pillarIds.length,
      preacher: payload.preacher,
      church: payload.church,
    },
  });
  return res.status(200).json({ ok: true });
}

async function handleReviewSermonsBulk(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ error: 'items is required' });
  }

  const results = [];

  for (const item of items) {
    try {
      const payload = parseReviewPayload(item);
      await applyReviewDecision(supabase, payload);
      results.push({ sermonId: payload.sermonId, ok: true });
    } catch (err) {
      const sermonId = String(item?.sermonId || '').trim() || null;
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      results.push({ sermonId, ok: false, error: message });
    }
  }

  const failed = results.filter((result) => !result.ok);
  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  getPostHogClient().capture({
    distinctId,
    event: 'sermons_reviewed_bulk',
    properties: {
      processed: results.length,
      failed: failed.length,
      succeeded: results.length - failed.length,
    },
  });
  return res.status(200).json({
    ok: failed.length === 0,
    processed: results.length,
    failed: failed.length,
    results,
  });
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
      case 'pillars':
        return handlePillars(req, res);
      case 'ingestion-runs':
        return handleIngestionRuns(req, res);
      case 'pending-sermons':
        return handlePendingSermons(req, res);
      case 'approved-sermons':
        return handleApprovedSermons(req, res);
      case 'sermon':
        return handleSermon(req, res);
      case 'review-sermon':
        return handleReviewSermon(req, res);
      case 'review-sermons-bulk':
        return handleReviewSermonsBulk(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    const session = getAdminSession(req);
    const distinctId = session?.email || 'admin';
    getPostHogClient().captureException(err, distinctId);
    return res.status(500).json({ error: message });
  }
}
