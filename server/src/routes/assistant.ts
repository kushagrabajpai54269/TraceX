// ============================================================
// AI Assistant Route — Phase 7
// POST /api/investigations/:id/assistant
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Investigation } from '../models/Investigation';
import { askAssistant } from '../services/ai.service';
import type { InvestigationAnalysis } from '../types';
import type { ChatMessage, InvestigationContext } from '../services/ai.service';

export const assistantRouter = Router();

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function badRequest(res: Response, message: string) {
  return res.status(400).json({
    error: { message, status: 400, timestamp: new Date().toISOString() },
  });
}

function notFound(res: Response, id: string) {
  return res.status(404).json({
    error: { message: `Investigation not found: ${id}`, status: 404, timestamp: new Date().toISOString() },
  });
}

/**
 * POST /api/investigations/:id/assistant
 *
 * Body:
 * {
 *   message:  string,               // user question
 *   history:  ChatMessage[],        // prior conversation turns
 *   analysis: InvestigationAnalysis,
 *   limitReached: boolean
 * }
 */
assistantRouter.post(
  '/:id/assistant',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) return badRequest(res, 'Invalid investigation ID format.');

      const inv = await Investigation.findById(id).lean();
      if (!inv) return notFound(res, id);

      // Validate request body fields
      const { message, history, analysis, limitReached } = req.body as {
        message?: unknown;
        history?: unknown;
        analysis?: unknown;
        limitReached?: unknown;
      };

      if (typeof message !== 'string' || message.trim().length === 0) {
        return badRequest(res, 'message must be a non-empty string.');
      }
      if (message.length > 5_000) {
        return badRequest(res, 'message exceeds the 5,000 character limit.');
      }
      if (!analysis || typeof analysis !== 'object') {
        return badRequest(res, 'analysis object is required in the request body.');
      }
      if (typeof limitReached !== 'boolean') {
        return badRequest(res, 'limitReached boolean is required in the request body.');
      }

      // Validate history is an array of proper shape; silently truncate oversized history
      let safeHistory: ChatMessage[] = [];
      if (Array.isArray(history)) {
        safeHistory = (history as ChatMessage[])
          .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-20);
      }

      // Build investigation context from the client-supplied analysis
      const typedAnalysis = analysis as InvestigationAnalysis;

      const context: InvestigationContext = {
        investigationId: id,
        title:           inv.title,
        targetAddress:   inv.targetAddress,
        analysis:        typedAnalysis,
        traceDepth:      typedAnalysis.traceStatistics.depthUsed,
        limitReached:    Boolean(limitReached),
      };

      const result = await askAssistant({
        message: message.trim(),
        history: safeHistory,
        context,
      });

      return res.json({ reply: result.reply });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      // Specific, safe error responses — never expose API key or internals
      if (errMsg.includes('OPENAI_API_KEY')) {
        return res.status(503).json({
          error: { message: 'AI assistant is not configured. Contact the administrator.', status: 503, timestamp: new Date().toISOString() },
        });
      }
      if (errMsg.includes('rate limit') || errMsg.includes('429')) {
        return res.status(429).json({
          error: { message: 'AI rate limit reached. Please wait a moment and try again.', status: 429, timestamp: new Date().toISOString() },
        });
      }
      if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT')) {
        return res.status(504).json({
          error: { message: 'AI request timed out. Please try again.', status: 504, timestamp: new Date().toISOString() },
        });
      }

      // Generic provider error — do not expose internals
      if (errMsg.includes('OpenAI') || errMsg.includes('openai') || errMsg.includes('model returned')) {
        return res.status(502).json({
          error: { message: 'AI provider error. Please try again.', status: 502, timestamp: new Date().toISOString() },
        });
      }

      next(err);
    }
  }
);
