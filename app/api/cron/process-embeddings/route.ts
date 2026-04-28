/**
 * Cron Job: Process Embedding Queue
 *
 * This endpoint should be called periodically (e.g., every 5 minutes)
 * by a cron service (Vercel Cron, AWS EventBridge, etc.)
 *
 * Example Vercel cron config in vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEmbeddingQueue, getEmbeddingQueueStats } from '../../../../lib/ai/embeddings';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Processing embedding queue...');

    // Process up to 50 items per run
    const results = await processEmbeddingQueue(50);

    const stats = await getEmbeddingQueueStats();

    const response = {
      success: true,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      queueStats: stats,
      timestamp: new Date().toISOString(),
    };

    console.log('[CRON] Embedding queue processed:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[CRON] Error processing embedding queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export const POST = GET;
