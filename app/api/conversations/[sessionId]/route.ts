import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { deleteConversationSession, exportConversation } from '../../../../lib/ai/conversation-memory';
import { Errors } from '../../../../lib/errors/types';

/**
 * DELETE /api/conversations/[sessionId]
 * Delete a specific conversation session
 */
async function deleteSessionHandler(
  request: NextRequest,
  userId: string,
  params: { sessionId: string }
) {
  const { sessionId } = params;

  if (!sessionId) {
    throw Errors.badRequest('Session ID is required');
  }

  const result = await deleteConversationSession(sessionId, userId);

  if (!result.success) {
    throw Errors.database('delete conversation session', result.error);
  }

  return successResponse({
    message: 'Conversation session deleted successfully',
    sessionId,
  });
}

export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string, context: any) => {
    return deleteSessionHandler(request, userId, context.params);
  }),
  { requests: 20, window: '1 m' }
);

/**
 * GET /api/conversations/[sessionId]?export=true
 * Export conversation as JSON
 */
export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string, context: any) => {
    const { sessionId } = context.params;
    const { searchParams } = new URL(request.url);
    const shouldExport = searchParams.get('export') === 'true';

    if (!sessionId) {
      throw Errors.badRequest('Session ID is required');
    }

    if (shouldExport) {
      const exportData = await exportConversation(sessionId, userId);

      if (!exportData) {
        throw Errors.notFound('Conversation session not found');
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="conversation-${sessionId}.json"`,
        },
      });
    }

    throw Errors.badRequest('Invalid request');
  }),
  { requests: 20, window: '1 m' }
);
