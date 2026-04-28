/**
 * QAYANI Error Handler
 * Centralized error handling for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { APIError, ErrorCode, isAPIError, isZodError } from './types';

/**
 * Main error handler for API routes
 * Converts any error into a properly formatted NextResponse
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Handle known API errors
  if (isAPIError(error)) {
    // Log server errors to monitoring (Sentry will be added)
    if (error.isServerError()) {
      logErrorToMonitoring(error);
    }

    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers: getCORSHeaders(),
    });
  }

  // Handle Zod validation errors
  if (isZodError(error)) {
    const zodError = error as any;
    const formattedIssues = zodError.issues.map((issue: any) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: formattedIssues,
        },
      },
      {
        status: 400,
        headers: getCORSHeaders(),
      }
    );
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    return handleSupabaseError(error);
  }

  // Handle unknown errors
  logErrorToMonitoring(error);

  return NextResponse.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      },
    },
    {
      status: 500,
      headers: getCORSHeaders(),
    }
  );
}

/**
 * Wrapper for async API route handlers with automatic error handling
 * Usage:
 *   export const POST = withErrorHandling(async (request) => {
 *     // Your logic here
 *   });
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse | Response>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const response = await handler(...args);
      return response as NextResponse;
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Wrapper that also extracts and validates userId from request
 * Usage:
 *   export const POST = withAuthErrorHandling(async (request, userId) => {
 *     // Your logic here with authenticated userId
 *   });
 */
export function withAuthErrorHandling<T extends any[]>(
  handler: (request: T[0], userId: string, ...rest: T extends [any, ...infer R] ? R : never[]) => Promise<NextResponse>
) {
  return withErrorHandling(async (request: T[0], ...rest: any[]) => {
    const { requireAuth } = await import('../middleware/auth');
    const userId = await requireAuth(request);
    return handler(request, userId, ...rest);
  });
}

/**
 * Handle Supabase-specific errors
 */
function handleSupabaseError(error: any): NextResponse {
  const { Errors } = require('./types');

  // Authentication errors
  if (error.message?.includes('JWT') || error.message?.includes('token')) {
    return NextResponse.json(Errors.invalidToken().toJSON(), {
      status: 401,
      headers: getCORSHeaders(),
    });
  }

  // Permission errors
  if (error.message?.includes('permission') || error.message?.includes('policy')) {
    return NextResponse.json(Errors.forbidden().toJSON(), {
      status: 403,
      headers: getCORSHeaders(),
    });
  }

  // Not found errors
  if (error.code === 'PGRST116' || error.message?.includes('not found')) {
    return NextResponse.json(Errors.notFound('Resource').toJSON(), {
      status: 404,
      headers: getCORSHeaders(),
    });
  }

  // Unique constraint violation
  if (error.code === '23505') {
    return NextResponse.json(Errors.alreadyExists('Resource').toJSON(), {
      status: 409,
      headers: getCORSHeaders(),
    });
  }

  // Generic database error
  return NextResponse.json(Errors.database('query', error).toJSON(), {
    status: 500,
    headers: getCORSHeaders(),
  });
}

/**
 * Check if error is from Supabase
 */
function isSupabaseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || ('message' in error && typeof (error as any).message === 'string'))
  );
}

/**
 * Log errors to monitoring service (Sentry)
 */
function logErrorToMonitoring(error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    console.error('[MONITORING]', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Sentry integration (only in production with DSN configured)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Sentry is optional — skip if not installed
        // const Sentry = require('@sentry/nextjs');
      } catch (sentryError) {
        // Sentry not installed or error in Sentry - don't crash the app
        console.error('Failed to log to Sentry:', sentryError);
      }
    }
  }
}

/**
 * Get CORS headers for API responses
 */
function getCORSHeaders(): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  return {
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
    },
    {
      status,
      headers: getCORSHeaders(),
    }
  );
}

/**
 * Pagination response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    {
      status: 200,
      headers: getCORSHeaders(),
    }
  );
}
