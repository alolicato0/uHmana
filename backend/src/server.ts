import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config.js';
import { connectDb } from './db.js';
import { errorHandler } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import profilesRouter from './routes/profiles.js';
import remindersRouter from './routes/reminders.js';
import timelineRouter from './routes/timeline.js';

async function main() {
  await connectDb();

  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '20mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.get('/api/diagnostics', (_req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = dbStates[mongoose.connection.readyState] ?? 'unknown';
    res.json({
      ok: true,
      ts: new Date().toISOString(),
      uptime_s: Math.floor(process.uptime()),
      node: process.version,
      db: dbState,
      env: {
        JWT_SECRET: !!process.env.JWT_SECRET,
        MONGO_URI: !!process.env.MONGO_URI,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/timeline', timelineRouter);
  app.use('/api/reminders', remindersRouter);

  app.use(errorHandler);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[uHmana] api in ascolto su :${config.port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[fatal]', e);
  process.exit(1);
});
