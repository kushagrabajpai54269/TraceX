// ============================================================
// Client-side TypeScript types — mirrors server types/index.ts
// Only include fields consumed by the frontend.
// ============================================================

export interface NormalizedTransaction {
  hash: string;
  blockNumber: number;
  timestamp: string;       // ISO 8601
  from: string;
  to: string;
  value: string;           // ETH (e.g. "1.5")
  valueWei: string;
  gasPrice: string;
  gasUsed: number;
  gasLimit: number;
  gasFee: string;          // ETH
  isError: boolean;
  status: 'success' | 'failed';
  confirmations: number;
  functionName?: string;
  direction: 'in' | 'out';
  contractAddress?: string;
}

export interface AddressInfo {
  address: string;
  balance: string;
  balanceWei: string;
}

export interface TransactionPage {
  address: string;
  balance: string;
  balanceWei: string;
  transactions: NormalizedTransaction[];
  page: number;
  limit: number;
  hasMore: boolean;
  dataSource: 'etherscan-mainnet';
}

export interface AddressValidation {
  valid: boolean;
  address: string | null;
  reason?: string;
}

// Investigation types
export type InvestigationStatus = 'active' | 'done' | 'archived';

export interface Investigation {
  _id: string;
  title: string;
  targetAddress: string;
  status: InvestigationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationListResponse {
  investigations: Investigation[];
  total: number;
}

export interface DashboardStats {
  total: number;
  active: number;
  done: number;
  archived: number;
  addressesTraced: null;
  transactionsFetched: null;
  recent: Investigation[];
}

export interface DeleteResponse {
  deleted: boolean;
  id: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    status: number;
    timestamp: string;
  };
}

// ── Phase 5: Graph & Tracing Types ────────────────────────────

export interface GraphNode {
  id: string; // The lowercase Ethereum address
  label: string; // Shortened address or known name
  type: 'root' | 'standard' | 'contract';
  hopDistance: number;
}

export interface GraphEdge {
  id: string; // hash
  source: string; // from address
  target: string; // to address
  value: string; // ETH value
  hash: string;
}

export interface TraceResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  transactions: NormalizedTransaction[];
  limitReached: boolean; // true if we hit the 50 address cap
}

// ── Phase 6: Intelligence & Analytics Types ───────────────────

export type PatternType = 
  | 'FAN_OUT'
  | 'FAN_IN'
  | 'HIGH_VALUE'
  | 'RAPID_MOVEMENT'
  | 'REPEATED_INTERMEDIARY'
  | 'DEEP_MOVEMENT'
  | 'HIGH_TRANSACTION_ACTIVITY';

export interface PatternIndicator {
  type: PatternType;
  address?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  evidence: string[];
}

export interface RiskIndicator {
  patternType: PatternType;
  pointContribution: number;
  explanation: string;
}

export interface InvestigationAnalysis {
  overview: {
    targetAddress: string;
  };
  traceStatistics: {
    depthUsed: number;
    uniqueAddresses: number;
    uniqueTransactions: number;
    graphNodes: number;
    graphEdges: number;
    maxHopDistance: number;
    incomingCount: number;
    outgoingCount: number;
    totalValueObserved: string;
    largestTransfer: string;
    earliestTransaction?: string;
    latestTransaction?: string;
    timeSpanDays: number;
  };
  fundFlow: {
    majorTransfers: { hash: string; value: string; from: string; to: string }[];
    importantCounterparties: string[];
    fanInAddresses: string[];
    fanOutAddresses: string[];
    repeatedIntermediaries: string[];
  };
  keyTransactions: NormalizedTransaction[];
  keyAddresses: string[];
  patterns: PatternIndicator[];
  riskIndicators: RiskIndicator[];
  riskScore: number;
  limitations: string[];
}

// ── Phase 7: AI Assistant Types ───────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
