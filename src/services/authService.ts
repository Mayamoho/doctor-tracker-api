import { User, verifyPassword, type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: IUser['role'];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function toSessionUser(user: Pick<IUser, '_id' | 'name' | 'email' | 'role'>): SessionUser {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

function issueTokens(userId: string, role: IUser['role'], tokenVersion: number): TokenPair {
  return {
    accessToken: signAccessToken(userId, role),
    refreshToken: signRefreshToken(userId, tokenVersion),
  };
}

export async function login(email: string, password: string) {
  // `passwordHash` is `select: false`, so it has to be asked for explicitly.
  const user = await User.findOne({ email }).select('+passwordHash').lean();

  // One message for "no such user" and "wrong password" — otherwise the endpoint
  // becomes an account enumerator.
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const matches = await verifyPassword(user.passwordHash, password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  return { user: toSessionUser(user), tokens: issueTokens(String(user._id), user.role, user.tokenVersion) };
}

/**
 * A new refresh token is returned on every call, but the user's `tokenVersion`
 * is left alone here — it only moves on logout.
 *
 * Rotating the version per refresh would make refresh tokens single-use, which
 * breaks the moment two tabs refresh at the same time. Bumping it at logout stops
 * every outstanding refresh token from validating, without that race.
 *
 * It does not revoke access tokens: `requireAuth` verifies signature and expiry
 * only, so one keeps working until its own expiry. Bounded, not immediate.
 */
export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await User.findById(payload.sub).lean();
  if (!user) throw ApiError.unauthorized('Session is no longer valid');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Session has been signed out');
  }

  return {
    user: toSessionUser(user),
    tokens: issueTokens(String(user._id), user.role, user.tokenVersion),
  };
}

export async function logout(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function currentUser(userId: string): Promise<SessionUser> {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.unauthorized('Session is no longer valid');
  return toSessionUser(user);
}
