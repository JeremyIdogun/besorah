import { supabase } from './supabase';

// ── Public queries ────────────────────────────────────────────────────────────

export async function getPillars() {
  const { data, error } = await supabase
    .from('pillars')
    .select('*, sermon_pillars(sermon_id)')
    .order('name');
  if (error) throw error;
  return data.map((p) => ({ ...p, sermon_count: p.sermon_pillars?.length ?? 0 }));
}

export async function getPillarBySlug(slug) {
  const { data, error } = await supabase
    .from('pillars')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getSermonsByPillar(pillarId) {
  const { data, error } = await supabase
    .from('sermon_pillars')
    .select('sermons!inner(*)')
    .eq('pillar_id', pillarId)
    .eq('sermons.review_status', 'approved');
  if (error) throw error;
  return data
    .map((row) => row.sermons)
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function searchSermons(query) {
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from('sermons')
    .select('*')
    .eq('review_status', 'approved')
    .or(`title.ilike.${q},preacher.ilike.${q},church.ilike.${q},description.ilike.${q}`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function getSermonById(id) {
  const { data, error } = await supabase
    .from('sermons')
    .select('*, sermon_pillars(pillar_id, source, confidence_score, pillars(*))')
    .eq('id', id)
    .eq('review_status', 'approved')
    .single();
  if (error) throw error;
  return data;
}

export async function getLatestSermons(limit = 6) {
  const { data, error } = await supabase
    .from('sermons')
    .select('*')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ── Admin queries ─────────────────────────────────────────────────────────────

async function adminFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const fallback = res.status === 401 ? 'Admin login required' : 'Admin request failed';
    throw new Error(data?.error || fallback);
  }

  return data;
}

export async function getSpotifyShows() {
  return adminFetch('/api/admin/shows');
}

export async function getAdminPillars() {
  return adminFetch('/api/admin/pillars');
}

export async function getIngestionRuns(limit = 10) {
  return adminFetch(`/api/admin/ingestion-runs?limit=${encodeURIComponent(limit)}`);
}

export async function getPendingReviewSermons() {
  return adminFetch('/api/admin/pending-sermons');
}

export async function getAdminSermonById(id) {
  return adminFetch(`/api/admin/sermon?id=${encodeURIComponent(id)}`);
}

export async function getAdminStats() {
  return adminFetch('/api/admin/stats');
}

export async function saveAdminSermonReview({
  sermonId,
  reviewStatus,
  preacher,
  church,
  description,
  pillarIds,
}) {
  return adminFetch('/api/admin/review-sermon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sermonId,
      reviewStatus,
      preacher,
      church,
      description,
      pillarIds,
    }),
  });
}

export async function saveAdminSermonReviewsBulk(items) {
  return adminFetch('/api/admin/review-sermons-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}
