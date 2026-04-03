import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  deleteAdminSermon,
  getAdminPillars,
  getPendingReviewSermons,
  saveAdminSermonReview,
  saveAdminSermonReviewsBulk,
} from '../../lib/queries';
import ReviewQueueTable from '../../components/admin/ReviewQueueTable';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const PAGE_SIZE = 25;

export default function ReviewQueue() {
  const [sermons, setSermons] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [draftPillarIdsBySermonId, setDraftPillarIdsBySermonId] = useState({});
  const [selectedSermonIds, setSelectedSermonIds] = useState([]);
  const [savingBySermonId, setSavingBySermonId] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  const filteredSermons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sermons;

    return sermons.filter((sermon) => (
      [
        sermon.title,
        sermon.source_title,
        sermon.preacher,
        sermon.church,
        sermon.description,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    ));
  }, [sermons, query]);

  const totalPages = Math.max(1, Math.ceil(filteredSermons.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSermons = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    return filteredSermons.slice(from, from + PAGE_SIZE);
  }, [filteredSermons, currentPage]);

  const getDraftPillarIds = useCallback((sermon) => {
    const draft = draftPillarIdsBySermonId[sermon.id];
    if (Array.isArray(draft)) return draft;
    return sermon.sermon_pillars?.map((sp) => sp.pillar_id).filter(Boolean) ?? [];
  }, [draftPillarIdsBySermonId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pending, allPillars] = await Promise.all([
        getPendingReviewSermons(),
        getAdminPillars(),
      ]);

      setSermons(pending);
      setPillars(allPillars);
      setSelectedSermonIds([]);

      const initialDraft = {};
      pending.forEach((sermon) => {
        initialDraft[sermon.id] = sermon.sermon_pillars?.map((sp) => sp.pillar_id).filter(Boolean) ?? [];
      });
      setDraftPillarIdsBySermonId(initialDraft);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateDraftPillarIds(sermonId, pillarIds) {
    setDraftPillarIdsBySermonId((prev) => ({
      ...prev,
      [sermonId]: pillarIds,
    }));
  }

  function toggleSermonSelection(sermonId) {
    setSelectedSermonIds((prev) => {
      if (prev.includes(sermonId)) {
        return prev.filter((id) => id !== sermonId);
      }
      return [...prev, sermonId];
    });
  }

  function toggleAllSermonSelection(selected) {
    if (!selected) {
      setSelectedSermonIds([]);
      return;
    }
    setSelectedSermonIds(pageSermons.map((sermon) => sermon.id));
  }

  async function reviewOne(sermonId, reviewStatus) {
    const sermon = sermons.find((row) => row.id === sermonId);
    if (!sermon) return;

    setError(null);
    setNotice(null);
    setSavingBySermonId((prev) => ({ ...prev, [sermonId]: true }));

    try {
      await saveAdminSermonReview({
        sermonId,
        reviewStatus,
        customTitle: sermon.custom_title ?? '',
        preacher: sermon.preacher ?? '',
        church: sermon.church ?? '',
        description: sermon.description ?? '',
        pillarIds: getDraftPillarIds(sermon),
      });

      setSermons((prev) => prev.filter((row) => row.id !== sermonId));
      setSelectedSermonIds((prev) => prev.filter((id) => id !== sermonId));
      setDraftPillarIdsBySermonId((prev) => {
        const next = { ...prev };
        delete next[sermonId];
        return next;
      });
      setNotice(`Sermon ${reviewStatus === 'approved' ? 'approved' : 'rejected'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBySermonId((prev) => {
        const next = { ...prev };
        delete next[sermonId];
        return next;
      });
    }
  }

  async function reviewBulk(reviewStatus) {
    if (!selectedSermonIds.length) return;
    const selectedSermons = sermons.filter((sermon) => selectedSermonIds.includes(sermon.id));
    if (!selectedSermons.length) return;

    setBulkSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = selectedSermons.map((sermon) => ({
        sermonId: sermon.id,
        reviewStatus,
        customTitle: sermon.custom_title ?? '',
        preacher: sermon.preacher ?? '',
        church: sermon.church ?? '',
        description: sermon.description ?? '',
        pillarIds: getDraftPillarIds(sermon),
      }));

      const result = await saveAdminSermonReviewsBulk(payload);
      const failedIds = new Set(
        (result.results || [])
          .filter((row) => row.ok === false && row.sermonId)
          .map((row) => row.sermonId),
      );

      const successfulIds = selectedSermons
        .map((sermon) => sermon.id)
        .filter((id) => !failedIds.has(id));

      if (successfulIds.length) {
        setSermons((prev) => prev.filter((sermon) => !successfulIds.includes(sermon.id)));
        setDraftPillarIdsBySermonId((prev) => {
          const next = { ...prev };
          successfulIds.forEach((id) => delete next[id]);
          return next;
        });
      }

      setSelectedSermonIds((prev) => prev.filter((id) => !successfulIds.includes(id)));

      if (result.failed) {
        const firstError = (result.results || []).find((row) => row.ok === false)?.error;
        setError(`Bulk update completed with ${result.failed} failures.${firstError ? ` ${firstError}` : ''}`);
      } else {
        setNotice(
          `${reviewStatus === 'approved' ? 'Approved' : 'Rejected'} ${result.processed} sermon${result.processed === 1 ? '' : 's'}.`,
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkSaving(false);
    }
  }

  async function deleteBulk() {
    if (!selectedSermonIds.length) return;
    const selectedSermons = sermons.filter((sermon) => selectedSermonIds.includes(sermon.id));
    if (!selectedSermons.length) return;

    const count = selectedSermons.length;
    const confirmed = window.confirm(
      `Delete ${count} selected sermon${count === 1 ? '' : 's'} permanently? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkSaving(true);
    setError(null);
    setNotice(null);

    try {
      const results = await Promise.all(
        selectedSermons.map(async (sermon) => {
          try {
            await deleteAdminSermon(sermon.id);
            return { sermonId: sermon.id, ok: true };
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unexpected server error';
            return { sermonId: sermon.id, ok: false, error: message };
          }
        }),
      );

      const failedIds = new Set(
        results
          .filter((row) => !row.ok)
          .map((row) => row.sermonId),
      );

      const successfulIds = selectedSermons
        .map((sermon) => sermon.id)
        .filter((id) => !failedIds.has(id));

      if (successfulIds.length) {
        setSermons((prev) => prev.filter((sermon) => !successfulIds.includes(sermon.id)));
        setDraftPillarIdsBySermonId((prev) => {
          const next = { ...prev };
          successfulIds.forEach((id) => delete next[id]);
          return next;
        });
      }

      setSelectedSermonIds((prev) => prev.filter((id) => !successfulIds.includes(id)));

      const failed = results.length - successfulIds.length;
      if (failed > 0) {
        const firstError = results.find((row) => !row.ok)?.error;
        setError(`Bulk delete completed with ${failed} failures.${firstError ? ` ${firstError}` : ''}`);
      } else {
        setNotice(`Deleted ${successfulIds.length} sermon${successfulIds.length === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkSaving(false);
    }
  }

  async function deleteOne(sermonId) {
    const sermon = sermons.find((row) => row.id === sermonId);
    if (!sermon) return;

    const confirmed = window.confirm(`Delete "${sermon.title}" permanently from the app? This cannot be undone.`);
    if (!confirmed) return;

    setSavingBySermonId((prev) => ({ ...prev, [sermonId]: true }));
    setError(null);
    setNotice(null);

    try {
      await deleteAdminSermon(sermonId);
      setSermons((prev) => prev.filter((row) => row.id !== sermonId));
      setSelectedSermonIds((prev) => prev.filter((id) => id !== sermonId));
      setDraftPillarIdsBySermonId((prev) => {
        const next = { ...prev };
        delete next[sermonId];
        return next;
      });
      setNotice('Sermon deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBySermonId((prev) => {
        const next = { ...prev };
        delete next[sermonId];
        return next;
      });
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

        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-3xl font-bold"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Review Queue
          </h1>
          {!loading && (
            <span className="text-sm text-muted font-ui">
              {query ? `${filteredSermons.length} match${filteredSermons.length !== 1 ? 'es' : ''}` : `${sermons.length} pending`}
            </span>
          )}
        </div>
        <p className="text-sm text-muted font-ui mb-8">
          Review imported sermons, approve or correct pillar tags.
        </p>

        {error && <p className="text-sm text-red-600 font-ui mb-4">{error}</p>}
        {notice && <p className="text-sm text-green-700 font-ui mb-4">{notice}</p>}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search pending sermons by title, preacher, church, or description"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50">
          <ReviewQueueTable
            sermons={pageSermons}
            pillars={pillars}
            loading={loading}
            selectedSermonIds={selectedSermonIds}
            draftPillarIdsBySermonId={draftPillarIdsBySermonId}
            savingBySermonId={savingBySermonId}
            bulkSaving={bulkSaving}
            onToggleSermonSelection={toggleSermonSelection}
            onToggleAllSermonSelection={toggleAllSermonSelection}
            onUpdateDraftPillarIds={updateDraftPillarIds}
            onReviewOne={reviewOne}
            onReviewBulk={reviewBulk}
            onDeleteBulk={deleteBulk}
            onDeleteOne={deleteOne}
            emptyMessage={query ? 'No pending sermons match this search.' : 'No sermons pending review.'}
          />
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
              <ChevronLeft size={15} className="-ml-2" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <span className="text-sm font-ui text-muted px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
              <ChevronRight size={15} className="-ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
