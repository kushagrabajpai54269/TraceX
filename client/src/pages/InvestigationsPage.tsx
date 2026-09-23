import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { NewInvestigationModal } from '../components/dashboard/NewInvestigationModal';
import { InvestigationRow } from '../components/investigations/InvestigationRow';
import { RenameModal } from '../components/investigations/RenameModal';
import { DeleteConfirmModal } from '../components/investigations/DeleteConfirmModal';
import { investigationsApi } from '../services/api';
import type { Investigation, InvestigationStatus } from '../types';

type FilterTab = 'all' | InvestigationStatus;
type SortKey   = 'title' | 'status' | 'createdAt';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'active',   label: 'Active'   },
  { key: 'done',     label: 'Done'     },
  { key: 'archived', label: 'Archived' },
];

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
  return dir === 'asc'
    ? <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
    : <ChevronDown size={12} style={{ color: 'var(--accent)' }} />;
}

export function InvestigationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sort, setSort]           = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });

  // All investigations (unfiltered, for counts)
  const [all, setAll]       = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // Modals
  const [createOpen, setCreateOpen]   = useState(false);
  const [renameTarget, setRenameTarget]   = useState<Investigation | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Investigation | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { investigations } = await investigationsApi.list({ sort: sort.key, dir: sort.dir });
      setAll(investigations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investigations.');
    } finally {
      setLoading(false);
    }
  }, [sort.key, sort.dir]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Client-side filter for tab (sorted list already comes from server)
  const filtered = activeTab === 'all'
    ? all
    : all.filter((inv) => inv.status === activeTab);

  function counts(tab: FilterTab) {
    if (tab === 'all') return all.length;
    return all.filter((i) => i.status === tab).length;
  }

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  }

  function handleCreated(inv: Investigation) {
    setAll((prev) => [inv, ...prev]);
    setCreateOpen(false);
  }

  function handleUpdated(inv: Investigation) {
    setAll((prev) => prev.map((i) => (i._id === inv._id ? inv : i)));
    setRenameTarget(null);
  }

  function handleDeleted(id: string) {
    setAll((prev) => prev.filter((i) => i._id !== id));
    setDeleteTarget(null);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigations</h1>
          <p className="page-subtitle">Manage and review your blockchain investigations</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setCreateOpen(true)}
          id="btn-new-investigation-list"
        >
          New Investigation
        </Button>
      </div>

      {/* Filter tabs with real counts */}
      <div className="filter-tabs" role="tablist" aria-label="Filter investigations by status">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            className={`filter-tab ${activeTab === key ? 'filter-tab--active' : ''}`}
            onClick={() => setActiveTab(key)}
            id={`tab-${key}`}
          >
            {label}
            <span className="filter-tab__count">{loading ? '—' : counts(key)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <LoadingState message="Loading investigations…" />}

      {!loading && error && <ErrorState message={error} onRetry={fetchAll} />}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="table" aria-label="Investigations list">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('title')} aria-sort={sort.key === 'title' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <div className="th-inner">Title <SortIcon active={sort.key === 'title'} dir={sort.dir} /></div>
                </th>
                <th>Target Address</th>
                <th className="sortable" onClick={() => handleSort('status')} aria-sort={sort.key === 'status' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <div className="th-inner">Status <SortIcon active={sort.key === 'status'} dir={sort.dir} /></div>
                </th>
                <th className="sortable" onClick={() => handleSort('createdAt')} aria-sort={sort.key === 'createdAt' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <div className="th-inner">Created <SortIcon active={sort.key === 'createdAt'} dir={sort.dir} /></div>
                </th>
                <th style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={activeTab === 'all' ? 'No investigations' : `No ${activeTab} investigations`}
                      description={
                        activeTab === 'all'
                          ? 'Create your first investigation to start tracing blockchain transactions.'
                          : `No investigations with status "${activeTab}" found.`
                      }
                      action={
                        activeTab === 'all' ? (
                          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                            New Investigation
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <InvestigationRow
                    key={inv._id}
                    investigation={inv}
                    onRename={setRenameTarget}
                    onDelete={setDeleteTarget}
                    onUpdated={handleUpdated}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <NewInvestigationModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreated}
      />
      <RenameModal
        investigation={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSuccess={handleUpdated}
      />
      <DeleteConfirmModal
        investigation={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
