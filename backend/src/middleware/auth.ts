import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

// Inietta `req.auth` con session + userId su tutte le richieste
export const clerk = clerkMiddleware({
  secretKey: config.clerk.secretKey,
  publishableKey: config.clerk.publishableKey,
});

// Blocca con 401 se non c'è un utente autenticato
export const requireUser = requireAuth();

/** Helper per ottenere lo userId in modo type-safe */
export function userId(req: Request): string {
  const auth = getAuth(req);
  if (!auth?.userId) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return auth.userId;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  const status = err?.status ?? err?.statusCode ?? 500;
  // eslint-disable-next-line no-console
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: err?.message ?? 'Internal Server Error',
  });
}
