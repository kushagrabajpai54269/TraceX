// ============================================================
// Phase 7: AI Service Tests
// Tests context building, validation, and missing-key handling.
// Does NOT make real OpenAI API calls.
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildContextString, askAssistant } from './ai.service';
import type { InvestigationContext } from './ai.service';
import type { InvestigationAnalysis } from '../types';

// ── Helpers ───────────────────────────────────────────────────

function makeAnalysis(overrides: Partial<InvestigationAnalysis> = {}): InvestigationAnalysis {
  return {
    overview: { targetAddress: '0xabc' },
    traceStatistics: {
      depthUsed: 2,
      uniqueAddresses: 5,
      uniqueTransactions: 10,
      graphNodes: 5,
      graphEdges: 8,
      maxHopDistance: 2,
      incomingCount: 4,
      outgoingCount: 6,
      totalValueObserved: '3.5',
      largestTransfer: '2.0',
      earliestTransaction: '2024-01-01T00:00:00Z',
      latestTransaction: '2024-01-05T00:00:00Z',
      timeSpanDays: 4,
    },
    fundFlow: {
      majorTransfers: [{ hash: '0xhash1', value: '2.0', from: '0xabc', to: '0xdef' }],
      importantCounterparties: ['0xdef'],
      fanInAddresses: [],
      fanOutAddresses: ['0xabc'],
      repeatedIntermediaries: [],
    },
    keyTransactions: [],
    keyAddresses: ['0xabc', '0xdef'],
    patterns: [
      { type: 'FAN_OUT', address: '0xabc', severity: 'MEDIUM', explanation: 'Sent to 3 counterparties.', evidence: ['0xdef', '0xghi', '0xjkl'] },
    ],
    riskIndicators: [
      { patternType: 'FAN_OUT', pointContribution: 10, explanation: 'Fan-out activity detected.' },
    ],
    riskScore: 10,
    limitations: [],
    ...overrides,
  };
}

function makeContext(overrides: Partial<InvestigationContext> = {}): InvestigationContext {
  return {
    investigationId: 'inv123',
    title: 'Test Investigation',
    targetAddress: '0xabc',
    analysis: makeAnalysis(),
    traceDepth: 2,
    limitReached: false,
    ...overrides,
  };
}

// ── buildContextString ────────────────────────────────────────

describe('buildContextString', () => {
  it('includes the target address and investigation title', () => {
    const ctx = makeContext();
    const str = buildContextString(ctx);
    expect(str).toContain('0xabc');
    expect(str).toContain('Test Investigation');
  });

  it('includes risk score', () => {
    const ctx = makeContext();
    const str = buildContextString(ctx);
    expect(str).toContain('10 / 100');
  });

  it('includes detected pattern type', () => {
    const ctx = makeContext();
    const str = buildContextString(ctx);
    expect(str).toContain('FAN_OUT');
  });

  it('includes limitation warning when limitReached is true', () => {
    const ctx = makeContext({
      limitReached: true,
      analysis: makeAnalysis({
        limitations: ['Trace was partially completed because maximum node/transaction limits were reached.'],
      }),
    });
    const str = buildContextString(ctx);
    expect(str).toContain('Trace was partially completed');
  });

  it('shows no limitations when limitReached is false and none set', () => {
    const ctx = makeContext();
    const str = buildContextString(ctx);
    expect(str).toContain('No limitations reported');
  });
});

// ── askAssistant: missing key handling ────────────────────────

describe('askAssistant — missing API key', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    // Reset module-level singleton so it re-reads the env var
    vi.resetModules();
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it('throws when OPENAI_API_KEY is not set', async () => {
    // Re-import after resetting modules so the singleton is fresh
    const { askAssistant: freshAsk } = await import('./ai.service');
    await expect(
      freshAsk({ message: 'hello', history: [], context: makeContext() })
    ).rejects.toThrow('OPENAI_API_KEY');
  });

  it('throws when OPENAI_API_KEY is the placeholder', async () => {
    process.env.OPENAI_API_KEY = 'your_openai_api_key_here';
    const { askAssistant: freshAsk } = await import('./ai.service');
    await expect(
      freshAsk({ message: 'hello', history: [], context: makeContext() })
    ).rejects.toThrow('OPENAI_API_KEY');
  });
});

// ── askAssistant: input validation ────────────────────────────

describe('askAssistant — input validation', () => {
  it('throws for empty message', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key-12345';
    const { askAssistant: freshAsk } = await import('./ai.service');
    await expect(
      freshAsk({ message: '', history: [], context: makeContext() })
    ).rejects.toThrow('Message must be a non-empty string');
  });
});