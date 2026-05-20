import cors from 'cors';
import express from 'express';
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
