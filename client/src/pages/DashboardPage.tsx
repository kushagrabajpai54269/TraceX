import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Activity, FolderSearch2, GitBranch, Clock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/dashboard/StatCard';
import { NewInvestigationModal } from '../components/dashboard/NewInvestigationModal';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Card, CardHeader } from '../components/ui/Card';
import { AddressSearch } from '../components/blockchain/AddressSearch';
import { StatusBadge } from '../components/ui/Badge';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { dashboardApi } from '../services/api';
import type { DashboardStats, Investigation } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  function handleCreated(inv: Investigation) {
    // Immediately navigate to the new investigation workspace
    navigate(`/investigations/${inv._id}`);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Blockchain investigation workspace — Ethereum mainnet</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)} id="btn-new-investigation">
          New Investigation
        </Button>
      </div>

      {/* Stat cards — real data from MongoDB */}
      <div className="stat-grid">
        <StatCard
          label="Active Investigations"
          value={loading ? null : stats?.active ?? null}
          icon={<Activity size={12} />}
          accentColor="var(--warning)"
          sub={loading ? 'Loading…' : undefined}
        />
        <StatCard
          label="Total Investigations"
          value={loading ? null : stats?.total ?? null}
          icon={<FolderSearch2 size={12} />}
          sub={loading ? 'Loading…' : 'including archived'}
        />
        <StatCard
          label="Addresses Traced"
          value={null}
          icon={<GitBranch size={12} />}
          accentColor="var(--cyan)"
          sub="Available in Phase 5"
        />
        <StatCard
          label="Transactions Fetched"
          value={null}
          icon={<Activity size={12} />}
          accentColor="var(--accent)"
          sub="Available in Phase 5"
        />
      </div>

      {/* Recent Investigations */}
      <Card>
        <CardHeader
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              Recent Investigations
            </span>
          }
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => navigate('/investigations')}>
                View all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                New
              </Button>
            </div>
          }
        />

        {loading && <LoadingState message="Loading investigations…" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={fetchStats} />
        )}

        {!loading && !error && stats?.recent.length === 0 && (
          <EmptyState
            title="No investigations yet"
            description="Create your first investigation to start tracing blockchain transactions."
            action={
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                New Investigation
              </Button>
            }
          />
        )}

        {!loading && !error && stats && stats.recent.length > 0 && (
          <div>
            {stats.recent.map((inv) => (
              <div
                key={inv._id}
                onClick={() => navigate(`/investigations/${inv._id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {inv.title}
                  </div>
                  <AddressDisplay address={inv.targetAddress} chars={6} showCopy={false} />
                </div>
                <StatusBadge status={inv.status} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(inv.updatedAt)}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Address Explorer — Phase 2 */}
      <Card>
        <CardHeader
          title="Address Explorer"
          action={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Real Etherscan mainnet data</span>}
        />
        <div className="card__body">
          <AddressSearch />
        </div>
      </Card>

      <NewInvestigationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreated}
      />
    </div>
  );
}
