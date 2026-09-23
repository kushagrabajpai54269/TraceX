// ============================================================
// MongoDB Connection Service — Phase 3
// ============================================================
import mongoose from 'mongoose';

let connected = false;

/**
 * Connect to MongoDB Atlas using MONGODB_URI from environment.
 * Throws clearly if the URI is missing or connection fails.
 * Safe to call multiple times — only connects once.
 */
export async function connectDB(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    throw new Error(
      'MONGODB_URI environment variable is not set or still contains placeholder values. ' +
      'Update server/.env with a real MongoDB Atlas connection string.'
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20_000,  // 20s — direct connections need more time
      socketTimeoutMS: 45_000,
      connectTimeoutMS: 20_000,
    });

    connected = true;
    const dbName = mongoose.connection.db?.databaseName ?? 'unknown';
    console.log(`[TraceX DB] Connected to MongoDB — database: ${dbName}`);

    mongoose.connection.on('error', (err) => {
      console.error('[TraceX DB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      connected = false;
      console.warn('[TraceX DB] Disconnected from MongoDB');
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Do not log the URI (it contains credentials)
    throw new Error(`[TraceX DB] Failed to connect to MongoDB: ${msg}`);
  }
}

/** Gracefully close the MongoDB connection (useful for cleanup / tests). */
export async function disconnectDB(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  console.log('[TraceX DB] Disconnected cleanly');
}
