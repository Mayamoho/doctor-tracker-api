import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid MongoDB ObjectId');

export const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/**
 * Browsers happily send `?search=&sort=` for untouched filters, and `""` coerces
 * to `0`/NaN rather than "not provided". Dropping empty values up front keeps
 * every list endpoint from having to special-case them.
 */
export function dropEmptyParams(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) => v !== '' && v !== undefined && v !== null && v !== 'undefined',
    ),
  );
}

export const listQueryBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  from: dateParamSchema.optional(),
  to: dateParamSchema.optional(),
};

export interface SortSpec {
  [field: string]: 1 | -1;
}

/**
 * Maps a whitelisted client sort token (`-visitDate`) onto a Mongo sort document.
 *
 * Two rules matter. The `_id` tiebreaker is mandatory — `visitDate` is not
 * unique, and without a stable secondary key rows can repeat or disappear across
 * pages. And the leading `-` sets the direction of the whole key pair, so one
 * descending index serves both `visitDate` and `-visitDate` (MongoDB walks an
 * index backwards for free).
 */
export function resolveSort(token: string, fields: Record<string, string>): SortSpec {
  const descending = token.startsWith('-');
  const key = descending ? token.slice(1) : token;
  const field = fields[key] ?? 'createdAt';
  const direction = descending ? -1 : 1;

  return { [field]: direction, _id: direction } as SortSpec;
}
