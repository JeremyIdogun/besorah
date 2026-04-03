import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, PencilLine, Trash2, X } from 'lucide-react';
import TagSelector from './TagSelector';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReviewQueueTable({
  sermons,
  pillars,
  loading,
  selectedSermonIds,
  draftPillarIdsBySermonId,
  savingBySermonId,
  bulkSaving,
  onToggleSermonSelection,
  onToggleAllSermonSelection,
  onUpdateDraftPillarIds,
  onReviewOne,
  onReviewBulk,
  onDeleteBulk,
  onDeleteOne,
  emptyMessage = 'No sermons pending review.',
}) {
  const [expandedEditorBySermonId, setExpandedEditorBySermonId] = useState({});
  const selectedSet = useMemo(() => new Set(selectedSermonIds), [selectedSermonIds]);
  const pillarById = useMemo(
    () => Object.fromEntries((pillars || []).map((pillar) => [pillar.id, pillar])),
    [pillars],
  );

  function toggleEditor(sermonId) {
    setExpandedEditorBySermonId((prev) => ({
      ...prev,
      [sermonId]: !prev[sermonId],
    }));
  }

  function getRowPillarIds(sermon) {
    const draft = draftPillarIdsBySermonId[sermon.id];
    if (Array.isArray(draft)) return draft;
    return sermon.sermon_pillars?.map((sp) => sp.pillar_id).filter(Boolean) ?? [];
  }

  const allSelected = sermons.length > 0 && sermons.every((sermon) => selectedSet.has(sermon.id));

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-amber-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sermons?.length) {
    return (
      <div className="text-center py-10 text-muted font-ui">
        <p className="text-3xl mb-2">✅</p>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="inline-flex items-center gap-2 text-xs text-muted font-ui">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleAllSermonSelection(e.target.checked)}
            className="rounded border-amber-300 text-primary focus:ring-accent"
          />
          Select all
        </label>
        <span className="text-xs text-muted font-ui">
          {selectedSermonIds.length} selected
        </span>
        <button
          type="button"
          onClick={() => onReviewBulk('approved')}
          disabled={!selectedSermonIds.length || bulkSaving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-ui font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Check size={12} />
          Approve Selected
        </button>
        <button
          type="button"
          onClick={() => onReviewBulk('rejected')}
          disabled={!selectedSermonIds.length || bulkSaving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-ui font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          <X size={12} />
          Reject Selected
        </button>
        <button
          type="button"
          onClick={onDeleteBulk}
          disabled={!selectedSermonIds.length || bulkSaving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-700 text-xs font-ui font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          Delete Selected
        </button>
      </div>

      <table className="w-full text-sm font-ui">
        <thead>
          <tr className="border-b border-amber-100 text-left">
            <th className="py-2 pr-3 text-muted font-medium w-8">Sel</th>
            <th className="py-2 pr-4 text-muted font-medium">Title</th>
            <th className="py-2 pr-4 text-muted font-medium hidden sm:table-cell">Preacher</th>
            <th className="py-2 pr-4 text-muted font-medium hidden md:table-cell">Imported</th>
            <th className="py-2 pr-4 text-muted font-medium">Theme / Pillar Tags</th>
            <th className="py-2 text-muted font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sermons.map((sermon) => {
            const rowPillarIds = getRowPillarIds(sermon);
            const rowPillars = rowPillarIds.map((id) => pillarById[id]).filter(Boolean);
            const isSelected = selectedSet.has(sermon.id);
            const isSaving = bulkSaving || Boolean(savingBySermonId[sermon.id]);

            return (
              <tr key={sermon.id} className="border-b border-amber-50 hover:bg-amber-50/50 transition-colors">
                <td className="py-3 pr-3 align-top">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSermonSelection(sermon.id)}
                    disabled={isSaving}
                    className="rounded border-amber-300 text-primary focus:ring-accent mt-1"
                  />
                </td>
                <td className="py-3 pr-4">
                  <span className="font-medium text-text-main line-clamp-1">{sermon.title}</span>
                </td>
                <td className="py-3 pr-4 hidden sm:table-cell text-muted">{sermon.preacher || '—'}</td>
                <td className="py-3 pr-4 hidden md:table-cell text-muted">{formatDate(sermon.created_at)}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {rowPillars.length ? rowPillars.map((p) => (
                      <span
                        key={p.id}
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name}
                      </span>
                    )) : <span className="text-muted text-xs">None</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEditor(sermon.id)}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary font-medium mt-2"
                  >
                    <PencilLine size={12} />
                    {expandedEditorBySermonId[sermon.id] ? 'Hide tag editor' : 'Edit tags'}
                  </button>
                  {expandedEditorBySermonId[sermon.id] && (
                    <div className="mt-2">
                      <TagSelector
                        pillars={pillars}
                        selected={rowPillarIds}
                        onChange={(next) => onUpdateDraftPillarIds(sermon.id, next)}
                      />
                    </div>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onReviewOne(sermon.id, 'approved')}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-white text-xs font-ui font-medium hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewOne(sermon.id, 'rejected')}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-ui font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <X size={12} />
                      Reject
                    </button>
                    <Link
                      to={`/admin/sermons/${sermon.id}`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary font-medium transition-colors"
                    >
                      <Eye size={12} />
                      Full Review
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDeleteOne(sermon.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-ui font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
