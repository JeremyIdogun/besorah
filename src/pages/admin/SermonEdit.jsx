import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteAdminSermon, getAdminSermonById, saveAdminSermonReview } from '../../lib/queries';
import TagSelector from '../../components/admin/TagSelector';
import { ArrowLeft, Save, Check, Trash2 } from 'lucide-react';

export default function SermonEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sermon, setSermon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ customTitle: '', preacher: '', church: '', description: '' });
  const [selectedPillarIds, setSelectedPillarIds] = useState([]);
  const prefersApprovedReturn = searchParams.get('returnTo') === 'approved';
  const isApprovedSermon = sermon?.review_status === 'approved';
  const backPath = (prefersApprovedReturn || isApprovedSermon) ? '/admin/approved' : '/admin/review';
  const backLabel = backPath === '/admin/approved' ? 'Approved Sermons' : 'Review Queue';

  useEffect(() => {
    getAdminSermonById(id)
      .then((s) => {
        setSermon(s);
        setForm({
          customTitle: s.custom_title || '',
          preacher: s.preacher || '',
          church: s.church || '',
          description: s.description || '',
        });
        const pillarIds = s.sermon_pillars?.map((sp) => sp.pillar_id) ?? [];
        setSelectedPillarIds(pillarIds);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(reviewStatus) {
    setSaving(true);
    setError(null);
    try {
      await saveAdminSermonReview({
        sermonId: id,
        reviewStatus,
        ...form,
        pillarIds: selectedPillarIds,
      });
      setSaved(true);
      setTimeout(() => navigate(backPath), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const title = sermon?.title || 'this sermon';
    const confirmed = window.confirm(`Delete "${title}" permanently from the app? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteAdminSermon(id);
      navigate(backPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="h-8 w-64 bg-amber-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-amber-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error && !sermon) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted font-ui">{error}</p>
        <Link to={backPath} className="text-accent text-sm font-ui hover:text-primary">← Back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary font-ui mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>

        <h1
          className="text-2xl font-bold mb-6 leading-snug"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          {sermon?.title}
        </h1>

        <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Display Title</label>
            <input
              type="text"
              value={form.customTitle}
              onChange={(e) => setForm((f) => ({ ...f, customTitle: e.target.value }))}
              placeholder={sermon?.source_title || 'Use Spotify title'}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-muted font-ui">
              Leave blank to use Spotify title. This title is what users will see.
            </p>
            {sermon?.source_title && (
              <p className="mt-1 text-xs text-muted font-ui">
                Spotify title: {sermon.source_title}
              </p>
            )}
          </div>

          {/* Metadata fields */}
          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Preacher</label>
            <input
              type="text"
              value={form.preacher}
              onChange={(e) => setForm((f) => ({ ...f, preacher: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Church</label>
            <input
              type="text"
              value={form.church}
              onChange={(e) => setForm((f) => ({ ...f, church: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Tag selector */}
          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-3">Pillar Tags</label>
            <TagSelector
              selected={selectedPillarIds}
              onChange={setSelectedPillarIds}
              source="admin"
            />
          </div>

          {error && <p className="text-sm text-red-600 font-ui">{error}</p>}
          {saved && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-ui">
              <Check size={14} />
              Saved — redirecting…
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {isApprovedSermon ? (
              <button
                onClick={() => handleSave('approved')}
                disabled={saving || deleting}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                Save Changes
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave('approved')}
                  disabled={saving || deleting}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {saving ? null : <Check size={14} />}
                  Approve
                </button>
                <button
                  onClick={() => handleSave('rejected')}
                  disabled={saving || deleting}
                  className="flex items-center gap-2 px-5 py-2 bg-red-100 text-red-700 text-sm font-ui font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleSave('unreviewed')}
                  disabled={saving || deleting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-50 text-muted text-sm font-ui font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  Save & Keep Pending
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-700 text-sm font-ui font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting...' : 'Delete Sermon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
