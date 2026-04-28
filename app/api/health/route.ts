import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { successResponse } from '../../../lib/errors/handler';

export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database connection
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    health.services.database = error ? 'unhealthy' : 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
  }

  // Check Redis (rate limiting)
  try {
    const redis = process.env.UPSTASH_REDIS_REST_URL;
    health.services.redis = redis ? 'configured' : 'not-configured';
  } catch (error) {
    health.services.redis = 'error';
  }

  const isHealthy =
    health.services.database === 'healthy';

  if (!isHealthy) {
    health.status = 'degraded';
  }

  return successResponse(health, isHealthy ? 200 : 503);
}
