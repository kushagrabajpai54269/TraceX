import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Network, Maximize2, Download,
  PanelRightClose, PanelRightOpen,
  Calendar, Hash, Tag, Info, ExternalLink, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SegmentControl } from '../components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { StatusBadge } from '../components/ui/Badge';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { RenameModal } from '../components/investigations/RenameModal';
import { InvestigationGraph } from '../components/investigations/InvestigationGraph';
import { TransactionTable } from '../components/blockchain/TransactionTable';
import { investigationsApi } from '../services/api';
import type { Investigation, TraceResponse, GraphNode, GraphEdge, TransactionPage } from '../types';
import { useRef } from 'react';

type Direction = 'both' | 'incoming' | 'outgoing';

const DEPTH_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];
const DIRECTION_OPTIONS = [
  { value: 'both',     label: 'Both'     },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TABLE_COLUMNS = ['Hash', 'From', 'To', 'Value (ETH)', 'Time', 'Status'];

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inv, setInv]         = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [panelOpen, setPanelOpen]   = useState(true);
  const [depth, setDepth]           = useState('2');
  const [direction, setDirection]   = useState<Direction>('both');
  const [renameOpen, setRenameOpen] = useState(false);

  // Trace State
  const [tracing, setTracing] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [traceData, setTraceData] = useState<TraceResponse | null>(null);
  
  // Selection State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  
  // Tab State
  type TabType = 'Details' | 'Notes' | 'Transaction';
  const [activeTab, setActiveTab] = useState<TabType>('Details');
  const [notes, setNotes] = useState('');
  
  // Table State
  const [tracePage, setTracePage] = useState(1);
  
  const fitGraph = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    investigationsApi.get(id)
      .then(setInv)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load investigation.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isLoaded = !!inv && !loading && !error;

  async function handleTrace() {
    if (!inv) return;
    setTracing(true);
    setTraceError('');
    setTraceData(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    if (activeTab === 'Transaction') setActiveTab('Details');
    setTracePage(1);
    
    try {
      const data = await investigationsApi.trace(inv._id, parseInt(depth, 10), direction);
      setTraceData(data);
    } catch (err) {
      setTraceError(err instanceof Error ? err.message : 'Failed to trace transactions.');
    } finally {
      setTracing(false);
    }
  }

  const handleNodeSelect = (n: GraphNode) => {
    setSelectedNode(n);
    setSelectedEdge(null);
    if (activeTab === 'Transaction') setActiveTab('Details');
  };

  const handleEdgeSelect = (e: GraphEdge) => {
    setSelectedEdge(e);
    setSelectedNode(null);
    setActiveTab('Transaction');
  };

  // Local pagination for trace results
  const TRACE_LIMIT = 25;
  const pagedTransactions = traceData ? traceData.transactions.slice((tracePage - 1) * TRACE_LIMIT, tracePage * TRACE_LIMIT) : [];
  const hasMoreTrace = traceData ? traceData.transactions.length > tracePage * TRACE_LIMIT : false;

  const tableData: TransactionPage | null = traceData && inv ? {
    address: inv.targetAddress,
    balance: 'N/A', // Trace API does not fetch balance
    balanceWei: '0',
    transactions: pagedTransactions,
    page: tracePage,
    limit: TRACE_LIMIT,
    hasMore: hasMoreTrace,
    dataSource: 'etherscan-mainnet',
  } : null;

  if (loading) {
    return (
      <div className="workspace">
        <div className="workspace__header">
          <button className="workspace__back" onClick={() => navigate('/investigations')}>
            <ArrowLeft size={14} /> Investigations
          </button>
        </div>
        <LoadingState message="Loading investigation…" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="workspace">
        <div className="workspace__header">
          <button className="workspace__back" onClick={() => navigate('/investigations')}>
            <ArrowLeft size={14} /> Investigations
          </button>
        </div>
        <ErrorState
          title="Investigation not found"
          message={error || 'This investigation could not be loaded.'}
          onRetry={() => { if (id) window.location.reload(); }}
        />
      </div>
    );
  }

  return (
    <div className="workspace">
      {/* ── Header ── */}
      <div className="workspace__header">
        <button className="workspace__back" onClick={() => navigate('/investigations')} aria-label="Back">
          <ArrowLeft size={14} /> Investigations
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        <div className="workspace__title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="workspace__title" style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
              {inv.title}
            </div>
            <StatusBadge status={inv.status} />
          </div>
          <div className="workspace__address">
            <AddressDisplay address={inv.targetAddress} chars={8} showCopy />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRenameOpen(true)}
          style={{ marginLeft: 'auto' }}
          id="btn-rename-workspace"
        >
          Rename
        </Button>
      </div>

      {/* ── Toolbar ── */}
      <div className="workspace__toolbar">
        <span className="toolbar-label">Depth</span>
        <SegmentControl options={DEPTH_OPTIONS} value={depth} onChange={setDepth} disabled={!isLoaded} />

        <div className="toolbar-divider" />
        <span className="toolbar-label">Direction</span>
        <SegmentControl
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          disabled={!isLoaded}
        />

        <div className="toolbar-divider" />
        <Button 
          variant="primary" 
          size="sm" 
          leftIcon={<Network size={14} />} 
          disabled={!isLoaded || tracing} 
          loading={tracing}
          onClick={handleTrace}
          id="btn-trace"
        >
          Trace
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          leftIcon={<Maximize2 size={14} />} 
          disabled={!traceData || tracing}
          onClick={() => fitGraph.current?.()}
          id="btn-fit"
        >
          Fit
        </Button>
        <div className="toolbar-divider" />
        <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} disabled id="btn-export">Export</Button>

        <div style={{ marginLeft: 'auto' }}>
          <Button variant="ghost" size="sm" iconOnly onClick={() => setPanelOpen((p) => !p)} title={panelOpen ? 'Collapse panel' : 'Expand panel'} id="btn-toggle-panel">
            {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="workspace__body">
        <div className="workspace__canvas-row">
          {/* Graph area */}
          <div className="workspace__graph-area">
            {tracing ? (
              <LoadingState message="Tracing transaction network…" />
            ) : traceError ? (
              <ErrorState title="Trace failed" message={traceError} onRetry={handleTrace} />
            ) : traceData ? (
              <InvestigationGraph 
                nodes={traceData.nodes} 
                edges={traceData.edges} 
                onNodeSelect={handleNodeSelect}
                onEdgeSelect={handleEdgeSelect}
                onFit={(fn) => { fitGraph.current = fn; }}
              />
            ) : (
              <div className="placeholder-box">
                <div className="placeholder-box__icon"><Network size={24} /></div>
                <div className="placeholder-box__title">Transaction Graph</div>
                <div className="placeholder-box__desc">
                  Set depth and direction, then click Trace to construct the investigation graph.
                </div>
              </div>
            )}

            {/* Graph legend */}
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              display: 'flex', gap: 12, flexWrap: 'wrap',
              background: 'rgba(19,19,26,0.9)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '6px 12px',
            }}>
              {[
                { color: '#7c5cfc', label: 'Root' },
                { color: '#8888aa', label: 'Unknown' },
                { color: '#3b82f6', label: 'Contract' },
                { color: '#22c55e', label: 'Labeled safe' },
                { color: '#ef4444', label: 'Flagged' },
                { color: '#f59e0b', label: 'Suspicious' },
                { color: '#38bdf8', label: 'Exchange' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80` }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Panel — shows investigation metadata */}
          <aside
            className={`workspace__detail-panel ${panelOpen ? '' : 'workspace__detail-panel--collapsed'}`}
            aria-label="Investigation details"
          >
            <div className="panel__header">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Investigation Details</span>
            </div>
            <div className="panel__tabs">
              {['Details', 'Notes', ...(selectedEdge ? ['Transaction'] : [])].map((tab) => (
                <button 
                  key={tab} 
                  className={`panel__tab ${activeTab === tab ? 'panel__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab as TabType)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="panel__body">
              {activeTab === 'Details' && (
                <>
                  <DetailRow icon={<Tag size={13} />} label="Title" value={inv.title} />
                  <DetailRow
                    icon={<Hash size={13} />}
                    label="Target Address"
                    value={<AddressDisplay address={inv.targetAddress} chars={7} showCopy />}
                  />
                  <DetailRow
                    icon={<Info size={13} />}
                    label="Status"
                    value={<StatusBadge status={inv.status} />}
                  />
                  <DetailRow
                    icon={<Calendar size={13} />}
                    label="Created"
                    value={formatDate(inv.createdAt)}
                  />
                  <DetailRow
                    icon={<Calendar size={13} />}
                    label="Updated"
                    value={formatDate(inv.updatedAt)}
                  />

                  {selectedNode && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                      <DetailRow icon={<Network size={13} />} label="Selected Node" value={<AddressDisplay address={selectedNode.id} chars={7} showCopy />} />
                      <DetailRow icon={<Info size={13} />} label="Node Type" value={<span style={{ textTransform: 'capitalize' }}>{selectedNode.type}</span>} />
                      <DetailRow icon={<Network size={13} />} label="Hop Distance" value={selectedNode.hopDistance} />
                    </>
                  )}
                  
                  {!selectedNode && !selectedEdge && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                      <EmptyState
                        title="No graph selection"
                        description="Select a node or edge in the graph to view specific details."
                      />
                    </>
                  )}

                  {traceData?.limitReached && (
                    <div style={{ marginTop: 16, padding: '12px', background: 'var(--danger-muted)', borderRadius: 'var(--r-md)', border: '1px solid var(--danger-border)', fontSize: 12, color: 'var(--danger)' }}>
                      <strong>Partial graph limits reached.</strong> The trace was halted early to prevent exceeding the 50 address cap.
                    </div>
                  )}
                </>
              )}

              {activeTab === 'Notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Session Notes (Not saved to database yet)</span>
                  <textarea
                    style={{ 
                      flex: 1, resize: 'none', background: 'var(--bg-elevated)', 
                      border: '1px solid var(--border)', borderRadius: 'var(--r-md)', 
                      padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, 
                      fontFamily: 'inherit', outline: 'none'
                    }}
                    placeholder="Type notes for this investigation here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

              {activeTab === 'Transaction' && selectedEdge && (
                (() => {
                  const tx = traceData?.transactions.find(t => t.hash === selectedEdge.hash);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <DetailRow icon={<Hash size={13} />} label="Transaction Hash" value={
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                           <span title={selectedEdge.hash}>{selectedEdge.hash.slice(0, 10)}…</span>
                           <Button variant="ghost" size="sm" iconOnly onClick={() => navigator.clipboard.writeText(selectedEdge.hash)} title="Copy Hash"><Tag size={12}/></Button>
                           <a href={`https://etherscan.io/tx/${selectedEdge.hash}`} target="_blank" rel="noreferrer" title="View on Etherscan"><ExternalLink size={12} /></a>
                        </div>
                      } />
                      <DetailRow icon={<ArrowLeft size={13} />} label="From" value={<AddressDisplay address={selectedEdge.source} chars={6} showCopy />} />
                      <DetailRow icon={<ArrowRight size={13} />} label="To" value={<AddressDisplay address={selectedEdge.target} chars={6} showCopy />} />
                      <DetailRow icon={<Info size={13} />} label="Amount" value={`${selectedEdge.value} ETH`} />
                      
                      {tx && (
                        <>
                          <DetailRow icon={<Calendar size={13} />} label="Timestamp" value={formatDate(tx.timestamp)} />
                          <DetailRow icon={<ArrowRight size={13} />} label="Direction" value={
                            <span style={{ textTransform: 'capitalize' }}>{tx.direction === 'in' ? 'Incoming' : 'Outgoing'}</span>
                          } />
                          <DetailRow icon={<Info size={13} />} label="Status" value={
                            <span style={{ color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)', textTransform: 'capitalize', fontWeight: 500 }}>
                              {tx.status}
                            </span>
                          } />
                        </>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </aside>
        </div>

        {/* Transaction table */}
        <div className="workspace__table-area">
          {tableData ? (
             <TransactionTable 
               data={tableData} 
               loading={tracing} 
               onPageChange={(page) => setTracePage(page)} 
             />
          ) : (
            <table className="table" style={{ minWidth: '100%' }}>
              <thead>
                <tr>{TABLE_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={TABLE_COLUMNS.length}>
                    <EmptyState
                      title="No transactions loaded"
                      description="Run a Trace to load and display transactions for this investigation."
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RenameModal
        investigation={renameOpen ? inv : null}
        onClose={() => setRenameOpen(false)}
        onSuccess={(updated) => { setInv(updated); setRenameOpen(false); }}
      />
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 11 }}>
        {icon}
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', paddingLeft: 2 }}>{value}</div>
    </div>
  );
}
