import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwt.secret) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

export function userId(req: Request): string {
  if (!req.user?.sub) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return req.user.sub;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
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
  res.status(status).json({ error: err?.message ?? 'Internal Server Error' });
}
