import jwt from 'jsonwebtoken';
import ms, { type StringValue } from 'ms';
import { env } from '../config/env';
import { ApiError } from './ApiError';

export type Role = 'admin' | 'doctor';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

const toMs = (value: string, fallback: number) => ms(value as StringValue) ?? fallback;

export const ACCESS_TTL_MS = toMs(env.ACCESS_TOKEN_TTL, 15 * 60 * 1000);
export const REFRESH_TTL_MS = toMs(env.REFRESH_TOKEN_TTL, 7 * 24 * 60 * 60 * 1000);

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, tokenVersion }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    return { sub: String(payload.sub), role: payload.role as Role };
  } catch {
    // Expired and malformed tokens are indistinguishable to the client, and the
    // difference only helps an attacker enumerate valid signatures.
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    return { sub: String(payload.sub), tokenVersion: Number(payload.tokenVersion) };
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}
