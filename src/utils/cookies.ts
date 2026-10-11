import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { ACCESS_TTL_MS, REFRESH_TTL_MS } from './tokens';

export const ACCESS_COOKIE = 'dt_at';
export const REFRESH_COOKIE = 'dt_rt';
/**
 * A fixed, meaningless value whose only job is to be visible to the frontend's
 * route gate. The refresh cookie is path-scoped to `/api/v1/auth`, so a browser
 * never sends it on a navigation to `/dashboard` — and once the 15-minute access
 * cookie has aged out, the gate sees no cookie at all and bounces a session that
 * the client could still have refreshed itself. This carries no credential: it is
 * `1` or absent, and every real check still happens against the API.
 */
export const SESSION_COOKIE = 'dt_s';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/**
 * Deliberately host-only (no `domain`) and `SameSite=Lax`.
 *
 * The frontend rewrites `/api/v1/*` to this server, so the browser believes it
 * is talking to its own origin. That makes these first-party cookies, which is
 * the only arrangement that survives Safari's ITP — cross-site `SameSite=None`
 * cookies are blocked outright there.
 *
 * Adding an explicit `Domain` would break that, because the host the browser
 * sees (`*.vercel.app`) is not a suffix of this server's host.
 */
const BASE: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...BASE, maxAge: ACCESS_TTL_MS, path: '/' });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...BASE,
    maxAge: REFRESH_TTL_MS,
    path: REFRESH_COOKIE_PATH,
  });
  // Lives as long as the refresh token, not the access token: it marks the
  // session, not the request.
  res.cookie(SESSION_COOKIE, '1', { ...BASE, maxAge: REFRESH_TTL_MS, path: '/' });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...BASE, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...BASE, path: REFRESH_COOKIE_PATH });
  res.clearCookie(SESSION_COOKIE, { ...BASE, path: '/' });
}
