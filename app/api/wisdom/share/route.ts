import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { z } from 'zod';

// Validation schema
const shareWisdomSchema = z.object({
  wisdomId: z.string().uuid(),
  shareType: z.enum(['family', 'public', 'private', 'specific_user']),
  sharedWith: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * POST /api/wisdom/share
 * Share a wisdom highlight with family or specific users
 */
async function shareWisdomHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(shareWisdomSchema, body);

    const { wisdomId, shareType, sharedWith, message, expiresAt } = validatedData;

    // Verify wisdom belongs to user
    const { data: wisdom, error: wisdomError } = await supabaseAdmin
      .from('wisdom_highlights')
      .select('id')
      .eq('id', wisdomId)
      .eq('user_id', userId)
      .single();

    if (wisdomError || !wisdom) {
      throw Errors.notFound('Wisdom highlight not found');
    }

    // Create share
    const { data: share, error: shareError } = await supabaseAdmin
      .from('wisdom_shares')
      .insert({
        wisdom_id: wisdomId,
        shared_by: userId,
        shared_with: sharedWith || null,
        share_type: shareType,
        message: message || null,
        expires_at: expiresAt || null,
        shared_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shareError) {
      throw Errors.database('create wisdom share', shareError);
    }

    return successResponse({
      share,
      message: 'Wisdom shared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sharing wisdom:', error);
    throw Errors.internalServer('share wisdom', error);
  }
}

/**
 * GET /api/wisdom/share
 * Get wisdom shares (created by user or shared with user)
 */
async function getSharesHandler(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'created' or 'received'

    let query = supabaseAdmin
      .from('wisdom_shares')
      .select(`
        *,
        wisdom:wisdom_highlights(*)
      `)
      .order('shared_at', { ascending: false });

    if (type === 'created') {
      query = query.eq('shared_by', userId);
    } else if (type === 'received') {
      query = query.or(`shared_with.eq.${userId},share_type.in.(family,public)`);
    } else {
      // Get both
      query = query.or(`shared_by.eq.${userId},shared_with.eq.${userId},share_type.in.(family,public)`);
    }

    const { data: shares, error } = await query;

    if (error) {
      throw Errors.database('get wisdom shares', error);
    }

    return successResponse({
      shares: shares || [],
      count: shares?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting shares:', error);
    throw Errors.internalServer('get shares', error);
  }
}

/**
 * DELETE /api/wisdom/share/:shareId
 * Delete a wisdom share
 */
async function deleteShareHandler(
  request: NextRequest,
  userId: string,
  shareId: string
) {
  try {
    const { error } = await supabaseAdmin
      .from('wisdom_shares')
      .delete()
      .eq('id', shareId)
      .eq('shared_by', userId); // Only allow deletion by creator

    if (error) {
      throw Errors.database('delete wisdom share', error);
    }

    return successResponse({
      message: 'Share deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting share:', error);
    throw Errors.internalServer('delete share', error);
  }
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(shareWisdomHandler),
  { requests: 30, window: '1 m' }
);

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getSharesHandler),
  { requests: 60, window: '1 m' }
);
