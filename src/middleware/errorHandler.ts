import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

interface ErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

function MongoServerErrorLike(error: unknown): { code?: number; keyValue?: unknown } | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return error as { code?: number; keyValue?: unknown };
  }
  return null;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) return next(error);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (error instanceof ApiError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof z.ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value for ${error.path}`;
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body is not valid JSON';
  } else {
    const mongo = MongoServerErrorLike(error);
    if (mongo?.code === 11000) {
      status = 409;
      code = 'DUPLICATE_KEY';
      message = 'A record with these unique values already exists';
      details = mongo.keyValue;
    }
  }

  if (status >= 500) {
    console.error('Unhandled error:', error);
  }

  const body: ErrorBody = { success: false, error: { code, message } };
  // Only ever attach details for errors we generated deliberately; an unexpected
  // 500 must not leak driver or stack information.
  if (details !== undefined && status < 500) body.error.details = details;
  if (!env.isProduction && status >= 500 && error instanceof Error) {
    body.error.details = error.message;
  }

  res.status(status).json(body);
}
