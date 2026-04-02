import { supabase } from './supabase';

function sourceRank(source) {
  return source === 'manual' ? 0 : 1;
}

function withStablePillarOrder(sermon) {
  if (!sermon || !Array.isArray(sermon.sermon_pillars)) return sermon;
  return {
    ...sermon,
    sermon_pillars: [...sermon.sermon_pillars].sort((a, b) => {
      const sourceDiff = sourceRank(a?.source) - sourceRank(b?.source);
      if (sourceDiff !== 0) return sourceDiff;

      const confidenceA = Number(a?.confidence_score ?? 0);
      const confidenceB = Number(b?.confidence_score ?? 0);
      if (confidenceA !== confidenceB) return confidenceB - confidenceA;

      const nameA = String(a?.pillars?.name || '');
      const nameB = String(b?.pillars?.name || '');
      return nameA.localeCompare(nameB);
    }),
  };
}

function withDisplayTitle(sermon, { preserveSourceTitle = false } = {}) {
  if (!sermon) return sermon;
  const stableSermon = withStablePillarOrder(sermon);
  const customTitle = typeof sermon.custom_title === 'string' ? sermon.custom_title.trim() : '';
  const sourceTitle = stableSermon.title;

  if (!customTitle) {
    if (preserveSourceTitle) {
      return { ...stableSermon, source_title: sourceTitle };
    }
    return stableSermon;
  }

  const next = {
    ...stableSermon,
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

export async function getRelatedSermons(sermonId, pillarId, limit = 3) {
  if (!pillarId) return [];
  const { data, error } = await supabase
    .from('sermon_pillars')
    .select('sermons!inner(*)')
    .eq('pillar_id', pillarId)
    .eq('sermons.review_status', 'approved')
    .neq('sermons.id', sermonId)
    .limit(limit);
  if (error) throw error;
  return data
    .map((row) => withDisplayTitle(row.sermons))
    .filter(Boolean);
}

// ── View tracking ────────────────────────────────────────────────────────────

export async function logSermonView(sermonId, viewType = 'page_view') {
  try {
    const { error } = await supabase
      .from('sermon_views')
      .insert({ sermon_id: sermonId, view_type: viewType });

    if (error) {
      throw error;
    }
  } catch {
    // Analytics should never interrupt the user journey.
  }
}

export async function getPopularSermons(limit = 3) {
  const { data, error } = await supabase.rpc('get_popular_sermons', { lim: limit });
  if (error) throw error;
  return (data || []).map((sermon) => withDisplayTitle(sermon));
}

// ── Admin queries ─────────────────────────────────────────────────────────────

async function adminFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    ...options,
  });

  let raw = '';
  try {
    raw = await res.text();
  } catch {
    raw = '';
  }

  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (data?.error) {
      throw new Error(data.error);
    }

    if (raw && !raw.trim().startsWith('<')) {
      throw new Error(raw.trim().slice(0, 240));
    }

    const fallback =
      res.status === 401
        ? 'Admin login required'
        : `Admin request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ''})`;
    throw new Error(fallback);
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

export async function getYouTubePlaylists() {
  return adminFetch('/api/youtube?action=playlists');
}

export async function importYouTubePlaylist(playlistId) {
  return adminFetch('/api/youtube?action=import-playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId }),
  });
}

export async function syncYouTubePlaylist(playlistId) {
  return adminFetch('/api/youtube?action=sync-playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId }),
  });
}

export async function deleteYouTubePlaylist(id) {
  return adminFetch('/api/youtube?action=playlists', {
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

export async function updateAdminPillar({ id, name, slug, description, icon, color }) {
  return adminFetch('/api/admin/pillars', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name,
      slug,
      description,
      icon,
      color,
    }),
  });
}

export async function deleteAdminPillar(id) {
  return adminFetch(`/api/admin/pillars?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
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

export async function deleteAdminSermon(id) {
  return adminFetch(`/api/admin/sermon?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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
