import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidatedShape {
  body?: unknown;
  params?: unknown;
}

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.filter((part) => part !== 'body' && part !== 'params').join('.'),
    message: issue.message,
  }));
}

/**
 * Validates `{ body, params }` and replaces `req.body` with the parsed output so
 * controllers receive trimmed, coerced values.
 *
 * Query strings are intentionally *not* rewritten here: `req.query` is a
 * read-only getter in Express 5, so list filters are parsed with an explicit
 * schema inside the service layer instead.
 */
export function validate(schema: z.ZodType<ValidatedShape>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({ body: req.body ?? {}, params: req.params });

    if (!result.success) {
      throw ApiError.badRequest('Request validation failed', formatIssues(result.error));
    }

    if (result.data.body !== undefined) req.body = result.data.body;
    next();
  };
}
