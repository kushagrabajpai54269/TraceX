import { getTransactions } from './etherscan.service';
import type { GraphNode, GraphEdge, TraceResponse, NormalizedTransaction } from '../types';

export type Direction = 'both' | 'incoming' | 'outgoing';

/**
 * Perform a bounded Breadth-First Search trace.
 * Limits: maxDepth (up to 3), maxNodes (50), maxTxPerFetch (50)
 */
export async function performTrace(
  rootAddress: string,
  maxDepth: number,
  direction: Direction
): Promise<TraceResponse> {
  const root = rootAddress.toLowerCase();
  
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const transactions = new Map<string, NormalizedTransaction>();
  
  // BFS queue stores: { address, currentDepth }
  const queue: { address: string; depth: number }[] = [{ address: root, depth: 0 }];
  
  nodes.set(root, {
    id: root,
    label: `${root.slice(0, 6)}…${root.slice(-4)}`,
    type: 'root',
    hopDistance: 0,
  });

  let limitReached = false;
  const maxNodes = 50;
  const maxTxPerFetch = 50;

  while (queue.length > 0) {
    if (nodes.size >= maxNodes) {
      limitReached = true;
      break;
    }

    const current = queue.shift()!;
    
    // Stop exploring if this address is already at max depth
    if (current.depth >= maxDepth) {
      continue;
    }

    let txResult;
    try {
      txResult = await getTransactions(current.address, 1, maxTxPerFetch);
    } catch (err) {
      // Partial failure: if one address fails (e.g. rate limit / network error),
      // we log it and continue exploring other branches to preserve partial graphs.
      console.error(`[TraceX] Error fetching transactions for ${current.address}:`, err);
      continue;
    }

    // Process transactions
    for (const tx of txResult.transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      
      // Determine if this tx matches the requested direction relative to 'current'
      const isOutgoing = from === current.address;
      const isIncoming = to === current.address;

      if (direction === 'incoming' && !isIncoming) continue;
      if (direction === 'outgoing' && !isOutgoing) continue;

      // Identify the counterparty to potentially explore next
      const counterparty = isOutgoing ? to : from;

      // If counterparty is empty (e.g., contract creation), skip
      if (!counterparty) continue;

      // Ensure counterparty exists or can be added before retaining the edge
      if (!nodes.has(counterparty)) {
        // Enforce the graph size cap before adding a new node
        if (nodes.size >= maxNodes) {
          limitReached = true;
          // Skip retaining this edge and transaction since endpoint is excluded
          continue; 
        }

        nodes.set(counterparty, {
          id: counterparty,
          label: `${counterparty.slice(0, 6)}…${counterparty.slice(-4)}`,
          type: 'standard',
          hopDistance: current.depth + 1,
        });

        // Enqueue the counterparty for the next depth layer
        queue.push({ address: counterparty, depth: current.depth + 1 });
      } else {
        // If the node already exists, ensure its hopDistance is the minimum possible
        const existingNode = nodes.get(counterparty)!;
        if (current.depth + 1 < existingNode.hopDistance) {
          existingNode.hopDistance = current.depth + 1;
        }
      }

      // Deduplicate transactions by hash
      if (!transactions.has(tx.hash)) {
        transactions.set(tx.hash, tx);
      }
      
      // Add edge safely
      if (!edges.has(tx.hash)) {
        edges.set(tx.hash, {
          id: tx.hash,
          source: from,
          target: to,
          value: tx.value,
          hash: tx.hash
        });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    transactions: Array.from(transactions.values()),
    limitReached,
  };
}
