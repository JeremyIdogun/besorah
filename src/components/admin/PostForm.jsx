import { useEffect, useState } from 'react';
import { PencilLine, Plus, X } from 'lucide-react';
import { deriveEmbedUrl } from '../../lib/embedUrl';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  contentType: 'article',
  excerpt: '',
  coverImageUrl: '',
  body: '',
  platform: 'youtube',
  externalUrl: '',
  embedUrl: '',
  pillarId: '',
  tags: '',
};

function postToForm(post) {
  if (!post) return EMPTY_FORM;
  return {
    title: post.title || '',
    slug: post.slug || '',
    contentType: post.content_type || 'article',
    excerpt: post.excerpt || '',
    coverImageUrl: post.cover_image_url || '',
    body: post.body || '',
    platform: post.platform || 'youtube',
    externalUrl: post.external_url || '',
    embedUrl: post.embed_url || '',
    pillarId: post.pillar_id || '',
    tags: (post.tags || []).join(', '),
  };
}

export default function PostForm({ post = null, pillars = [], saving = false, error = null, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => postToForm(post));
  const [slugEdited, setSlugEdited] = useState(Boolean(post));

  useEffect(() => {
    setForm(postToForm(post));
    setSlugEdited(Boolean(post));
  }, [post]);

  function handleTitleChange(value) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugEdited ? prev.slug : slugify(value),
    }));
  }

  function handleExternalUrlChange(value) {
    setForm((prev) => ({
      ...prev,
      externalUrl: value,
      embedUrl: deriveEmbedUrl(prev.platform, value) || '',
    }));
  }

  function handlePlatformChange(value) {
    setForm((prev) => ({
      ...prev,
      platform: value,
      embedUrl: deriveEmbedUrl(value, prev.externalUrl) || '',
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      title: form.title,
      slug: slugify(form.slug || form.title),
      contentType: form.contentType,
      excerpt: form.excerpt,
      coverImageUrl: form.coverImageUrl,
      body: form.contentType === 'article' ? form.body : '',
      platform: form.contentType === 'clip' ? form.platform : '',
      externalUrl: form.contentType === 'clip' ? form.externalUrl : '',
      embedUrl: form.contentType === 'clip' ? form.embedUrl : '',
      pillarId: form.pillarId || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  const isEditing = Boolean(post);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {['article', 'clip'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, contentType: type }))}
            className="px-4 py-1.5 rounded-full text-sm font-ui font-medium transition-colors capitalize"
            style={
              form.contentType === type
                ? { backgroundColor: '#2A1004', color: 'white' }
                : { border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }
            }
          >
            {type}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Walking in Grace"
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Slug</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => {
            setSlugEdited(true);
            setForm((prev) => ({ ...prev, slug: e.target.value }));
          }}
          placeholder="e.g. walking-in-grace"
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        {isEditing && (
          <p className="text-xs text-muted font-ui mt-1">Editing the slug changes this post's URL.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Excerpt</label>
        <textarea
          value={form.excerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
          rows={2}
          placeholder="One or two sentences for the card and search results"
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Cover Image URL</label>
        <input
          type="text"
          value={form.coverImageUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
          placeholder="https://..."
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {form.contentType === 'article' ? (
        <div>
          <label className="block text-sm font-medium text-text-main font-ui mb-1">Body (Markdown)</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            rows={16}
            placeholder="# Heading&#10;&#10;Write your article in Markdown..."
            className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent font-mono"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Platform</label>
            <div className="flex gap-2">
              {['youtube', 'instagram'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePlatformChange(p)}
                  className="px-4 py-1.5 rounded-full text-sm font-ui font-medium transition-colors capitalize"
                  style={
                    form.platform === p
                      ? { backgroundColor: '#2A1004', color: 'white' }
                      : { border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Video / Post URL</label>
            <input
              type="text"
              value={form.externalUrl}
              onChange={(e) => handleExternalUrlChange(e.target.value)}
              placeholder="Paste a YouTube or Instagram link"
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <p className="text-xs text-muted font-ui mt-1">
              {form.embedUrl ? `Embed derived: ${form.embedUrl}` : 'Paste a link to auto-derive the embed.'}
            </p>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Theme (optional)</label>
        <select
          value={form.pillarId}
          onChange={(e) => setForm((prev) => ({ ...prev, pillarId: e.target.value }))}
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent bg-white"
        >
          <option value="">No theme</option>
          {pillars.map((pillar) => (
            <option key={pillar.id} value={pillar.id}>
              {pillar.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-main font-ui mb-1">Tags (comma separated)</label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
          placeholder="grace, discipleship"
          className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {error && <p className="text-sm text-red-600 font-ui">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
        >
          {isEditing ? <PencilLine size={14} /> : <Plus size={14} />}
          {saving ? 'Saving...' : (isEditing ? 'Update Post' : 'Create Post')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-muted text-sm font-ui font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <X size={14} />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
