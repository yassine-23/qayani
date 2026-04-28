import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { getUserConversationSessions, getConversationSummary } from '../../../../lib/ai/conversation-memory';
import { Errors } from '../../../../lib/errors/types';

/**
 * GET /api/conversations/sessions
 * Retrieve all conversation sessions for the authenticated user
 */
async function getSessionsHandler(request: NextRequest, userId: string) {
  try {
    const sessions = await getUserConversationSessions(userId);

    return successResponse({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error retrieving conversation sessions:', error);
    throw Errors.database('retrieve conversation sessions', error);
  }
}

/**
 * GET /api/conversations/sessions?sessionId=xxx
 * Get details for a specific session
 */
export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string) => {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Get specific session details
      const summary = await getConversationSummary(sessionId, userId);

      if (!summary) {
        throw Errors.notFound('Conversation session not found');
      }

      return successResponse(summary);
    } else {
      // Get all sessions
      return getSessionsHandler(request, userId);
    }
  }),
  { requests: 30, window: '1 m' }
);
