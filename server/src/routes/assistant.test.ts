import request from 'supertest';
import express from 'express';
import { assistantRouter } from './assistant';
import { Investigation } from '../models/Investigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiService from '../services/ai.service';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
app.use('/api/investigations', assistantRouter);

describe('Assistant Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validId = new mongoose.Types.ObjectId().toHexString();

  it('successfully processes a normal bounded assistant request', async () => {
    // Mock the database
    vi.spyOn(Investigation, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: validId,
        title: 'Mock Investigation',
        targetAddress: '0xabc',
      })
    } as any);

    // Mock the AI service
    vi.spyOn(aiService, 'askAssistant').mockResolvedValue({
      reply: 'This is a mock AI response.',
    });

    const response = await request(app)
      .post(`/api/investigations/${validId}/assistant`)
      .send({
        message: 'Hello',
        history: [],
        analysis: {
          riskScore: 10,
          traceStatistics: { depthUsed: 2, graphNodes: 5, graphEdges: 8 },
        },
        limitReached: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reply: 'This is a mock AI response.' });
    expect(aiService.askAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        context: expect.objectContaining({
          limitReached: false,
        }),
      })
    );
  });

  it('rejects oversized unbounded message inputs safely', async () => {
    // Mock the database
    vi.spyOn(Investigation, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: validId,
        title: 'Mock Investigation',
        targetAddress: '0xabc',
      })
    } as any);

    const oversizedMessage = 'a'.repeat(6000);

    const response = await request(app)
      .post(`/api/investigations/${validId}/assistant`)
      .send({
        message: oversizedMessage,
        history: [],
        analysis: {},
        limitReached: false,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('message exceeds the 5,000 character limit');
  });
});
