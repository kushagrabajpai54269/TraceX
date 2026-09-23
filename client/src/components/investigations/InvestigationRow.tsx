import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil, Trash2, Archive, RotateCcw, CheckCircle2,
  MoreHorizontal, RefreshCw,
} from 'lucide-react';
import type { Investigation, InvestigationStatus } from '../../types';
import { StatusBadge } from '../ui/Badge';
import { AddressDisplay } from '../ui/AddressDisplay';
import { investigationsApi } from '../../services/api';

interface InvestigationRowProps {
  investigation: Investigation;
  onRename:  (inv: Investigation) => void;
  onDelete:  (inv: Investigation) => void;
  onUpdated: (inv: Investigation) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function InvestigationRow({
  investigation: inv,
  onRename,
  onDelete,
  onUpdated,
}: InvestigationRowProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function changeStatus(status: InvestigationStatus) {
    setMenuOpen(false);
    setLoading(true);
    try {
      const updated = await investigationsApi.update(inv._id, { status });
      onUpdated(updated);
    } catch {
      // silently fail — user sees no change
    } finally {
      setLoading(false);
    }
  }

  const isArchived = inv.status === 'archived';
  const isDone     = inv.status === 'done';

  return (
    <tr
      className="clickable"
      onClick={() => navigate(`/investigations/${inv._id}`)}
      style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Title */}
      <td>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {inv.title}
        </span>
      </td>

      {/* Address */}
      <td onClick={(e) => e.stopPropagation()}>
        <AddressDisplay address={inv.targetAddress} chars={6} showCopy />
      </td>

      {/* Status */}
      <td><StatusBadge status={inv.status} /></td>

      {/* Created */}
      <td>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {formatDate(inv.createdAt)}
        </span>
      </td>

      {/* Actions */}
      <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Actions"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px 6px',
              borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--text-primary)'; (e.target as HTMLElement).style.background = 'var(--surface-3)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-muted)'; (e.target as HTMLElement).style.background = 'none'; }}
          >
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <MoreHorizontal size={14} />}
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setMenuOpen(false)}
              />
              {/* Menu */}
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 50,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)',
                  minWidth: 170, overflow: 'hidden',
                }}
              >
                <MenuItem
                  icon={<Pencil size={13} />}
                  label="Rename"
                  onClick={() => { setMenuOpen(false); onRename(inv); }}
                />
                {!isDone && !isArchived && (
                  <MenuItem
                    icon={<CheckCircle2 size={13} />}
                    label="Mark done"
                    onClick={() => changeStatus('done')}
                  />
                )}
                {isDone && (
                  <MenuItem
                    icon={<RotateCcw size={13} />}
                    label="Reopen (active)"
                    onClick={() => changeStatus('active')}
                  />
                )}
                {!isArchived ? (
                  <MenuItem
                    icon={<Archive size={13} />}
                    label="Archive"
                    onClick={() => changeStatus('archived')}
                  />
                ) : (
                  <MenuItem
                    icon={<RotateCcw size={13} />}
                    label="Restore (active)"
                    onClick={() => changeStatus('active')}
                  />
                )}
                <div style={{ height: 1, background: 'var(--border)' }} />
                <MenuItem
                  icon={<Trash2 size={13} />}
                  label="Delete"
                  danger
                  onClick={() => { setMenuOpen(false); onDelete(inv); }}
                />
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontFamily: 'var(--font-ui)', textAlign: 'left',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = danger ? 'var(--danger-muted)' : 'var(--surface-3)';
        el.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = 'none';
        el.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
