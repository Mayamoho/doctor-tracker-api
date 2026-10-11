import type { Request, Response } from 'express';
import * as authService from '../services/authService';
import { ApiError } from '../utils/ApiError';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../utils/cookies';
import { verifyAccessToken, verifyRefreshToken } from '../utils/tokens';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const { user, tokens } = await authService.login(email, password);

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ success: true, data: { user } });
}

/**
 * A rejected refresh ends the session, so the cookies that describe it are cleared
 * here rather than left to age out. `dt_s` deliberately outlives the access token —
 * it lives as long as the refresh token, so the route gate can see a session the
 * client can still renew — which means a stale one would keep bouncing `/login`
 * back to `/dashboard`, leaving the visitor on an empty page with no way to the
 * sign-in form.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw ApiError.unauthorized('Missing refresh token');

    const { user, tokens } = await authService.refresh(token);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ success: true, data: { user } });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

/**
 * Deliberately not behind `requireAuth`: by the time a user clicks logout their
 * access token may already have expired, and revoking the refresh token is the
 * part that actually matters. The id is recovered from whichever token is still
 * readable.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;

  let userId: string | undefined;

  try {
    const access = req.cookies?.[ACCESS_COOKIE] ?? bearer;
    if (access) userId = verifyAccessToken(access).sub;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (refreshToken) userId = verifyRefreshToken(refreshToken).sub;
    } catch {
      userId = undefined;
    }
  }

  if (userId) await authService.logout(userId);

  clearAuthCookies(res);
  res.json({ success: true, data: { loggedOut: true } });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.currentUser(req.user!.id);
  res.json({ success: true, data: { user } });
}
