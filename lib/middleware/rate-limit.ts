/**
 * QAYANI Rate Limiting Middleware
 * Protects API routes from abuse with tiered rate limits
 * Uses Upstash Redis for distributed rate limiting
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { Errors } from '../errors/types';

// =====================================================
// REDIS CLIENT CONFIGURATION
// =====================================================

let redis: Redis | null = null;

/**
 * Get or create Redis client
 * Uses environment variables for configuration
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('Rate limiting disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
    return null;
  }

  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  return redis;
}

// =====================================================
// RATE LIMIT CONFIGURATIONS
// =====================================================

/**
 * Subscription tier limits
 */
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

/**
 * Rate limit configurations per tier
 */
const TIER_LIMITS = {
  [SubscriptionTier.FREE]: {
    requests: 100,
    window: '10 m', // 10 minutes
  },
  [SubscriptionTier.PREMIUM]: {
    requests: 1000,
    window: '10 m',
  },
  [SubscriptionTier.ADMIN]: {
    requests: 10000,
    window: '10 m',
  },
};

/**
 * Endpoint-specific rate limits (stricter for expensive operations)
 */
export const ENDPOINT_LIMITS = {
  // Chat and AI operations (expensive)
  'POST /api/chat': { requests: 20, window: '1 m' },
  'POST /api/personalities/create': { requests: 5, window: '1 m' },

  // Voice operations (very expensive)
  'POST /api/voice/generate': { requests: 10, window: '1 m' },
  'POST /api/voice/clone': { requests: 3, window: '1 h' },

  // File uploads (bandwidth intensive)
  'POST /api/upload': { requests: 5, window: '1 m' },
  'POST /api/recordings/upload': { requests: 10, window: '1 m' },

  // Avatar operations
  'POST /api/avatar/create': { requests: 5, window: '1 m' },
  'POST /api/avatar/customize': { requests: 20, window: '1 m' },

  // Authentication (prevent brute force)
  'POST /api/auth/signin': { requests: 5, window: '5 m' },
  'POST /api/auth/signup': { requests: 3, window: '1 h' },

  // General API
  'GET /api/*': { requests: 60, window: '1 m' },
  'POST /api/*': { requests: 30, window: '1 m' },
};

// =====================================================
// RATE LIMITER INSTANCES
// =====================================================

const rateLimiters = new Map<string, Ratelimit>();

/**
 * Get or create a rate limiter for a specific configuration
 */
function getRateLimiter(requests: number, window: string): Ratelimit | null {
  const client = getRedisClient();
  if (!client) return null;

  const key = `${requests}-${window}`;
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!;
  }

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: 'qayani',
  });

  rateLimiters.set(key, limiter);
  return limiter;
}

// =====================================================
// RATE LIMITING FUNCTIONS
// =====================================================

/**
 * Get identifier for rate limiting
 * Priority: User ID > API Key > IP Address
 */
function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT token (simplified - in production, decode JWT)
    const token = authHeader.replace('Bearer ', '');
    if (token && token.length > 10) {
      return `user:${token.substring(0, 10)}`;
    }
  }

  // Try to get API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Fall back to IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Get user's subscription tier
 * In production, this would query the database
 */
async function getUserTier(identifier: string): Promise<SubscriptionTier> {
  // TODO: Query database to get user's subscription tier
  // For now, default to FREE tier

  // Admin bypass for development
  if (process.env.NODE_ENV === 'development' && identifier.includes('admin')) {
    return SubscriptionTier.ADMIN;
  }

  return SubscriptionTier.FREE;
}

/**
 * Get endpoint-specific rate limit or fall back to tier limit
 */
function getEndpointLimit(
  method: string,
  pathname: string,
  tier: SubscriptionTier
): { requests: number; window: string } {
  // Check for exact match
  const exactKey = `${method} ${pathname}`;
  if (ENDPOINT_LIMITS[exactKey]) {
    return ENDPOINT_LIMITS[exactKey];
  }

  // Check for wildcard match
  const wildcardKey = `${method} ${pathname.split('/').slice(0, 3).join('/')}/*`;
  if (ENDPOINT_LIMITS[wildcardKey]) {
    return ENDPOINT_LIMITS[wildcardKey];
  }

  // Fall back to tier limit
  return TIER_LIMITS[tier];
}

/**
 * Apply rate limiting to a request
 */
