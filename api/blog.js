import { getAdminSession, requireAdminSession } from '../lib/server/admin-auth.js';
import { createSupabaseAdminClient } from '../lib/server/spotify.js';
import { getPostHogClient } from '../lib/server/posthog.js';
import { deriveEmbedUrl } from '../src/lib/embedUrl.js';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdminClient();
  }
  return supabaseClient;
}

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

function parseTags(input) {
  const raw = Array.isArray(input) ? input : [];
  const cleaned = raw.map((tag) => String(tag || '').trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

function parsePostId(input) {
  const id = String(input || '').trim();
  if (!id) {
    throw new Error('id is required');
  }
  return id;
}

function parsePostFields(input) {
  const title = String(input?.title || '').trim();
  if (!title) {
    throw new Error('title is required');
  }

  const contentType = input?.content_type === 'clip' ? 'clip' : 'article';
  const excerpt = String(input?.excerpt || '').trim() || null;
  const coverImageUrl = String(input?.cover_image_url || '').trim() || null;
  const pillarId = String(input?.pillar_id || '').trim() || null;
  const tags = parseTags(input?.tags);
  const slugInput = String(input?.slug || '').trim();

  const fields = {
    title,
    content_type: contentType,
    excerpt,
    cover_image_url: coverImageUrl,
    pillar_id: pillarId,
    tags,
    body: null,
    platform: null,
    external_url: null,
    embed_url: null,
  };

  if (contentType === 'article') {
    fields.body = String(input?.body || '').trim() || null;
  } else {
    const platform = String(input?.platform || '').trim();
    if (!['youtube', 'instagram'].includes(platform)) {
      throw new Error('platform must be "youtube" or "instagram" for clips');
    }
    const externalUrl = String(input?.external_url || '').trim();
    if (!externalUrl) {
      throw new Error('external_url is required for clips');
    }
    const embedUrl = String(input?.embed_url || '').trim() || deriveEmbedUrl(platform, externalUrl);
    if (!embedUrl) {
      throw new Error('Could not derive an embed URL from that link');
    }

    fields.platform = platform;
    fields.external_url = externalUrl;
    fields.embed_url = embedUrl;
  }

  return { fields, slugInput };
}

function eventProperties(post) {
  return {
    post_id: post.id,
    content_type: post.content_type,
    slug: post.slug,
    title: post.title,
  };
}

async function handleList(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('posts')
    .select('*, pillars(*)')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data || []);
}

async function handleCreate(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let fields;
  let slugInput;
  try {
    ({ fields, slugInput } = parsePostFields(req.body));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }

  const slug = normalizeSlug(slugInput || fields.title);
  if (!slug) {
    return res.status(400).json({ error: 'A valid slug is required' });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ ...fields, slug, status: 'draft' })
    .select('*, pillars(*)')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A post with this slug already exists' });
    }
    return res.status(500).json({ error: error.message });
  }

  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  getPostHogClient().capture({
    distinctId,
    event: 'blog_post_created',
    properties: eventProperties(data),
  });
  return res.status(201).json(data);
}

async function handleUpdate(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let id;
  let fields;
  let slugInput;
  try {
    id = parsePostId(req.body?.id);
    ({ fields, slugInput } = parsePostFields(req.body));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }

  const updateFields = { ...fields };
  if (slugInput) {
    const slug = normalizeSlug(slugInput);
    if (!slug) {
      return res.status(400).json({ error: 'A valid slug is required' });
    }
    updateFields.slug = slug;
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updateFields)
    .eq('id', id)
    .select('*, pillars(*)')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A post with this slug already exists' });
    }
    return res.status(500).json({ error: error.message });
  }

  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  getPostHogClient().capture({
    distinctId,
    event: 'blog_post_updated',
    properties: eventProperties(data),
  });
  return res.status(200).json(data);
}

async function setPublishStatus(req, res, status) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let id;
  try {
    id = parsePostId(req.body?.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }

  const updateFields = {
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('posts')
    .update(updateFields)
    .eq('id', id)
    .select('*, pillars(*)')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  if (status === 'published') {
    getPostHogClient().capture({
      distinctId,
      event: 'blog_post_published',
      properties: eventProperties(data),
    });
  }
  return res.status(200).json(data);
}

async function handleDelete(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  if (!requireAdminSession(req, res)) return;
  const supabase = getSupabase();

  let id;
  try {
    id = parsePostId(req.body?.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return res.status(400).json({ error: message });
  }

  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const session = getAdminSession(req);
  const distinctId = session?.email || 'admin';
  getPostHogClient().capture({
    distinctId,
    event: 'blog_post_deleted',
    properties: eventProperties(data),
  });
  return res.status(200).json({ ok: true, id });
}

export default async function handler(req, res) {
  try {
    const action = getAction(req);

    switch (action) {
      case 'list':
        return handleList(req, res);
      case 'create':
        return handleCreate(req, res);
      case 'update':
        return handleUpdate(req, res);
      case 'publish':
        return setPublishStatus(req, res, 'published');
      case 'unpublish':
        return setPublishStatus(req, res, 'draft');
      case 'delete':
        return handleDelete(req, res);
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
