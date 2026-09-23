import { TraceResponse, InvestigationAnalysis, PatternIndicator, RiskIndicator, PatternType, NormalizedTransaction, GraphNode } from '../types';
import { weiToEth } from './etherscan.service';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const FAN_THRESHOLD = 3; // >3 counterparties = fan out/in
const HIGH_ACTIVITY_THRESHOLD = 15; // Transactions per address to be an outlier

export function generateAnalysis(trace: TraceResponse, targetAddress: string): InvestigationAnalysis {
  const root = targetAddress.toLowerCase();
  const txs = trace.transactions;
  const nodes = trace.nodes;
  const edges = trace.edges;

  // -- Trace Statistics --
  const uniqueAddresses = new Set<string>();
  let maxHop = 0;
  let incomingCount = 0;
  let outgoingCount = 0;
  let totalWei = 0n;
  let largestWei = 0n;
  let largestTx: NormalizedTransaction | null = null;
  let earliestMs = Infinity;
  let latestMs = -Infinity;

  nodes.forEach(n => {
    uniqueAddresses.add(n.id);
    if (n.hopDistance > maxHop) maxHop = n.hopDistance;
  });

  const txByAddress = new Map<string, NormalizedTransaction[]>();
  const counterpartySets = new Map<string, { in: Set<string>; out: Set<string> }>();

  for (const tx of txs) {
    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    
    uniqueAddresses.add(from);
    if (to) uniqueAddresses.add(to);

    if (tx.direction === 'in') incomingCount++;
    if (tx.direction === 'out') outgoingCount++;

    const valWei = BigInt(tx.valueWei);
    totalWei += valWei;
    if (valWei > largestWei) {
      largestWei = valWei;
      largestTx = tx;
    }

    const txTime = new Date(tx.timestamp).getTime();
    if (txTime < earliestMs) earliestMs = txTime;
    if (txTime > latestMs) latestMs = txTime;

    // Track per address for patterns
    if (!txByAddress.has(from)) txByAddress.set(from, []);
    txByAddress.get(from)!.push(tx);
    
    if (to) {
      if (!txByAddress.has(to)) txByAddress.set(to, []);
      txByAddress.get(to)!.push(tx);
    }

    // Track counterparties
    if (!counterpartySets.has(from)) counterpartySets.set(from, { in: new Set(), out: new Set() });
    if (to) {
      if (!counterpartySets.has(to)) counterpartySets.set(to, { in: new Set(), out: new Set() });
      counterpartySets.get(from)!.out.add(to);
      counterpartySets.get(to)!.in.add(from);
    }
  }

  let timeSpanDays = 0;
  let earliestIso: string | undefined = undefined;
  let latestIso: string | undefined = undefined;
  if (earliestMs !== Infinity && latestMs !== -Infinity) {
    timeSpanDays = (latestMs - earliestMs) / (1000 * 60 * 60 * 24);
    earliestIso = new Date(earliestMs).toISOString();
    latestIso = new Date(latestMs).toISOString();
  }

  // Calculate average value for HIGH_VALUE threshold
  const avgWei = txs.length > 0 ? totalWei / BigInt(txs.length) : 0n;
  const highValueThreshold = avgWei * 3n; // 3x average

  // -- Pattern Detection --
  const patterns: PatternIndicator[] = [];
  const riskIndicators: RiskIndicator[] = [];
  
  const addRisk = (type: PatternType, points: number, explanation: string) => {
    if (!riskIndicators.some(r => r.patternType === type)) {
      riskIndicators.push({ patternType: type, pointContribution: points, explanation });
    }
  };

  const fanInAddresses: string[] = [];
  const fanOutAddresses: string[] = [];
  const repeatedIntermediaries = new Set<string>();
  const keyTxSet = new Set<string>();
  const keyAddrSet = new Set<string>();

  // Detect Node Patterns
  for (const [addr, cps] of counterpartySets.entries()) {
    if (cps.out.size >= FAN_THRESHOLD) {
      fanOutAddresses.push(addr);
      keyAddrSet.add(addr);
      patterns.push({
        type: 'FAN_OUT',
        address: addr,
        severity: 'MEDIUM',
        explanation: `Address sent funds to ${cps.out.size} distinct counterparties.`,
        evidence: Array.from(cps.out)
      });
      addRisk('FAN_OUT', 10, 'Fan-out activity detected.');
    }
    if (cps.in.size >= FAN_THRESHOLD) {
      fanInAddresses.push(addr);
      keyAddrSet.add(addr);
      patterns.push({
        type: 'FAN_IN',
        address: addr,
        severity: 'MEDIUM',
        explanation: `Address received funds from ${cps.in.size} distinct counterparties.`,
        evidence: Array.from(cps.in)
      });
      addRisk('FAN_IN', 10, 'Fan-in activity detected.');
    }
  }

  // Detect Repeated Intermediaries
  nodes.forEach(n => {
    // A repeated intermediary might have transactions with multiple other nodes at different hops
    const cps = counterpartySets.get(n.id);
    if (n.id !== root && cps && (cps.in.size + cps.out.size > 2)) {
      repeatedIntermediaries.add(n.id);
      keyAddrSet.add(n.id);
      patterns.push({
        type: 'REPEATED_INTERMEDIARY',
        address: n.id,
        severity: 'LOW',
        explanation: `Address acts as an intermediary for multiple distinct flows.`,
        evidence: Array.from(new Set([...Array.from(cps.in), ...Array.from(cps.out)]))
      });
      addRisk('REPEATED_INTERMEDIARY', 10, 'Repeated intermediary observed.');
    }
  });

  // Detect High Transaction Activity
  for (const [addr, addrTxs] of txByAddress.entries()) {
    if (addrTxs.length >= HIGH_ACTIVITY_THRESHOLD) {
      keyAddrSet.add(addr);
      patterns.push({
        type: 'HIGH_TRANSACTION_ACTIVITY',
        address: addr,
        severity: 'MEDIUM',
        explanation: `Address is involved in an unusually high number of transactions (${addrTxs.length}).`,
        evidence: addrTxs.map(t => t.hash)
      });
      addRisk('HIGH_TRANSACTION_ACTIVITY', 10, 'High transaction activity observed.');
    }
    
    // Detect Rapid Movement (<= 5 mins)
    // Sort transactions by time
    const sorted = [...addrTxs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const t1 = sorted[i];
      const t2 = sorted[i+1];
      const timeDiff = new Date(t2.timestamp).getTime() - new Date(t1.timestamp).getTime();
      
      if (timeDiff >= 0 && timeDiff <= FIVE_MINUTES_MS) {
        keyAddrSet.add(addr);
        keyTxSet.add(t1.hash);
        keyTxSet.add(t2.hash);
        patterns.push({
          type: 'RAPID_MOVEMENT',
          address: addr,
          severity: 'HIGH',
          explanation: `Funds moved rapidly (within 5 minutes) involving this address.`,
          evidence: [t1.hash, t2.hash]
        });
        addRisk('RAPID_MOVEMENT', 15, 'Rapid movement of funds detected.');
        break; // Only flag once per address to avoid spam
      }
    }
  }

  // Detect High Value Transfers
  txs.forEach(tx => {
    const valWei = BigInt(tx.valueWei);
    if (valWei > 0n && valWei >= highValueThreshold && txs.length > 3) {
      keyTxSet.add(tx.hash);
      keyAddrSet.add(tx.from);
      if (tx.to) keyAddrSet.add(tx.to);
      patterns.push({
        type: 'HIGH_VALUE',
        severity: 'MEDIUM',
        explanation: `Transaction value (${tx.value} ETH) is significantly higher than the trace average.`,
        evidence: [tx.hash]
      });
      addRisk('HIGH_VALUE', 10, 'High-value transfers relative to trace detected.');
    }
  });

  // Deep Movement
  if (maxHop >= 3) {
    patterns.push({
      type: 'DEEP_MOVEMENT',
      severity: 'LOW',
      explanation: `Funds traced across 3 or more hops.`,
      evidence: nodes.filter(n => n.hopDistance >= 3).map(n => n.id)
    });
    addRisk('DEEP_MOVEMENT', 5, 'Multi-hop deep movement observed.');
  }

  const riskScore = Math.min(100, riskIndicators.reduce((acc, ind) => acc + ind.pointContribution, 0));

  const limitations: string[] = [];
  if (trace.limitReached) {
    limitations.push(
      'Analysis limitation: Trace was partially completed because maximum node/transaction limits were reached. Risk score is based only on the successfully retrieved portion of the trace.'
    );
  }

  const keyTransactions = txs.filter(tx => keyTxSet.has(tx.hash) || tx.hash === largestTx?.hash);
  const keyAddresses = Array.from(keyAddrSet);
  
  if (largestTx && !keyTransactions.find(t => t.hash === largestTx!.hash)) {
    keyTransactions.push(largestTx);
  }

  const majorTransfers = txs
    .map(t => ({ hash: t.hash, value: t.value, from: t.from, to: t.to, valWei: BigInt(t.valueWei) }))
    .sort((a, b) => a.valWei < b.valWei ? 1 : -1)
    .slice(0, 5)
    .map(t => ({ hash: t.hash, value: t.value, from: t.from, to: t.to }));

  // Sort important counterparties by frequency
  const counterpartyCounts = new Map<string, number>();
  nodes.forEach(n => {
    if (n.id !== root) {
      const cps = counterpartySets.get(n.id);
      counterpartyCounts.set(n.id, (cps?.in.size || 0) + (cps?.out.size || 0));
    }
  });
  const importantCounterparties = Array.from(counterpartyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);

  return {
    overview: {
      targetAddress: root,
    },
    traceStatistics: {
      depthUsed: maxHop,
      uniqueAddresses: uniqueAddresses.size,
      uniqueTransactions: txs.length,
      graphNodes: nodes.length,
      graphEdges: edges.length,
      maxHopDistance: maxHop,
      incomingCount,
      outgoingCount,
      totalValueObserved: weiToEth(totalWei.toString()),
      largestTransfer: largestTx ? largestTx.value : '0',
      earliestTransaction: earliestIso,
      latestTransaction: latestIso,
      timeSpanDays: Number(timeSpanDays.toFixed(2)),
    },
    fundFlow: {
      majorTransfers,
      importantCounterparties,
      fanInAddresses,
      fanOutAddresses,
      repeatedIntermediaries: Array.from(repeatedIntermediaries),
    },
    keyTransactions,
    keyAddresses,
    patterns,
    riskIndicators,
    riskScore,
    limitations,
  };
}
