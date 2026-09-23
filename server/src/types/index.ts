// ============================================================
// Shared server-side types for TraceX v2
// ============================================================

/** Raw transaction object returned by Etherscan API */
export interface EtherscanRawTx {
  blockNumber: string;
  blockHash: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;          // Wei
  gas: string;            // gas limit
  gasPrice: string;       // Wei
  isError: string;        // "0" | "1"
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId?: string;
  functionName?: string;
}

/** Normalized transaction — consumed by the frontend */
export interface NormalizedTransaction {
  hash: string;
  blockNumber: number;
  timestamp: string;        // ISO 8601
  from: string;
  to: string;
  value: string;            // ETH, formatted (e.g. "1.5")
  valueWei: string;         // raw Wei string
  gasPrice: string;         // Wei
  gasUsed: number;
  gasLimit: number;
  gasFee: string;           // ETH, formatted (gasPrice × gasUsed)
  isError: boolean;
  status: 'success' | 'failed';
  confirmations: number;
  functionName?: string;
  direction: 'in' | 'out'; // relative to the queried address
  contractAddress?: string;
}

/** Address balance info */
export interface AddressInfo {
  address: string;
  balance: string;          // ETH
  balanceWei: string;
}

/** Paginated transaction response */
export interface TransactionPage {
  address: string;
  balance: string;
  balanceWei: string;
  transactions: NormalizedTransaction[];
  page: number;
  limit: number;
  hasMore: boolean;
  dataSource: 'etherscan-mainnet';  // Always declare data source
}

/** Address validation response */
export interface AddressValidation {
  valid: boolean;
  address: string | null;
  reason?: string;
}

/** Standard API error shape */
export interface ApiError {
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
  address?: string; // Optional if the pattern is global, but usually specific
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  evidence: string[]; // transaction hashes, counterparties, etc.
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
    totalValueObserved: string; // ETH
    largestTransfer: string; // ETH
    earliestTransaction?: string; // ISO 8601
    latestTransaction?: string; // ISO 8601
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
