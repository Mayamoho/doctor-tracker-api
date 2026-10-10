import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import type { Role } from '../utils/tokens';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never serialised: excluded by default so no response can leak the hash.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'doctor'], default: 'admin' },
    // Bumped on logout / credential change, which invalidates every outstanding
    // refresh token without needing a separate session collection.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(hash: string, candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, hash);
}

export const User = mongoose.model<IUser>('User', userSchema);
