import assert from 'assert';
import { performTrace, Direction } from './src/services/tracing.service';
import * as etherscanService from './src/services/etherscan.service';

// We will monkey-patch getTransactions for this standalone test script.
const originalGetTransactions = etherscanService.getTransactions;

let mockResponses: Record<string, any[]> = {};

// Monkey patch
(etherscanService as any).getTransactions = async (address: string) => {
  if (address === 'fail') {
    throw new Error('Mock network failure');
  }
  const txs = mockResponses[address] || [];
  return { transactions: txs, hasMore: false };
};

async function runTests() {
  console.log('--- Running BFS Tracing Unit Tests ---');

  // Test 1: Depth 1, Both Directions
  mockResponses = {
    'root': [
      { hash: 'tx1', from: 'root', to: 'a', value: '1', direction: 'out' },
      { hash: 'tx2', from: 'b', to: 'root', value: '2', direction: 'in' }
    ]
  };
  
  let res = await performTrace('root', 1, 'both');
  assert.strictEqual(res.nodes.length, 3, 'Root + A + B should be 3 nodes');
  assert.strictEqual(res.edges.length, 2, '2 edges');
  assert.strictEqual(res.nodes.find(n => n.id === 'root')?.hopDistance, 0);
  assert.strictEqual(res.nodes.find(n => n.id === 'a')?.hopDistance, 1);
  console.log('✅ Test 1 Passed: Depth 1 Both Directions');

  // Test 2: Direction = Incoming Only
  res = await performTrace('root', 1, 'incoming');
  assert.strictEqual(res.nodes.length, 2, 'Root + B should be 2 nodes (incoming only)');
  assert.strictEqual(res.edges.length, 1);
  console.log('✅ Test 2 Passed: Incoming Direction filter');

  // Test 3: Depth 2, Cycles & Min Hop Distance
  mockResponses = {
    'root': [
      { hash: 'tx1', from: 'root', to: 'a', value: '1', direction: 'out' }
    ],
    'a': [
      { hash: 'tx2', from: 'a', to: 'b', value: '1', direction: 'out' },
      { hash: 'tx3', from: 'a', to: 'root', value: '1', direction: 'out' } // cycle back to root
    ],
    'b': [
      { hash: 'tx4', from: 'b', to: 'root', value: '1', direction: 'out' } // cycle back to root
    ]
  };
  res = await performTrace('root', 2, 'both');
  assert.strictEqual(res.nodes.length, 3, 'Root + A + B = 3 nodes');
  // Root distance should still be 0, not overridden by the cycle!
  assert.strictEqual(res.nodes.find(n => n.id === 'root')?.hopDistance, 0, 'Root distance should be 0');
  assert.strictEqual(res.nodes.find(n => n.id === 'b')?.hopDistance, 2, 'B distance should be 2');
  assert.strictEqual(res.edges.length, 3, '3 transactions in total (tx4 is not fetched because B is at max depth 2)');
  console.log('✅ Test 3 Passed: Cycles and Minimum Hop Distance preserved');

  // Test 4: Deduplication of edges (multiple txs between same wallets)
  mockResponses = {
    'root': [
      { hash: 'tx1', from: 'root', to: 'a', value: '1', direction: 'out' },
      { hash: 'tx1', from: 'root', to: 'a', value: '1', direction: 'out' } // Exact same hash
    ]
  };
  res = await performTrace('root', 1, 'both');
  assert.strictEqual(res.edges.length, 1, 'Should deduplicate by tx hash');
  console.log('✅ Test 4 Passed: Transaction Hash Deduplication');

  // Test 5: Partial Failures
  mockResponses = {
    'root': [
      { hash: 'tx1', from: 'root', to: 'fail', value: '1', direction: 'out' },
      { hash: 'tx2', from: 'root', to: 'good', value: '1', direction: 'out' }
    ],
    'good': [
      { hash: 'tx3', from: 'good', to: 'c', value: '1', direction: 'out' }
    ]
  };
  res = await performTrace('root', 2, 'both');
  // Root fetches. Then 'fail' and 'good' are enqueued. 
  // 'fail' throws and is caught, skipped.
  // 'good' fetches successfully and adds 'c'.
  assert.strictEqual(res.nodes.length, 4, 'Root, fail, good, c');
  assert.strictEqual(res.edges.length, 3, 'tx1, tx2, tx3');
  console.log('✅ Test 5 Passed: Partial Failures handled gracefully');

  // Test 6: Empty Results
  mockResponses = {
    'root': []
  };
  res = await performTrace('root', 2, 'both');
  assert.strictEqual(res.nodes.length, 1, 'Only root');
  assert.strictEqual(res.edges.length, 0);
  console.log('✅ Test 6 Passed: Empty Results');

  // Test 7: Node Limit Reached & Dangling Edge Prevention
  // We mock a scenario where maxNodes = 50. Since we can't easily change the hardcoded 50 in the function,
  // we'll simulate it by creating 50 distinct transactions to 50 distinct addresses from root.
  const massiveTxList = [];
  for (let i = 1; i <= 55; i++) {
    massiveTxList.push({
      hash: `tx_limit_${i}`,
      from: 'root',
      to: `node_${i}`,
      value: '1',
      direction: 'out'
    });
  }
  mockResponses = {
    'root': massiveTxList
  };
  res = await performTrace('root', 2, 'both');
  
  // Total nodes should be exactly 50 (Root + 49 children)
  assert.strictEqual(res.nodes.length, 50, 'Nodes must be strictly capped at 50');
  
  // Total edges should also be exactly 49. If an edge was retained without its target node,
  // edge count would exceed 49.
  assert.strictEqual(res.edges.length, 49, 'Edges to excluded nodes must not be retained');
  
  assert.strictEqual(res.limitReached, true, 'limitReached flag should be set');
  
  // Check that all retained edges actually have valid endpoints in the node list
  const validIds = new Set(res.nodes.map(n => n.id));
  const invalidEdges = res.edges.filter(e => !validIds.has(e.source) || !validIds.has(e.target));
  assert.strictEqual(invalidEdges.length, 0, 'No dangling edges should be returned');
  
  console.log('✅ Test 7 Passed: Node Limit Cap & Dangling Edge Prevention');

  console.log('--- All BFS Tests Passed ---');
}

runTests().catch(console.error).finally(() => {
  // restore
  (etherscanService as any).getTransactions = originalGetTransactions;
});
