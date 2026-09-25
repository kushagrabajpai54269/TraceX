import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrainCircuit, ArrowLeft, AlertTriangle } from 'lucide-react';
import { investigationsApi } from '../services/api';
import type { Investigation, InvestigationAnalysis, InvestigationListResponse, TraceResponse } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/Feedback';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { InvestigationAssistant } from '../components/investigations/InvestigationAssistant';

export function IntelligencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [investigations, setInvestigations] = useState<InvestigationListResponse | null>(null);
  const [inv, setInv] = useState<Investigation | null>(null);
  
  const [analysis, setAnalysis] = useState<InvestigationAnalysis | null>(null);
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(true);
      investigationsApi.list({ sort: 'createdAt', dir: 'desc' })
        .then(setInvestigations)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      investigationsApi.get(id)
        .then(setInv)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  async function handleRunAnalysis() {
    if (!id) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setTrace(null);
    try {
      // 1. Fetch trace (Phase 6 requirement for trace context)
      const traceResult = await investigationsApi.trace(id, 3, 'both');
      setTrace(traceResult);
      // 2. Post to analysis
      const result = await investigationsApi.analyze(id, traceResult);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis.');
    } finally {
      setAnalyzing(false);
    }
  }

  // View: No ID provided -> Select an investigation
  if (!id) {
    if (loading) return <div className="page-container"><LoadingState message="Loading investigations..." /></div>;
    if (error) return <div className="page-container"><ErrorState message={error} /></div>;
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Intelligence</h1>
            <p className="page-subtitle">Select an investigation to analyze.</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Target Address</th>
              </tr>
            </thead>
            <tbody>
              {investigations?.investigations.map(inv => (
                <tr key={inv._id} className="clickable" onClick={() => navigate(`/intelligence/${inv._id}`)}>
                  <td><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{inv.title}</span></td>
                  <td><AddressDisplay address={inv.targetAddress} chars={8} /></td>
                </tr>
              ))}
              {investigations?.investigations.length === 0 && (
                <tr>
                  <td colSpan={2}><EmptyState title="No investigations" description="Create an investigation first." /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // View: Loading specific investigation
  if (loading) return <div className="page-container"><LoadingState message="Loading..." /></div>;

  // View: Investigation context
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <button className="workspace__back" onClick={() => navigate('/intelligence')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Selection
          </button>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={24} style={{ color: 'var(--accent)' }} /> 
            Intelligence: {inv?.title}
          </h1>
          <p className="page-subtitle">Deterministic blockchain analytics and pattern detection.</p>
        </div>
        <Button variant="primary" loading={analyzing} onClick={handleRunAnalysis}>
          Run Analysis
        </Button>
      </div>

      {error && <ErrorState title="Analysis Failed" message={error} />}

      {!analysis && !analyzing && !error && (
        <EmptyState title="No Analysis Generated" description="Click Run Analysis to fetch trace data and generate deterministic analytics." />
      )}
      
      {analyzing && <LoadingState message="Fetching trace data and running deterministic analysis..." />}

      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {analysis.limitations.map((limit, idx) => (
             <div key={idx} style={{ padding: 16, background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
               <AlertTriangle size={18} />
               <span>{limit}</span>
             </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Risk Score */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>Risk Score</h3>
              <div style={{ fontSize: 48, fontWeight: 300, color: analysis.riskScore >= 75 ? 'var(--danger)' : analysis.riskScore >= 50 ? 'var(--warning)' : 'var(--success)', marginBottom: 8 }}>
                {analysis.riskScore} <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>/ 100</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Risk score represents observed blockchain activity patterns requiring review. It does not establish fraud, ownership, criminal intent, or exchange affiliation.
              </p>
            </div>
            
            {/* Trace Statistics */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <StatBox label="Trace Depth" value={analysis.traceStatistics.depthUsed} />
                <StatBox label="Total Value Observed" value={`${analysis.traceStatistics.totalValueObserved} ETH`} />
                <StatBox label="Unique Addresses" value={analysis.traceStatistics.uniqueAddresses} />
                <StatBox label="Transactions" value={analysis.traceStatistics.uniqueTransactions} />
                <StatBox label="Incoming Txs" value={analysis.traceStatistics.incomingCount} />
                <StatBox label="Outgoing Txs" value={analysis.traceStatistics.outgoingCount} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
             {/* Patterns */}
             <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>Detected Patterns</h3>
                {analysis.patterns.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No significant patterns detected.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {analysis.patterns.map((p, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-app)', padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                           <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.05em' }}>{p.type.replace(/_/g, ' ')}</span>
                           <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: p.severity === 'HIGH' ? 'var(--danger-muted)' : 'var(--surface-3)', color: p.severity === 'HIGH' ? 'var(--danger)' : 'var(--text-primary)' }}>{p.severity}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>{p.explanation}</p>
                        {p.address && (
                           <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                             Target: <AddressDisplay address={p.address} chars={6} showCopy />
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
             </div>

             {/* Risk Indicators */}
             <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>Risk Contributors</h3>
                {analysis.riskIndicators.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No risk indicators contributed to the score.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.riskIndicators.map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-app)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.explanation}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>+{r.pointContribution}</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* ── AI Investigation Assistant — renders below deterministic analytics ── */}
      {analysis && trace && id && (
        <InvestigationAssistant
          investigationId={id}
          analysis={analysis}
          trace={trace}
        />
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'var(--bg-app)', padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}
