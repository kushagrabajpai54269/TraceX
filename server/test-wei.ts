import { weiToEth } from './src/services/etherscan.service';

function test(wei: string, expected: string) {
  const res = weiToEth(wei);
  console.log(`wei: ${wei.padEnd(20)} | expected: ${expected.padEnd(20)} | actual: ${res.padEnd(20)} | pass: ${res === expected}`);
}

// Current implementation test
console.log("--- Current Implementation ---");
test('0', '0');
test('1', '0.000000000000000001'); // Will fail with current logic
test('1000000000000000000', '1');
test('1500000000000000000', '1.5');
test('1234567890123456789', '1.234567890123456789'); // Will fail (truncates)