export async function checkRateLimit(
  request: NextRequest,
  customLimit?: { requests: number; window: string }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  identifier: string;
}> {
  // If Redis is not configured, allow all requests in development
  const client = getRedisClient();
  if (!client) {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        limit: 999999,
        remaining: 999999,
        reset: Date.now() + 600000,
        identifier: 'dev-mode',
      };
    }
    // In production, fail closed (deny requests) if Redis is unavailable
    throw Errors.internal(new Error('Rate limiting service unavailable'), 'rate-limit');
  }

  // Get identifier and tier
  const identifier = getRateLimitIdentifier(request);
  const tier = await getUserTier(identifier);

  // Get appropriate rate limit
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  const limitConfig = customLimit || getEndpointLimit(method, pathname, tier);

  // Get rate limiter
  const limiter = getRateLimiter(limitConfig.requests, limitConfig.window);
  if (!limiter) {
    throw Errors.internal(new Error('Rate limiter initialization failed'), 'rate-limit');
  }

  // Check rate limit
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining: Math.max(0, remaining),
    reset,
    identifier,
  };
}

/**
 * Middleware wrapper for rate limiting
 * Usage:
 *   export const POST = withRateLimit(handler);
 *   export const POST = withRateLimit(handler, { requests: 10, window: '1 m' });
 */
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse | Response>,
  customLimit?: { requests: number; window: string }
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    try {
      // Check rate limit
      const { success, limit, remaining, reset, identifier } = await checkRateLimit(
        request,
        customLimit
      );

      // Add rate limit headers to response
      const rateLimitHeaders = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
        'X-RateLimit-Identifier': identifier.split(':')[0], // Don't expose full identifier
      };

      // If rate limit exceeded, return 429
      if (!success) {
        const resetDate = new Date(reset);
        return NextResponse.json(
          Errors.rateLimitExceeded(resetDate, limit).toJSON(),
          {
            status: 429,
            headers: rateLimitHeaders,
          }
        );
      }

      // Execute handler
      const response = await handler(...args);

      // Add rate limit headers to successful response
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response as NextResponse;
    } catch (error) {
      // If rate limiting fails, log and continue (fail open in this case)
      console.error('Rate limit check failed:', error);

      // But still execute the handler
      const response = await handler(...args);
      return response as NextResponse;
    }
  };
}

/**
 * Combine rate limiting with error handling
 * Usage:
 *   export const POST = withRateLimitAndErrorHandling(handler);
 */
export function withRateLimitAndErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse | Response>,
  customLimit?: { requests: number; window: string }
) {
  const { withErrorHandling } = require('../errors/handler');
  return withErrorHandling(withRateLimit(handler, customLimit));
}

/**
 * Check if IP is in allowlist (bypass rate limiting)
 */
export function isAllowlisted(ip: string): boolean {
  const allowlist = process.env.RATE_LIMIT_ALLOWLIST?.split(',') || [];
  return allowlist.includes(ip);
}

/**
 * Check if IP is in blocklist (always deny)
 */
export function isBlocklisted(ip: string): boolean {
  const blocklist = process.env.RATE_LIMIT_BLOCKLIST?.split(',') || [];
  return blocklist.includes(ip);
}

// =====================================================
// HELPER FUNCTIONS FOR CUSTOM USE CASES
// =====================================================

/**
 * Manually consume rate limit (for non-HTTP operations)
 */
export async function consumeRateLimit(
  identifier: string,
  requests: number = 1,
  customLimit?: { requests: number; window: string }
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return true;

  const tier = await getUserTier(identifier);
  const limitConfig = customLimit || TIER_LIMITS[tier];
  const limiter = getRateLimiter(limitConfig.requests, limitConfig.window);

  if (!limiter) return true;

  const { success } = await limiter.limit(identifier, { rate: requests });
  return success;
}

/**
 * Get remaining rate limit for identifier
 */
export async function getRemainingLimit(identifier: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 999999;

  const tier = await getUserTier(identifier);
  const limitConfig = TIER_LIMITS[tier];
  const limiter = getRateLimiter(limitConfig.requests, limitConfig.window);

  if (!limiter) return 999999;

  const { remaining } = await limiter.limit(identifier);
  return remaining;
}

/**
 * Reset rate limit for identifier (admin function)
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  // Delete all rate limit keys for this identifier
  await client.del(`qayani:${identifier}`);
}
