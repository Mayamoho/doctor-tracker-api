import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError';

const shared = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: (_req: unknown, _res: unknown, next: (err: Error) => void) =>
    next(ApiError.tooManyRequests('Too many requests, please slow down')),
};

/**
 * `app.set('trust proxy', 1)` is required for these to key on the real client
 * IP behind Render/Vercel, and express-rate-limit rejects a permissive boolean
 * `trust proxy` outright, hence the numeric hop count.
 */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const apiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 120,
});
