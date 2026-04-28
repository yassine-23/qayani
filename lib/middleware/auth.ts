/**
 * QAYANI Authentication Middleware
 * Handles JWT token validation and user authentication
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../supabase/admin';
import { Errors } from '../errors/types';

/**
 * Extract and validate authentication token from request
 * Throws error if authentication fails
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw Errors.unauthorized('Authorization header required');
  }

  // Support both "Bearer TOKEN" and "TOKEN" formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (!token || token.trim() === '') {
    throw Errors.unauthorized('Invalid authorization header format');
  }

  try {
    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      throw Errors.invalidToken(error.message);
    }

    if (!data.user) {
      throw Errors.invalidToken('User not found');
    }

    // Return user ID
    return data.user.id;
  } catch (error) {
    // If it's already an API error, rethrow it
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    // Otherwise, wrap in invalid token error
    throw Errors.invalidToken('Token verification failed');
  }
}

/**
 * Optional authentication - returns user ID if authenticated, null otherwise
 * Does not throw errors
 */
export async function optionalAuth(request: NextRequest): Promise<string | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}

/**
 * Get user ID from request or throw error
 * Alias for requireAuth for clarity
 */
export async function getUserId(request: NextRequest): Promise<string> {
  return requireAuth(request);
}

/**
 * Check if user has specific permission
 * For future role-based access control (RBAC)
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<string> {
  const userId = await requireAuth(request);

  // TODO: Implement permission checking
  // For now, all authenticated users have all permissions
  // In future, check user role and permissions from database

  return userId;
}

/**
 * Check if user owns a resource
 * Prevents users from accessing other users' data
 */
export async function requireOwnership(
  request: NextRequest,
  resourceUserId: string
): Promise<string> {
  const userId = await requireAuth(request);

  if (userId !== resourceUserId) {
    throw Errors.forbidden('You do not own this resource');
  }

  return userId;
}

/**
 * Verify user's subscription tier meets requirement
 */
export async function requireSubscriptionTier(
  request: NextRequest,
  requiredTier: 'free' | 'premium' | 'family'
): Promise<string> {
  const userId = await requireAuth(request);

  // Get user subscription from database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw Errors.internal(error, 'Failed to fetch user subscription');
  }

  // Check if subscription is active
  if (user.subscription_status !== 'active' && user.subscription_status !== 'trialing') {
    throw Errors.forbidden('Your subscription is not active');
  }

  // Define tier hierarchy
  const tierHierarchy = { free: 0, premium: 1, family: 2 };
  const userTierLevel = tierHierarchy[user.subscription_tier as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (userTierLevel < requiredTierLevel) {
    throw Errors.forbidden(`This feature requires ${requiredTier} subscription`);
  }

  return userId;
}

/**
 * Get authenticated user's full data
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const userId = await requireAuth(request);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw Errors.notFound('User');
  }

  return user;
}
