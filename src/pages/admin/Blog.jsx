import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import {
  createAdminPost,
  deleteAdminPost,
  getAdminPillars,
  getAdminPosts,
  publishAdminPost,
  unpublishAdminPost,
  updateAdminPost,
} from '../../lib/queries';
import PostForm from '../../components/admin/PostForm';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [postsData, pillarsData] = await Promise.all([getAdminPosts(), getAdminPillars()]);
      setPosts(postsData);
      setPillars(pillarsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingPost(null);
    setError(null);
    setNotice(null);
    setShowForm(true);
  }

  function openEditForm(post) {
    setEditingPost(post);
    setError(null);
    setNotice(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPost(null);
  }

  async function handleSubmit(payload) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingPost) {
        const updated = await updateAdminPost({ id: editingPost.id, ...payload });
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setNotice(`Post "${updated.title}" updated.`);
      } else {
        const created = await createAdminPost(payload);
        setPosts((prev) => [created, ...prev]);
        setNotice(`Post "${created.title}" created as a draft.`);
      }
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(post) {
    setBusyId(post.id);
    setError(null);
    setNotice(null);
    try {
      const updated = post.status === 'published'
        ? await unpublishAdminPost(post.id)
        : await publishAdminPost(post.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setNotice(`Post "${updated.title}" ${updated.status === 'published' ? 'published' : 'unpublished'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(post) {
    const confirmed = window.confirm(`Delete "${post.title}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    setBusyId(post.id);
    setError(null);
    setNotice(null);
    try {
      await deleteAdminPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (editingPost?.id === post.id) closeForm();
      setNotice('Post deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (typeFilter !== 'all' && post.content_type !== typeFilter) return false;
      return true;
    });
  }, [posts, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary font-ui mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              Blog
            </h1>
            <p className="text-sm text-muted font-ui mt-1">
              Manage articles and clips published to /blog.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors self-start"
            >
              <Plus size={14} />
              New Post
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text-main font-ui">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-muted hover:text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <PostForm
              post={editingPost}
              pillars={pillars}
              saving={saving}
              error={error}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </div>
        )}

        {!showForm && notice && (
          <p className="text-sm text-green-700 font-ui mb-4">{notice}</p>
        )}
        {!showForm && error && (
          <p className="text-sm text-red-600 font-ui mb-4">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['all', 'draft', 'published'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-ui font-medium transition-colors capitalize"
              style={
                statusFilter === s
                  ? { backgroundColor: '#2A1004', color: 'white' }
                  : { border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }
              }
            >
              {s}
            </button>
          ))}
          <span className="mx-1 opacity-30">|</span>
          {['all', 'article', 'clip'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded-full text-xs font-ui font-medium transition-colors capitalize"
              style={
                typeFilter === t
                  ? { backgroundColor: '#2A1004', color: 'white' }
                  : { border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }
              }
            >
              {t === 'all' ? 'all types' : `${t}s`}
            </button>
          ))}
        </div>

        <div className="bg-card-bg rounded-2xl p-4 sm:p-6 shadow-soft border border-amber-50">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-amber-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-10 text-muted font-ui">No posts match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-ui">
                <thead>
                  <tr className="border-b border-amber-100 text-left">
                    <th className="py-2 pr-4 text-muted font-medium">Title</th>
                    <th className="py-2 pr-4 text-muted font-medium hidden sm:table-cell">Type</th>
                    <th className="py-2 pr-4 text-muted font-medium">Status</th>
                    <th className="py-2 pr-4 text-muted font-medium hidden lg:table-cell">Updated</th>
                    <th className="py-2 text-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((post) => (
                    <tr key={post.id} className="border-b border-amber-50 hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-text-main line-clamp-1">{post.title}</span>
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell text-muted capitalize">{post.content_type}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-xs font-ui font-medium px-2 py-0.5 rounded-full capitalize"
                          style={
                            post.status === 'published'
                              ? { backgroundColor: 'rgba(34,142,79,0.12)', color: '#1f7a45' }
                              : { backgroundColor: 'rgba(180,130,70,0.12)', color: '#9A7A5A' }
                          }
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell text-muted">{formatDate(post.updated_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(post)}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(post)}
                            disabled={busyId === post.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-ui font-medium rounded-md bg-amber-50 text-muted hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {post.status === 'published' ? <EyeOff size={12} /> : <Eye size={12} />}
                            {post.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post)}
                            disabled={busyId === post.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-ui font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
