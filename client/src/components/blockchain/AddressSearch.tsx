import { useState, useCallback } from 'react';
import { Search, X, ExternalLink, Wallet } from 'lucide-react';
import { addressApi } from '../../services/api';
import type { TransactionPage } from '../../types';
import { Button } from '../ui/Button';
import { TransactionTable } from './TransactionTable';
import { LoadingState, ErrorState } from '../ui/Feedback';

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading'; address: string }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; data: TransactionPage; pageLoading: boolean };

export function AddressSearch() {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [state, setState] = useState<FetchState>({ kind: 'idle' });

  const fetchPage = useCallback(async (address: string, page: number) => {
    if (page === 1) {
      setState({ kind: 'loading', address });
    } else {
      setState((prev: FetchState) =>
        prev.kind === 'loaded' ? { ...prev, pageLoading: true } : prev
      );
    }

    try {
      const data = await addressApi.getTransactions(address, page, 25);
      setState({ kind: 'loaded', data, pageLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions.';
      setState({ kind: 'error', message });
    }
  }, []);

  function handleSubmit() {
    const trimmed = input.trim();
    setInputError('');

    if (!trimmed) {
      setInputError('Please enter an Ethereum wallet address.');
      return;
    }
    if (!ETH_ADDRESS_RE.test(trimmed)) {
      setInputError('Invalid address. Must start with 0x and be 42 characters long.');
      return;
    }

    fetchPage(trimmed, 1);
  }

  function handleClear() {
    setInput('');
    setInputError('');
    setState({ kind: 'idle' });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const queried = state.kind === 'loaded' ? state.data.address : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Search bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
          <span
            style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
            }}
          >
            <Search size={14} />
          </span>
          <input
            id="address-search-input"
            className={`form-input ${inputError ? 'form-input--error' : ''}`}
            style={{
              paddingLeft: 34,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.01em',
              width: '100%',
            }}
            placeholder="Enter Ethereum wallet address  0x…"
            value={input}
            onChange={(e) => { setInput(e.target.value); setInputError(''); }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
          {inputError && (
            <span className="form-error" style={{ marginTop: 4 }}>{inputError}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {state.kind !== 'idle' && (
            <Button variant="ghost" size="sm" iconOnly onClick={handleClear} title="Clear" id="btn-clear-search">
              <X size={14} />
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Search size={14} />}
            onClick={handleSubmit}
            loading={state.kind === 'loading'}
            disabled={!input.trim() || state.kind === 'loading'}
            id="btn-lookup-address"
          >
            Look up
          </Button>
        </div>
      </div>

      {/* Address summary card — shown when loaded */}
      {state.kind === 'loaded' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 'var(--r-lg)',
              background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0,
            }}
          >
            <Wallet size={16} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--text-mono)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title={queried}
              >
                {queried}
              </span>
              <a
                href={`https://etherscan.io/address/${queried}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
                title="View on Etherscan"
              >
                <ExternalLink size={11} />
              </a>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Ethereum mainnet · Etherscan API V2
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 16,
                fontWeight: 700, color: 'var(--text-primary)',
              }}
            >
              {state.data.balance} ETH
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Balance</div>
          </div>
        </div>
      )}

      {/* States */}
      {state.kind === 'loading' && (
        <LoadingState message={`Fetching transactions for ${state.address.slice(0, 10)}…`} />
      )}

      {state.kind === 'error' && (
        <ErrorState
          message={state.message}
          onRetry={() => {
            const addr = input.trim();
            if (addr) fetchPage(addr, 1);
          }}
        />
      )}

      {state.kind === 'loaded' && (
        <TransactionTable
          data={state.data}
          loading={state.pageLoading}
          onPageChange={(page) => fetchPage(state.data.address, page)}
        />
      )}
    </div>
  );
}
