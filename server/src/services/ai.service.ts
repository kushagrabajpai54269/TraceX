// ============================================================
// AI Investigation Assistant Service — Phase 7
// Builds a bounded investigation context and calls OpenAI.
// The API key never leaves the backend.
// ============================================================
import OpenAI from 'openai';
import type { InvestigationAnalysis, TraceResponse } from '../types';

// ── Lazy singleton — only created when first needed ───────────
let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (_openai) return _openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY is not configured. Set it in server/.env.');
  }

  _openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: 30_000,
    maxRetries: 1,
  });
  return _openai;
}

// ── Dynamic OpenRouter Free Model Fallback ───────────
let _cachedFreeModels: string | null = null;

async function getFallbackModelString(): Promise<string> {
  if (_cachedFreeModels) return _cachedFreeModels as string;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('Failed to fetch models');
    const json = await res.json() as any;
    // Filter out free models, take the first 10 to build a robust fallback list
    const freeModels = json.data
      .filter((m: any) => m.id.endsWith(':free'))
      .map((m: any) => m.id);
    
    if (freeModels.length > 0) {
      const fallbackStr = freeModels.slice(0, 10).join(',');
      _cachedFreeModels = fallbackStr;
      return fallbackStr;
    }
  } catch (err) {
    console.error('Failed to dynamically fetch OpenRouter free models, using fallback.');
  }
  // Hardcoded reliable fallbacks if dynamic fetch fails
  return process.env.AI_MODEL || 'qwen/qwen3.8-27b:free,liquid/lfm-2.5-2.6b:free,google/gemma-4-26b-a4b-it:free';
}

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an evidence-grounded blockchain investigation assistant integrated into TraceX.

Your role:
- Help investigators understand the blockchain analysis already computed by TraceX deterministic analytics.
- Interpret supplied evidence to answer questions concisely and accurately.

Strict rules you must always follow:
1. Treat TraceX deterministic analytics as authoritative. Do not invent, recalculate or override the risk score.
2. Do not invent transactions, addresses, amounts, timestamps, patterns, or relationships not present in the supplied context.
3. If information is not in the supplied investigation context, explicitly say it is unavailable in this trace.
4. Clearly distinguish observed facts from analytical interpretation.
5. Explain conclusions using evidence actually present in the supplied context.
6. Acknowledge partial-trace limitations when relevant (when limitReached is true).
7. Never state a wallet is definitely fraudulent, criminal, laundering funds, or owned by any specific entity.
8. Never claim exchange or VASP ownership or affiliation without verified evidence.
9. Do not calculate or present a new risk score. The deterministic score is final.
10. Do not present speculation as established fact.
11. Keep answers concise and useful for a professional investigator.
12. If asked about something outside the investigation context (e.g. other wallets, general blockchain data), clarify that you can only discuss the current investigation's supplied evidence.

