// ============================================================
// Investigations CRUD routes — Phase 3
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Investigation } from '../models/Investigation';
import { isValidAddress } from '../services/etherscan.service';

export const investigationRouter = Router();

// ── Helpers ───────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function notFound(res: Response, id: string) {
  return res.status(404).json({
    error: {
      message: `Investigation not found: ${id}`,
      status: 404,
      timestamp: new Date().toISOString(),
    },
  });
}

function badRequest(res: Response, message: string) {
  return res.status(400).json({
    error: { message, status: 400, timestamp: new Date().toISOString() },
  });
}

type SortKey = 'createdAt' | 'updatedAt' | 'title' | 'status';
const SORT_KEYS: SortKey[] = ['createdAt', 'updatedAt', 'title', 'status'];
const VALID_STATUSES = ['active', 'done', 'archived'] as const;
type Status = (typeof VALID_STATUSES)[number];

// ── GET /api/investigations ───────────────────────────────────
investigationRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, sort = 'createdAt', dir = 'desc' } = req.query as {
        status?: string;
        sort?: string;
        dir?: string;
      };

      // Build filter
      const filter: Record<string, unknown> = {};
      if (status && VALID_STATUSES.includes(status as Status)) {
        filter.status = status;
      }

      // Build sort
      const sortKey = SORT_KEYS.includes(sort as SortKey) ? sort : 'createdAt';
      const sortDir = dir === 'asc' ? 1 : -1;

      const investigations = await Investigation
        .find(filter)
        .sort({ [sortKey]: sortDir })
        .lean();

      return res.json({ investigations, total: investigations.length });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/investigations/:id ───────────────────────────────
investigationRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const inv = await Investigation.findById(id).lean();
      if (!inv) return notFound(res, id);

      return res.json(inv);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/investigations ──────────────────────────────────
investigationRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, targetAddress } = req.body as {
        title?: string;
        targetAddress?: string;
      };

      // Server-side validation (client also validates, this is the authoritative check)
      if (!title || typeof title !== 'string' || title.trim().length < 2) {
        return badRequest(res, 'Title must be at least 2 characters.');
      }
      if (title.trim().length > 120) {
        return badRequest(res, 'Title must be 120 characters or fewer.');
      }
      if (!targetAddress || typeof targetAddress !== 'string') {
        return badRequest(res, 'Target address is required.');
      }
      if (!isValidAddress(targetAddress.trim())) {
        return badRequest(
          res,
          'Invalid Ethereum address. Must start with 0x followed by 40 hex characters.'
        );
      }

      const inv = await Investigation.create({
        title: title.trim(),
        targetAddress: targetAddress.trim().toLowerCase(),
        status: 'active',
      });

      return res.status(201).json(inv);
    } catch (err) {
      // Mongoose validation errors → 400
      if (err instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(err.errors).map((e) => e.message).join('; ');
        return badRequest(res, messages);
      }
      next(err);
    }
  }
);

// ── PATCH /api/investigations/:id ─────────────────────────────
investigationRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const { title, status } = req.body as { title?: string; status?: string };
      const update: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length < 2) {
          return badRequest(res, 'Title must be at least 2 characters.');
        }
        if (title.trim().length > 120) {
          return badRequest(res, 'Title must be 120 characters or fewer.');
        }
        update.title = title.trim();
      }

      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status as Status)) {
          return badRequest(res, `Status must be one of: ${VALID_STATUSES.join(', ')}.`);
        }
        update.status = status;
      }

      if (Object.keys(update).length === 0) {
        return badRequest(res, 'Provide at least one field to update: title or status.');
      }

      const inv = await Investigation.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true }
      ).lean();

      if (!inv) return notFound(res, id);
      return res.json(inv);
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(err.errors).map((e) => e.message).join('; ');
        return badRequest(res, messages);
      }
      next(err);
    }
  }
);

// ── DELETE /api/investigations/:id ────────────────────────────
investigationRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const inv = await Investigation.findByIdAndDelete(id).lean();
      if (!inv) return notFound(res, id);

      return res.json({
        deleted: true,
        id,
        message: `Investigation "${inv.title}" has been permanently deleted.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/investigations/:id/trace ─────────────────────────
import { performTrace, Direction } from '../services/tracing.service';

investigationRouter.get(
  '/:id/trace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const inv = await Investigation.findById(id).lean();
      if (!inv) return notFound(res, id);

      const depth = Math.min(3, Math.max(1, parseInt(req.query.depth as string, 10) || 1));
      
      const allowedDirections = ['both', 'incoming', 'outgoing'];
      let direction = (req.query.direction as string) || 'both';
      if (!allowedDirections.includes(direction)) {
        direction = 'both';
      }

      // Perform bounded BFS trace using Etherscan backend
      const result = await performTrace(inv.targetAddress, depth, direction as Direction);

      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/investigations/:id/analysis ─────────────────────
import { generateAnalysis } from '../services/analytics.service';
import type { TraceResponse } from '../types';

investigationRouter.post(
  '/:id/analysis',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const inv = await Investigation.findById(id).lean();
      if (!inv) return notFound(res, id);

      const traceData = req.body as TraceResponse;
      if (!traceData || !Array.isArray(traceData.nodes) || !Array.isArray(traceData.transactions)) {
        return badRequest(res, 'Invalid trace data provided in request body.');
      }

      // Generate deterministic analysis
      const analysis = generateAnalysis(traceData, inv.targetAddress);

      return res.json(analysis);
    } catch (err) {
      next(err);
    }
  }
);
