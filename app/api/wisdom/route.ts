import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest } from '../../../lib/validation/schemas';
import { Errors } from '../../../lib/errors/types';
import {
  getUserWisdomHighlights,
  getWisdomByCategory,
  getTopWisdom,
  searchWisdom,
  getWisdomStats,
  processMemoryForWisdom,
  batchExtractWisdomFromMemories,
} from '../../../lib/ai/wisdom-extraction';
import { z } from 'zod';

// Validation schemas
const getWisdomSchema = z.object({
  category: z.string().optional(),
  minImportance: z.number().int().min(1).max(10).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['importance', 'date']).optional(),
});

const extractWisdomSchema = z.object({
  memoryId: z.string().uuid(),
  content: z.string().min(50).max(10000),
});

/**
 * GET /api/wisdom
 * Get wisdom highlights for the user
 */
async function getWisdomHandler(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const minImportance = searchParams.get('minImportance')
      ? parseInt(searchParams.get('minImportance')!)
      : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const sortBy = (searchParams.get('sortBy') as 'importance' | 'date') || undefined;
    const groupBy = searchParams.get('groupBy'); // 'category' or undefined
    const top = searchParams.get('top'); // Get top wisdom
    const search = searchParams.get('search'); // Search query

    let results;
    let metadata = {};

    if (top) {
      // Get top wisdom
      const count = parseInt(top) || 10;
      results = await getTopWisdom(userId, count);
      metadata = { type: 'top', count: results.length };
    } else if (search) {
      // Search wisdom
      results = await searchWisdom(userId, search);
      metadata = { type: 'search', query: search, count: results.length };
    } else if (groupBy === 'category') {
      // Get wisdom grouped by category
      results = await getWisdomByCategory(userId);
      metadata = { type: 'grouped', groupBy: 'category' };
    } else {
      // Get filtered wisdom
      results = await getUserWisdomHighlights(userId, {
        category,
        minImportance,
        limit,
        sortBy,
      });
      metadata = { type: 'filtered', count: results.length };
    }

    // Get stats
    const stats = await getWisdomStats(userId);

    return successResponse({
      wisdom: results,
      stats,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting wisdom:', error);
    throw Errors.internalServer('get wisdom', error);
  }
}

/**
 * POST /api/wisdom/extract
 * Extract wisdom from a memory or conversation
 */
async function extractWisdomHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(extractWisdomSchema, body);

    const { memoryId, content } = validatedData;

    // Extract wisdom
    const count = await processMemoryForWisdom(userId, memoryId, content);

    // Get updated stats
    const stats = await getWisdomStats(userId);

    return successResponse({
      extracted: count,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error extracting wisdom:', error);
    throw Errors.internalServer('extract wisdom', error);
  }
}

/**
 * POST /api/wisdom/batch-extract
 * Batch extract wisdom from all memories
 */
async function batchExtractHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50;

    const result = await batchExtractWisdomFromMemories(userId, limit);

    const stats = await getWisdomStats(userId);

    return successResponse({
      ...result,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error batch extracting wisdom:', error);
    throw Errors.internalServer('batch extract wisdom', error);
  }
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getWisdomHandler),
  { requests: 60, window: '1 m' }
);

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string) => {
    const { pathname } = new URL(request.url);

    if (pathname.endsWith('/extract')) {
      return extractWisdomHandler(request, userId);
    } else if (pathname.endsWith('/batch-extract')) {
      return batchExtractHandler(request, userId);
    } else {
      throw Errors.badRequest('Invalid endpoint');
    }
  }),
  { requests: 20, window: '1 m' }
);