You are an assistant for interpreting supplied evidence. You are not the source of truth.`;

// ── Context builder ───────────────────────────────────────────

export interface InvestigationContext {
  investigationId: string;
  title: string;
  targetAddress: string;
  analysis: InvestigationAnalysis;
  traceDepth: number;
  limitReached: boolean;
}

/**
 * Build a bounded, serialised investigation context string to send as
 * system context to the model. Deliberately excludes raw transactions
 * (beyond key ones) to avoid ballooning the context window.
 */
export function buildContextString(ctx: InvestigationContext): string {
  const { analysis, title, targetAddress } = ctx;
  const { traceStatistics: ts, fundFlow: ff, patterns, riskIndicators, riskScore, limitations, keyAddresses } = analysis;

  const lines: string[] = [
    `=== TRACEX INVESTIGATION CONTEXT ===`,
    `Investigation: ${title}`,
    `Target address: ${targetAddress}`,
    `Investigation ID: ${ctx.investigationId}`,
    ``,
    `--- TRACE STATISTICS ---`,
    `Trace depth used: ${ts.depthUsed}`,
    `Unique addresses: ${ts.uniqueAddresses}`,
    `Unique transactions: ${ts.uniqueTransactions}`,
    `Graph nodes: ${ts.graphNodes} | Graph edges: ${ts.graphEdges}`,
    `Incoming transactions: ${ts.incomingCount} | Outgoing transactions: ${ts.outgoingCount}`,
    `Total value observed: ${ts.totalValueObserved} ETH`,
    `Largest single transfer: ${ts.largestTransfer} ETH`,
    `Earliest transaction: ${ts.earliestTransaction ?? 'N/A'}`,
    `Latest transaction: ${ts.latestTransaction ?? 'N/A'}`,
    `Time span: ${ts.timeSpanDays} days`,
    `Trace limit reached (partial trace): ${ctx.limitReached}`,
    ``,
    `--- RISK SCORE ---`,
    `Deterministic risk score: ${riskScore} / 100`,
    `(This score represents observed patterns only. It does not establish fraud, criminal intent, or ownership.)`,
    ``,
    `--- RISK CONTRIBUTORS ---`,
    riskIndicators.length === 0
      ? 'No risk indicators contributed to the score.'
      : riskIndicators.map(r => `  [${r.patternType}] +${r.pointContribution} pts — ${r.explanation}`).join('\n'),
    ``,
    `--- DETECTED PATTERNS (${patterns.length} total) ---`,
    patterns.length === 0
      ? 'No significant patterns detected.'
      : patterns.map(p => {
          const addr = p.address ? ` | address: ${p.address}` : '';
          const ev = p.evidence.length > 0 ? ` | evidence: ${p.evidence.slice(0, 5).join(', ')}` : '';
          return `  [${p.type}] severity: ${p.severity}${addr}\n    ${p.explanation}${ev}`;
        }).join('\n'),
    ``,
    `--- FUND FLOW ---`,
    `Fan-out addresses (${ff.fanOutAddresses.length}): ${ff.fanOutAddresses.slice(0, 10).join(', ') || 'none'}`,
    `Fan-in addresses (${ff.fanInAddresses.length}): ${ff.fanInAddresses.slice(0, 10).join(', ') || 'none'}`,
    `Repeated intermediaries (${ff.repeatedIntermediaries.length}): ${ff.repeatedIntermediaries.slice(0, 10).join(', ') || 'none'}`,
    ``,
    `Top counterparties by activity: ${ff.importantCounterparties.slice(0, 10).join(', ') || 'none'}`,
    ``,
    `Major transfers (by value):`,
    ff.majorTransfers.slice(0, 5).map(t => `  ${t.value} ETH — from ${t.from} → ${t.to} | hash: ${t.hash}`).join('\n') || '  None',
    ``,
    `Key addresses flagged: ${keyAddresses.slice(0, 20).join(', ') || 'none'}`,
    ``,
    `--- ANALYSIS LIMITATIONS ---`,
    limitations.length === 0
      ? 'No limitations reported. Trace may be complete.'
      : limitations.map(l => `  ⚠ ${l}`).join('\n'),
    ``,
    `=== END OF INVESTIGATION CONTEXT ===`,
  ];

  return lines.join('\n');
}

// ── Chat message types ────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  message: string;
  history: ChatMessage[];
  context: InvestigationContext;
}

export interface AssistantResponse {
  reply: string;
}

// ── Max limits ────────────────────────────────────────────────
const MAX_USER_MESSAGE_CHARS = 5_000;
const MAX_HISTORY_MESSAGES   = 20;   // total kept client-side; we send last N
const MAX_HISTORY_TO_SEND    = 10;   // last 10 turns sent to model
const MAX_OUTPUT_TOKENS       = 800;

// ── Main call ─────────────────────────────────────────────────

export async function askAssistant(req: AssistantRequest): Promise<AssistantResponse> {
  const client = getClient(); // throws if no key

  // Validate input
  if (!req.message || typeof req.message !== 'string') {
    throw new Error('Message must be a non-empty string.');
  }
  const userMessage = req.message.slice(0, MAX_USER_MESSAGE_CHARS);

  // Build investigation context string
  const contextString = buildContextString(req.context);

  // Build messages: system + context injection + trimmed history + current message
  const trimmedHistory = req.history.slice(-MAX_HISTORY_TO_SEND);

  const modelToUse = process.env.OPENAI_BASE_URL?.includes('openrouter')
    ? await getFallbackModelString()
    : process.env.AI_MODEL || 'gpt-3.5-turbo';

  const response = await client.chat.completions.create({
    model: modelToUse,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,         // Low temperature for factual, evidence-grounded answers
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `The following is the complete investigation context for this session. Use it as the authoritative source of evidence when answering questions.\n\n${contextString}`,
      },
      ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  });

  const reply = response.choices[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('The AI model returned an empty response. Please try again.');
  }

  return { reply };
}
