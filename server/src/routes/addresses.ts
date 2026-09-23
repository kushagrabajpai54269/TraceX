import { Router, Request, Response, NextFunction } from 'express';
import {
  isValidAddress,
  getBalance,
  getTransactions,
} from '../services/etherscan.service';
import type { TransactionPage, AddressValidation } from '../types';

export const addressRouter = Router();

// ── POST /api/addresses/validate ─────────────────────────────
// Validates Ethereum address format. Does not make any API call.
addressRouter.post(
  '/validate',
  (req: Request, res: Response) => {
    const { address } = req.body as { address?: string };

    if (!address || typeof address !== 'string') {
      const result: AddressValidation = {
        valid: false,
        address: null,
        reason: 'Address field is required.',
      };
      return res.status(400).json(result);
    }

    const trimmed = address.trim();
    const valid = isValidAddress(trimmed);

    const result: AddressValidation = {
      valid,
      address: valid ? trimmed : null,
      reason: valid ? undefined : 'Must be a valid Ethereum address: 0x followed by 40 hex characters.',
    };

    return res.json(result);
  }
);

// ── GET /api/addresses/:address/transactions ──────────────────
// Fetches and returns normalized, paginated transactions for an address.
// Also returns the address ETH balance.
addressRouter.get(
  '/:address/transactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = (req.params.address || '').trim();
      const page  = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 25));

      if (!isValidAddress(address)) {
        return res.status(400).json({
          error: {
            message: 'Invalid Ethereum address format. Expected 0x followed by 40 hex characters.',
            status: 400,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Fetch balance and transactions in parallel
      const [addressInfo, txResult] = await Promise.all([
        getBalance(address),
        getTransactions(address, page, limit),
      ]);

      const response: TransactionPage = {
        address,
        balance:    addressInfo.balance,
        balanceWei: addressInfo.balanceWei,
        transactions: txResult.transactions,
        page,
        limit,
        hasMore:    txResult.hasMore,
        dataSource: 'etherscan-mainnet',
      };

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/addresses/:address/balance ───────────────────────
// Returns only the ETH balance for an address.
addressRouter.get(
  '/:address/balance',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = (req.params.address || '').trim();

      if (!isValidAddress(address)) {
        return res.status(400).json({
          error: {
            message: 'Invalid Ethereum address format.',
            status: 400,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const info = await getBalance(address);
      return res.json(info);
    } catch (err) {
      next(err);
    }
  }
);
