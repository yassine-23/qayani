import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';
import {
  searchMemories,
  searchConversations,
  searchAllContent,
  getRelevantContext,
} from '../../../../lib/ai/embeddings';
import { z } from 'zod';

// Validation schema
const semanticSearchSchema = z.object({
  query: z.string().min(1).max(500),
  searchType: z.enum(['memories', 'conversations', 'all']).default('all'),
  matchThreshold: z.number().min(0).max(1).default(0.7),
  matchCount: z.number().int().min(1).max(50).default(10),
});

/**
 * POST /api/search/semantic
 * Perform semantic search across memories and conversations
 */
async function semanticSearchHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(semanticSearchSchema, body);

    const { query, searchType, matchThreshold, matchCount } = validatedData;

    let results;
    let searchDetails;

    switch (searchType) {
      case 'memories':
        results = await searchMemories(userId, query, {
          matchThreshold,
          matchCount,
        });
        searchDetails = {
          type: 'memories',
          resultCount: results.length,
        };
        break;

      case 'conversations':
        results = await searchConversations(userId, query, {
          matchThreshold,
          matchCount,
        });
        searchDetails = {
          type: 'conversations',
          resultCount: results.length,
        };
        break;

      case 'all':
      default:
        results = await searchAllContent(userId, query, {
          matchThreshold,
          matchCount,
        });
        searchDetails = {
          type: 'all',
          resultCount: results.length,
          memoryCount: results.filter((r) => r.contentType === 'memory').length,
          conversationCount: results.filter((r) => r.contentType === 'conversation').length,
        };
        break;
    }

    return successResponse({
      query,
      results,
      searchDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    throw Errors.internalServer('semantic search', error);
  }
}

/**
 * GET /api/search/semantic/context?query=xxx
 * Get relevant context for RAG
 */
async function getContextHandler(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const maxResults = parseInt(searchParams.get('maxResults') || '5');

    if (!query) {
      throw Errors.badRequest('Query parameter is required');
    }

    const context = await getRelevantContext(userId, query, maxResults);

    return successResponse({
      query,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get context error:', error);
    throw Errors.internalServer('get context', error);
  }
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(semanticSearchHandler),
  { requests: 30, window: '1 m' }
);

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getContextHandler),
  { requests: 60, window: '1 m' }
);
