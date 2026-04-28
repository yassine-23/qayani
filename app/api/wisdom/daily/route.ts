import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { Errors } from '../../../../lib/errors/types';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

/**
 * GET /api/wisdom/daily
 * Get the "wisdom of the day" - deterministic daily wisdom highlight
 */
async function getDailyWisdomHandler(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Call database function for daily wisdom
    const { data, error } = await supabaseAdmin.rpc('get_daily_wisdom', {
      p_user_id: userId,
      p_date: date,
    });

    if (error) {
      console.error('Error getting daily wisdom:', error);
      throw Errors.database('get daily wisdom', error);
    }

    const wisdom = data && data.length > 0 ? data[0] : null;

    return successResponse({
      dailyWisdom: wisdom,
      date,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in daily wisdom handler:', error);
    throw Errors.internalServer('get daily wisdom', error);
  }
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getDailyWisdomHandler),
  { requests: 100, window: '1 m' }
);
