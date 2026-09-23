import { generateAnalysis } from './analytics.service';
import type { TraceResponse, NormalizedTransaction } from '../types';
import { describe, it, expect } from 'vitest';

describe('generateAnalysis', () => {
  const root = '0x123';

  function createTx(from: string, to: string, val: string, time: string, dir: 'in' | 'out'): NormalizedTransaction {
    return {
      hash: Math.random().toString(36),
      from,
      to,
      valueWei: val,
      value: val === '0' ? '0' : '1.0',
      timestamp: time,
      direction: dir,
      blockNumber: 1,
      gasPrice: '0',
      gasUsed: 0,
      gasLimit: 0,
      gasFee: '0',
      isError: false,
      status: 'success',
      confirmations: 1
    };
  }

  it('detects FAN_OUT pattern properly', () => {
    const trace: TraceResponse = {
      limitReached: false,
      nodes: [
        { id: root, label: '', type: 'root', hopDistance: 0 },
        { id: 'a', label: '', type: 'standard', hopDistance: 1 },
        { id: 'b', label: '', type: 'standard', hopDistance: 1 },
        { id: 'c', label: '', type: 'standard', hopDistance: 1 },
      ],
      edges: [],
      transactions: [
        createTx(root, 'a', '1000', new Date().toISOString(), 'out'),
        createTx(root, 'b', '1000', new Date().toISOString(), 'out'),
        createTx(root, 'c', '1000', new Date().toISOString(), 'out'),
      ]
    };

    const analysis = generateAnalysis(trace, root);
    
    expect(analysis.patterns.some(p => p.type === 'FAN_OUT' && p.address === root)).toBe(true);
    expect(analysis.riskIndicators.some(r => r.patternType === 'FAN_OUT')).toBe(true);
    expect(analysis.riskScore).toBeGreaterThan(0);
  });

  it('detects RAPID_MOVEMENT pattern properly', () => {
    const now = Date.now();
    const trace: TraceResponse = {
      limitReached: false,
      nodes: [
        { id: root, label: '', type: 'root', hopDistance: 0 },
        { id: 'a', label: '', type: 'standard', hopDistance: 1 },
      ],
      edges: [],
      transactions: [
        createTx(root, 'a', '1000', new Date(now).toISOString(), 'out'),
        createTx('a', 'b', '1000', new Date(now + 60000).toISOString(), 'out'), // 1 min later
      ]
    };

    const analysis = generateAnalysis(trace, root);
    expect(analysis.patterns.some(p => p.type === 'RAPID_MOVEMENT' && p.address === 'a')).toBe(true);
  });

  it('detects HIGH_VALUE transfers', () => {
    const trace: TraceResponse = {
      limitReached: false,
      nodes: [
        { id: root, label: '', type: 'root', hopDistance: 0 },
      ],
      edges: [],
      transactions: [
        createTx(root, 'a', '1', new Date().toISOString(), 'out'),
        createTx(root, 'b', '1', new Date().toISOString(), 'out'),
        createTx(root, 'c', '1', new Date().toISOString(), 'out'),
        createTx(root, 'd', '100', new Date().toISOString(), 'out'), // outlier
      ]
    };

    const analysis = generateAnalysis(trace, root);
    expect(analysis.patterns.some(p => p.type === 'HIGH_VALUE')).toBe(true);
  });

  it('handles empty trace properly', () => {
    const trace: TraceResponse = {
      limitReached: false,
      nodes: [{ id: root, label: '', type: 'root', hopDistance: 0 }],
      edges: [],
      transactions: []
    };
    const analysis = generateAnalysis(trace, root);
    expect(analysis.patterns.length).toBe(0);
    expect(analysis.riskScore).toBe(0);
    expect(analysis.traceStatistics.totalValueObserved).toBe('0');
  });

  it('does not inflate risk score for multiple same patterns', () => {
    const trace: TraceResponse = {
      limitReached: false,
      nodes: [{ id: root, label: '', type: 'root', hopDistance: 0 }],
      edges: [],
      transactions: [
        createTx(root, 'a', '1000', new Date().toISOString(), 'out'),
        createTx(root, 'b', '1000', new Date().toISOString(), 'out'),
        createTx(root, 'c', '1000', new Date().toISOString(), 'out'),
        
        createTx('a', 'd', '1000', new Date().toISOString(), 'out'),
        createTx('a', 'e', '1000', new Date().toISOString(), 'out'),
        createTx('a', 'f', '1000', new Date().toISOString(), 'out'),
      ]
    };
    
    // Both root and 'a' fan out. So 2 FAN_OUT patterns, but score should only include +10 for FAN_OUT once.
    const analysis = generateAnalysis(trace, root);
    const fanOutCount = analysis.patterns.filter(p => p.type === 'FAN_OUT').length;
    expect(fanOutCount).toBe(2);
    
    const riskScoreFromFanOut = analysis.riskIndicators.filter(r => r.patternType === 'FAN_OUT');
    expect(riskScoreFromFanOut.length).toBe(1);
    expect(riskScoreFromFanOut[0].pointContribution).toBe(10);
  });
});
