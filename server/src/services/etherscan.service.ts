// ============================================================
// Etherscan API V2 Service
// All Ethereum mainnet data retrieval and normalization lives here.
// The API key never leaves the server.
// ============================================================
import axios, { AxiosError } from 'axios';
import type {
  EtherscanRawTx,
  NormalizedTransaction,
  AddressInfo,
} from '../types';

const BASE_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 1; // Ethereum mainnet
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// ── Helpers ──────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) throw new Error('ETHERSCAN_API_KEY environment variable is not set.');
  return key;
}

/**
 * Convert a Wei string to an ETH string preserving up to 18 significant decimal places.
 * Uses BigInt to preserve precision for large values.
 */
export function weiToEth(weiStr: string): string {
  if (!weiStr || weiStr === '0') return '0';
  try {
    const wei = BigInt(weiStr);
    const wholePart = wei / 1_000_000_000_000_000_000n;
    const remainder = wei % 1_000_000_000_000_000_000n;
    const decStr = remainder.toString().padStart(18, '0').replace(/0+$/, '');
    return decStr ? `${wholePart}.${decStr}` : wholePart.toString();
  } catch {
    return '0';
  }
}

/** Unix timestamp string → ISO 8601 */
function toIso(unixStr: string): string {
  const parsed = parseInt(unixStr, 10);
  if (isNaN(parsed)) return '';
  try {
    return new Date(parsed * 1000).toISOString();
  } catch {
    return '';
  }
}

/**
 * Normalize a raw Etherscan transaction into TraceX's internal format.
 * `queriedAddress` is used to determine transaction direction.
 */
function normalizeTransaction(
  raw: EtherscanRawTx,
  queriedAddress: string
): NormalizedTransaction {
  const isError = raw.isError === '1' || raw.txreceipt_status === '0';

  let gasFee = '0';
  try {
    gasFee = weiToEth(
      (BigInt(raw.gasPrice) * BigInt(raw.gasUsed)).toString()
    );
  } catch { /* leave as '0' */ }

  return {
    hash:            raw.hash,
    blockNumber:     parseInt(raw.blockNumber, 10),
    timestamp:       toIso(raw.timeStamp),
    from:            raw.from,
    to:              raw.to || '',
    value:           weiToEth(raw.value),
    valueWei:        raw.value,
    gasPrice:        raw.gasPrice,
    gasUsed:         parseInt(raw.gasUsed, 10),
    gasLimit:        parseInt(raw.gas, 10),
    gasFee,
    isError,
    status:          isError ? 'failed' : 'success',
    confirmations:   parseInt(raw.confirmations || '0', 10),
    functionName:    raw.functionName || undefined,
    direction:       raw.from.toLowerCase() === queriedAddress.toLowerCase() ? 'out' : 'in',
    contractAddress: raw.contractAddress || undefined,
  };
}

// ── Public API ────────────────────────────────────────────────

/** Validate that an address matches the Ethereum address format. */
export function isValidAddress(address: string): boolean {
  return ETH_ADDRESS_RE.test(address);
}

/**
 * Fetch the ETH balance for an address from Etherscan.
 * Throws a descriptive error if the API call fails.
 */
export async function getBalance(address: string): Promise<AddressInfo> {
  const params = new URLSearchParams({
    chainid:  String(CHAIN_ID),
    module:   'account',
    action:   'balance',
    address,
    tag:      'latest',
    apikey:   getApiKey(),
  });

  try {
    const { data } = await axios.get<{
      status: string;
      message: string;
      result: string;
    }>(`${BASE_URL}?${params}`);

    // Etherscan returns status "0" with message "NOTOK" for real errors
    if (data.status === '0' && data.message === 'NOTOK') {
      throw new Error(`Etherscan: ${data.result}`);
    }

    const balanceWei = data.result || '0';
    return { address, balance: weiToEth(balanceWei), balanceWei };
  } catch (err) {
    if (err instanceof AxiosError) {
      throw new Error(`Network error fetching balance: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Fetch a paginated list of normal transactions for an address.
 * - Returns empty array (not an error) when address has no transactions.
 * - `page` is 1-indexed.
 * - `limit` capped at 50 per the plan.
 */
export async function getTransactions(
  address:  string,
  page:     number = 1,
  limit:    number = 25
): Promise<{ transactions: NormalizedTransaction[]; hasMore: boolean }> {
  const safeLimit = Math.min(limit, 50);

  const params = new URLSearchParams({
    chainid:    String(CHAIN_ID),
    module:     'account',
    action:     'txlist',
    address,
    startblock: '0',
    endblock:   '99999999',
    page:       String(page),
    offset:     String(safeLimit),
    sort:       'desc',
    apikey:     getApiKey(),
  });

  try {
    const { data } = await axios.get<{
      status: string;
      message: string;
      result: EtherscanRawTx[] | string;
    }>(`${BASE_URL}?${params}`);

    // "No transactions found" is a valid empty state — not an error
    if (data.status === '0' && data.message === 'No transactions found') {
      return { transactions: [], hasMore: false };
    }

    // Rate limit or invalid key
    if (data.status === '0' && data.message === 'NOTOK') {
      const resultMsg = typeof data.result === 'string' ? data.result : 'API error';
      if (resultMsg.includes('rate limit')) {
        throw Object.assign(new Error('Etherscan rate limit reached. Please wait a moment and try again.'), { statusCode: 429 });
      }
      if (resultMsg.includes('API Key') || resultMsg.includes('Invalid')) {
        throw Object.assign(new Error('Etherscan API key error. Check server configuration.'), { statusCode: 500 });
      }
      throw new Error(`Etherscan error: ${resultMsg}`);
    }

    const rawTxs = Array.isArray(data.result) ? data.result : [];
    const transactions = rawTxs.map((tx) => normalizeTransaction(tx, address));

    return {
      transactions,
      hasMore: rawTxs.length === safeLimit,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      throw new Error(`Network error fetching transactions: ${err.message}`);
    }
    throw err;
  }
}
