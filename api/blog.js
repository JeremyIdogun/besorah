import { getAdminSession, requireAdminSession } from '../lib/server/admin-auth.js';
import { createSupabaseAdminClient } from '../lib/server/spotify.js';
import { getPostHogClient } from '../lib/server/posthog.js';
import { deriveEmbedUrl } from '../src/lib/embedUrl.js';
import { slugify } from '../src/lib/slug.js';
import { estimateReadTime } from '../src/lib/readTime.js';

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

function parseTags(input) {
  const raw = Array.isArray(input) ? input : [];
  const cleaned = raw.map((tag) => String(tag || '').trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePostId(input) {
  const id = String(input || '').trim();
  if (!id) {
    throw new Error('id is required');
  }
  if (!UUID_RE.test(id)) {
    throw new Error('id must be a valid UUID');
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
  if (pillarId && !UUID_RE.test(pillarId)) {
    throw new Error('pillar_id must be a valid UUID');
  }
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
    read_time_minutes: null,
  };

  if (contentType === 'article') {
    fields.body = String(input?.body || '').trim() || null;
    fields.read_time_minutes = estimateReadTime(fields.body);
  } else {
    const platform = String(input?.platform || '').trim();
    if (!['youtube', 'instagram'].includes(platform)) {
      throw new Error('platform must be "youtube" or "instagram" for clips');
    }
    const externalUrl = String(input?.external_url || '').trim();
    if (!externalUrl) {
      throw new Error('external_url is required for clips');
    }
    // Always derive on the server; never trust a client-supplied embed_url,
    // since it becomes the src of a public iframe.
    const embedUrl = deriveEmbedUrl(platform, externalUrl);
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

function distinctIdFor(session) {
  return session?.email || 'admin';
}

function badRequest(res, err) {
  const message = err instanceof Error ? err.message : 'Invalid request';
  return res.status(400).json({ error: message });
}

function notFound(res) {
  return res.status(404).json({ error: 'Post not found' });
}

function slugConflict(res) {
  return res.status(409).json({ error: 'A post with this slug already exists' });
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
  const session = requireAdminSession(req, res);
  if (!session) return;
  const supabase = getSupabase();

  let fields;
  let slugInput;
  try {
    ({ fields, slugInput } = parsePostFields(req.body));
  } catch (err) {
    return badRequest(res, err);
  }

  const slug = slugify(slugInput || fields.title);
  if (!slug) {
    return res.status(400).json({ error: 'A valid slug is required' });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ ...fields, slug, status: 'draft' })
    .select('*, pillars(*)')
    .single();

  if (error) {
    if (error.code === '23505') return slugConflict(res);
    return res.status(500).json({ error: error.message });
  }

  getPostHogClient().capture({
    distinctId: distinctIdFor(session),
    event: 'blog_post_created',
    properties: eventProperties(data),
  });
  return res.status(201).json(data);
}

async function handleUpdate(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const session = requireAdminSession(req, res);
  if (!session) return;
  const supabase = getSupabase();

  let id;
  let fields;
  let slugInput;
  try {
    id = parsePostId(req.body?.id);
    ({ fields, slugInput } = parsePostFields(req.body));
  } catch (err) {
    return badRequest(res, err);
  }

  const updateFields = { ...fields };
  if (slugInput) {
    const slug = slugify(slugInput);
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
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return slugConflict(res);
    return res.status(500).json({ error: error.message });
  }
  if (!data) return notFound(res);

  getPostHogClient().capture({
    distinctId: distinctIdFor(session),
    event: 'blog_post_updated',
    properties: eventProperties(data),
  });
  return res.status(200).json(data);
}

async function setPublishStatus(req, res, status) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const session = requireAdminSession(req, res);
  if (!session) return;
  const supabase = getSupabase();

  let id;
  try {
    id = parsePostId(req.body?.id);
  } catch (err) {
    return badRequest(res, err);
  }

  // Keep the original publication date across unpublish/republish cycles.
  // Public visibility is gated on status, so unpublishing leaves published_at
  // untouched, and publishing only stamps it the first time.
  const { data: existing, error: fetchError } = await supabase
    .from('posts')
    .select('published_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }
  if (!existing) return notFound(res);

  const updateFields = { status };
  if (status === 'published' && !existing.published_at) {
    updateFields.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updateFields)
    .eq('id', id)
    .select('*, pillars(*)')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) return notFound(res);

  if (status === 'published') {
    getPostHogClient().capture({
      distinctId: distinctIdFor(session),
      event: 'blog_post_published',
      properties: eventProperties(data),
    });
  }
  return res.status(200).json(data);
}

async function handleDelete(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const session = requireAdminSession(req, res);
  if (!session) return;
  const supabase = getSupabase();

  let id;
  try {
    id = parsePostId(req.body?.id);
  } catch (err) {
    return badRequest(res, err);
  }

  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) return notFound(res);

  getPostHogClient().capture({
    distinctId: distinctIdFor(session),
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
        return await handleList(req, res);
      case 'create':
        return await handleCreate(req, res);
      case 'update':
        return await handleUpdate(req, res);
      case 'publish':
        return await setPublishStatus(req, res, 'published');
      case 'unpublish':
        return await setPublishStatus(req, res, 'draft');
      case 'delete':
        return await handleDelete(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    getPostHogClient().captureException(err, distinctIdFor(getAdminSession(req)));
    return res.status(500).json({ error: message });
  }
}
