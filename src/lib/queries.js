import { supabase } from './supabase';

function withDisplayTitle(sermon, { preserveSourceTitle = false } = {}) {
  if (!sermon) return sermon;
  const customTitle = typeof sermon.custom_title === 'string' ? sermon.custom_title.trim() : '';
  const sourceTitle = sermon.title;

  if (!customTitle) {
    if (preserveSourceTitle) {
      return { ...sermon, source_title: sourceTitle };
    }
    return sermon;
  }

  const next = {
    ...sermon,
    title: customTitle,
  };
  if (preserveSourceTitle) {
    next.source_title = sourceTitle;
  }
  return next;
}

// ── Public queries ────────────────────────────────────────────────────────────

export async function getPillars() {
  const { data, error } = await supabase
    .from('pillars')
    .select('*, sermon_pillars(sermon_id, sermons(review_status))')
    .order('name');
  if (error) throw error;
  return data.map((p) => {
    const sermonCount = (p.sermon_pillars || []).filter((sp) => {
      const sermon = Array.isArray(sp.sermons) ? sp.sermons[0] : sp.sermons;
      return sermon?.review_status === 'approved';
    }).length;

    return { ...p, sermon_count: sermonCount };
  });
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
    .map((row) => withDisplayTitle(row.sermons))
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function searchSermons(query, { page = 1, pageSize = 20 } = {}) {
  const q = `%${query}%`;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from('sermons')
    .select('*', { count: 'exact' })
    .eq('review_status', 'approved')
    .or(`custom_title.ilike.${q},title.ilike.${q},preacher.ilike.${q},church.ilike.${q},description.ilike.${q}`)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    sermons: (data || []).map((sermon) => withDisplayTitle(sermon)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSermonById(id) {
  const { data, error } = await supabase
    .from('sermons')
    .select('*, sermon_pillars(pillar_id, source, confidence_score, pillars(*))')
    .eq('id', id)
    .eq('review_status', 'approved')
    .single();
  if (error) throw error;
  return withDisplayTitle(data);
}

export async function getLatestSermons(limit = 6) {
  const { data, error } = await supabase
    .from('sermons')
    .select('*')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((sermon) => withDisplayTitle(sermon));
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

export async function deleteSpotifyShow(id) {
  return adminFetch('/api/admin/shows', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

export async function getAdminPillars() {
  return adminFetch('/api/admin/pillars');
}

export async function createAdminPillar({ name, slug, description, icon, color }) {
  return adminFetch('/api/admin/pillars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      slug,
      description,
      icon,
      color,
    }),
  });
}

export async function getIngestionRuns(limit = 10) {
  return adminFetch(`/api/admin/ingestion-runs?limit=${encodeURIComponent(limit)}`);
}

export async function getPendingReviewSermons() {
  const data = await adminFetch('/api/admin/pending-sermons');
  return (data || []).map((sermon) => withDisplayTitle(sermon));
}

export async function getApprovedSermons({ page = 1, pageSize = 50 } = {}) {
  const offset = (page - 1) * pageSize;
  const data = await adminFetch(
    `/api/admin/approved-sermons?limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(offset)}`
  );
  return {
    sermons: (data.sermons || []).map((sermon) => withDisplayTitle(sermon)),
    total: data.total ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminSermonById(id) {
  const data = await adminFetch(`/api/admin/sermon?id=${encodeURIComponent(id)}`);
  return withDisplayTitle(data, { preserveSourceTitle: true });
}

export async function getAdminStats() {
  return adminFetch('/api/admin/stats');
}

export async function saveAdminSermonReview({
  sermonId,
  reviewStatus,
  customTitle,
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
      customTitle,
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
