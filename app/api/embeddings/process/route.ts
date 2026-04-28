import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { Errors } from '../../../../lib/errors/types';
import {
  processEmbeddingQueue,
  getEmbeddingQueueStats,
  batchProcessExistingMemories,
} from '../../../../lib/ai/embeddings';

/**
 * POST /api/embeddings/process
 * Process pending embeddings in the queue
 * This can be called manually or via a cron job
 */
async function processQueueHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 10;

    // Process queue
    const results = await processEmbeddingQueue(limit);

    // Get updated stats
    const stats = await getEmbeddingQueueStats(userId);

    return successResponse({
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      queueStats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing embedding queue:', error);
    throw Errors.internalServer('process embedding queue', error);
  }
}

/**
 * GET /api/embeddings/process/stats
 * Get embedding queue statistics
 */
async function getStatsHandler(request: NextRequest, userId: string) {
  try {
    const stats = await getEmbeddingQueueStats(userId);

    return successResponse({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw Errors.internalServer('get queue stats', error);
  }
}

/**
 * POST /api/embeddings/process/batch
 * Batch process all existing memories for a user (one-time migration)
 */
async function batchProcessHandler(request: NextRequest, userId: string) {
  try {
    // This is a potentially long-running operation
    // In production, this should be an async job
    await batchProcessExistingMemories(userId);

    const stats = await getEmbeddingQueueStats(userId);

    return successResponse({
      message: 'Batch processing initiated',
      queueStats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw Errors.internalServer('batch process embeddings', error);
  }
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string) => {
    const { pathname } = new URL(request.url);

    if (pathname.endsWith('/batch')) {
      return batchProcessHandler(request, userId);
    } else {
      return processQueueHandler(request, userId);
    }
  }),
  { requests: 10, window: '1 m' }
);

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getStatsHandler),
  { requests: 60, window: '1 m' }
);
