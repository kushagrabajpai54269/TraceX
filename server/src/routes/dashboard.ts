// ============================================================
// Dashboard stats route — Phase 3
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Investigation } from '../models/Investigation';

export const dashboardRouter = Router();

// ── GET /api/dashboard/stats ──────────────────────────────────
dashboardRouter.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [total, active, done, archived, recent] = await Promise.all([
        Investigation.countDocuments({}),
        Investigation.countDocuments({ status: 'active' }),
        Investigation.countDocuments({ status: 'done' }),
        Investigation.countDocuments({ status: 'archived' }),
        Investigation
          .find({})
          .sort({ updatedAt: -1 })
          .limit(5)
          .select('_id title targetAddress status createdAt updatedAt')
          .lean(),
      ]);

      return res.json({
        total,
        active,
        done,
        archived,
        // Tracing metrics not available yet — Phase 5
        addressesTraced: null,
        transactionsFetched: null,
        recent,
      });
    } catch (err) {
      next(err);
    }
  }
);
