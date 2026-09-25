// TraceX v2 — Server Entry Point (Phase 3)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB }          from './services/db.service';
import { healthRouter }       from './routes/health';
import { addressRouter }      from './routes/addresses';
import { investigationRouter } from './routes/investigations';
import { assistantRouter }    from './routes/assistant';
import { dashboardRouter }    from './routes/dashboard';
import { errorHandler }       from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api',              healthRouter);
app.use('/api/addresses',    addressRouter);
app.use('/api/investigations', investigationRouter);
app.use('/api/investigations', assistantRouter);
app.use('/api/dashboard',    dashboardRouter);

// ── Error handler (must be last) ─────────────────────────────
app.use(errorHandler);

// ── Start: connect DB first, then listen ─────────────────────
async function start() {
  try {
    await connectDB();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[TraceX] Startup failed: ${msg}`);
    console.error('[TraceX] The server cannot start without MongoDB. Please check your Atlas IP whitelist or .env configuration.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[TraceX] Server running on port ${PORT}`);
    console.log(`[TraceX] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[TraceX] CORS origin: ${CLIENT_ORIGIN}`);
  });
}

start();

export default app;
