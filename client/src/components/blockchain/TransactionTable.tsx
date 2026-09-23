import { ArrowDownLeft, ArrowUpRight, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NormalizedTransaction, TransactionPage } from '../../types';
import { AddressDisplay } from '../ui/AddressDisplay';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';

// ── Helpers ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncateHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars + 2)}…${hash.slice(-6)}`;
}

// ── Sub-components ────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'in' | 'out' }) {
  const isIn = direction === 'in';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 'var(--r-full)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.05em',
        background: isIn ? 'var(--success-muted)' : 'var(--accent-muted)',
        color: isIn ? 'var(--success)' : 'var(--accent-hover)',
        border: `1px solid ${isIn ? 'rgba(34,197,94,0.25)' : 'var(--accent-border)'}`,
        flexShrink: 0,
      }}
    >
      {isIn
        ? <ArrowDownLeft size={10} />
        : <ArrowUpRight size={10} />}
      {isIn ? 'IN' : 'OUT'}
    </span>
  );
}

function StatusChip({ status }: { status: 'success' | 'failed' }) {
  const ok = status === 'success';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--r-full)',
        fontSize: 11,
        fontWeight: 500,
        background: ok ? 'var(--success-muted)' : 'var(--danger-muted)',
        color: ok ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {ok ? 'Success' : 'Failed'}
    </span>
  );
}

function TxRow({ tx, queried }: { tx: NormalizedTransaction; queried: string }) {
  return (
    <tr className="clickable">
      {/* Direction */}
      <td>
        <DirectionBadge direction={tx.direction} />
      </td>

      {/* Hash */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="text-mono"
            title={tx.hash}
            style={{ fontSize: 12 }}
          >
            {truncateHash(tx.hash)}
          </span>
          <a
            href={`https://etherscan.io/tx/${tx.hash}`}
            target="_blank"
            rel="noreferrer noopener"
            title="View on Etherscan"
            style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={11} />
          </a>
        </div>
        {tx.functionName && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {tx.functionName.split('(')[0]}
          </div>
        )}
      </td>

      {/* From */}
      <td>
        <span style={{ opacity: tx.from.toLowerCase() === queried.toLowerCase() ? 1 : 0.7 }}>
          <AddressDisplay
            address={tx.from}
            chars={5}
            showCopy={true}
          />
        </span>
      </td>

      {/* To */}
      <td>
        {tx.to ? (
          <AddressDisplay
            address={tx.to}
            chars={5}
            showCopy={true}
          />
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Contract creation
          </span>
        )}
      </td>

      {/* Value */}
      <td>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: tx.value === '0' ? 'var(--text-muted)' : 'var(--text-primary)',
            fontWeight: tx.direction === 'in' ? 600 : 400,
          }}
        >
          {tx.value === '0' ? '0' : tx.value} ETH
        </span>
      </td>

      {/* Time */}
      <td>
        <span
          title={formatDate(tx.timestamp)}
          style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'default' }}
        >
          {relativeTime(tx.timestamp)}
        </span>
      </td>

      {/* Status */}
      <td>
        <StatusChip status={tx.status} />
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────

interface TransactionTableProps {
  data: TransactionPage;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function TransactionTable({ data, onPageChange, loading = false }: TransactionTableProps) {
  const { transactions, page, hasMore, address } = data;

  if (transactions.length === 0 && !loading) {
    return (
      <div className="table-wrapper">
        <EmptyState
          title="No transactions found"
          description={`No transactions found for this address on Ethereum mainnet (Etherscan data, page ${page}).`}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Dir</th>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Value</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {transactions.map((tx) => (
              <TxRow key={tx.hash} tx={tx} queried={address} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
          borderRadius: '0 0 var(--r-lg) var(--r-lg)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Page {page} · {transactions.length} transactions
          {hasMore ? ' · more available' : ' · end of results'}
          {' '}·{' '}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Source:{' '}
            <a
              href="https://etherscan.io"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--cyan)' }}
            >
              Etherscan mainnet
            </a>
          </span>
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ChevronLeft size={14} />}
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            id="btn-tx-prev"
          >
            Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ChevronRight size={14} />}
            disabled={!hasMore || loading}
            onClick={() => onPageChange(page + 1)}
            id="btn-tx-next"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
