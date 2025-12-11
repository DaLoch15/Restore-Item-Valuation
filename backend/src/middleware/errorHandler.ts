import { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { config } from '../lib/config';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle known AppError types
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      },
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found',
      },
    });
    return;
  }

  // Handle unknown errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'An unexpected error occurred',
    },
  });
};
