import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { createAdminPillar, getAdminPillars } from '../../lib/queries';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Themes() {
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '#8B4513',
  });

  useEffect(() => {
    loadPillars();
  }, []);

  async function loadPillars() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPillars();
      setPillars(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNameChange(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugEdited ? prev.slug : slugify(value),
    }));
  }

  async function handleCreateTheme(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        name: form.name,
        slug: slugify(form.slug || form.name),
        description: form.description,
        icon: form.icon,
        color: form.color,
      };

      const created = await createAdminPillar(payload);
      setPillars((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice(`Theme "${created.name}" created.`);
      setForm({
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '#8B4513',
      });
      setSlugEdited(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

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

        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Manage Themes
        </h1>
        <p className="text-sm text-muted font-ui mb-8">
          Create new sermon themes directly from admin.
        </p>

        <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 mb-8">
          <h2 className="text-base font-bold text-text-main font-ui mb-4">Create New Theme</h2>

          <form onSubmit={handleCreateTheme} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-main font-ui mb-1">Theme Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Evangelism"
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
                placeholder="e.g. evangelism"
                className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main font-ui mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Sermons on..."
                className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main font-ui mb-1">Color (Hex)</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#8B4513"
                  className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main font-ui mb-1">Icon (optional)</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g. ✨"
                  className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-ui">{error}</p>}
            {notice && <p className="text-sm text-green-700 font-ui">{notice}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              {saving ? 'Creating...' : 'Create Theme'}
            </button>
          </form>
        </div>

        <h2
          className="text-lg font-bold mb-4"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Existing Themes
        </h2>

        <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-amber-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !pillars.length ? (
            <p className="text-muted font-ui text-sm">No themes yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pillars.map((pillar) => (
                <span
                  key={pillar.id}
                  className="text-xs px-3 py-1.5 rounded-full font-ui font-medium border"
                  style={{
                    color: pillar.color || '#8B4513',
                    borderColor: pillar.color || '#8B4513',
                    backgroundColor: `${pillar.color || '#8B4513'}1A`,
                  }}
                >
                  {pillar.icon ? `${pillar.icon} ` : ''}{pillar.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
