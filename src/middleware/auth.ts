import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken, type Role } from '../utils/tokens';

function extractToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  // Fallback so the API stays testable with plain curl during review.
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  return undefined;
}

/**
 * Verifies the JWT and stops there — no database round trip per request.
 *
 * The tradeoff is a revocation window equal to the access-token lifetime
 * (15 minutes). Refresh-token rotation closes it for anything longer, which is
 * the right balance for an internal admin portal where every request would
 * otherwise pay an extra query.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Missing access token');

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}
